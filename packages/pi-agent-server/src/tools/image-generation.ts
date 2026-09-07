import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@earendil-works/pi-coding-agent';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import { join, relative, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getOpenAiCodexAccessToken, type SearchProviderAuthConfig } from './search/resolve-provider.ts';
import { extractChatGptAccountId } from './search/providers/chatgpt.ts';
import { stripPiPrefix } from '../custom-endpoint-models.ts';

const schema = Type.Object({
  prompt: Type.String({ minLength: 1, maxLength: 12000, description: 'Describe the image to generate, including subject, style and composition. Generate one image per call.' }),
});
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export interface ImageGenerationContext {
  auth?: SearchProviderAuthConfig;
  model: string;
  sessionPath: string;
}

/** Consume item events as well as terminal snapshots: Codex can finish with output: []. */
export async function readGeneratedImage(response: Response): Promise<Buffer> {
  if (!response.body) throw new Error('Image generation returned no response body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let bytes = 0;
  let completed = false;
  let image: string | undefined;
  const accept = (item: any) => {
    if (item?.type === 'image_generation_call' && typeof item.result === 'string' && item.result) image = item.result;
  };
  const handle = (event: any) => {
    if (event.type === 'error' || event.type === 'response.failed' || event.type === 'response.incomplete') {
      throw new Error('Image generation failed or was interrupted by the service. No image was saved.');
    }
    if (event.type === 'response.output_item.done') accept(event.item);
    if (event.type === 'response.completed' || event.type === 'response.done') {
      if (event.response?.status && event.response.status !== 'completed') throw new Error('Image generation did not complete');
      completed = true;
      for (const item of event.response?.output ?? []) accept(item);
    }
  };
  const line = (value: string) => {
    if (!value.startsWith('data:')) return;
    const data = value.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let event: unknown;
    try { event = JSON.parse(data); } catch { throw new Error('Invalid image generation stream'); }
    handle(event);
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error('Image generation response exceeds the size limit');
      pending += decoder.decode(chunk.value, { stream: true });
      let end: number;
      while (!pending.trimStart().startsWith('{') && (end = pending.indexOf('\n')) >= 0) {
        line(pending.slice(0, end).trim());
        pending = pending.slice(end + 1);
      }
    }
    pending += decoder.decode();
    if (pending.trim().startsWith('{')) {
      const data = JSON.parse(pending);
      handle({ type: 'response.completed', response: data });
    } else if (pending.trim()) line(pending.trim());
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (!completed || !image) throw new Error('Image generation returned no completed image. No image was saved.');
  if (image.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error('Invalid or oversized generated image');
  const buffer = Buffer.from(image, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new Error('Invalid or oversized generated image');
  return buffer;
}

export function generatedImageExtension(buffer: Buffer): string {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  throw new Error('Unsupported generated image format');
}

export function createImageGenerationTool(getContext: () => ImageGenerationContext | null): ToolDefinition<typeof schema> {
  return {
    name: 'generate_image',
    label: 'Generate Image',
    description: 'Generate an image from a text description using the current ChatGPT login. Saves a new image in this session data folder and returns an image-preview block. Uses account quota. No API key fallback. Does not edit existing images.',
    promptSnippet: 'Use generate_image when the user asks to create an AI image. Include the returned image-preview block in your reply so the user can see and open the generated file.',
    parameters: schema,
    async execute(_id, params, signal) {
      const context = getContext();
      const token = getOpenAiCodexAccessToken(context?.auth);
      const account = token ? extractChatGptAccountId(token) : null;
      if (!context || !token || !account) throw new Error('Image generation requires a valid ChatGPT login connection. No API key fallback is used.');
      if (!params.prompt.trim() || params.prompt.length > 12000) throw new Error('Image prompt must contain 1–12000 characters');
      const timeout = AbortSignal.timeout(180000);
      const combinedSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
      combinedSignal.throwIfAborted();
      const response = await fetch('https://chatgpt.com/backend-api/codex/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'chatgpt-account-id': account, 'OpenAI-Beta': 'responses=experimental' },
        body: JSON.stringify({ model: stripPiPrefix(context.model), store: false, stream: true,
          instructions: 'Generate the requested image using the image generation tool. Generate exactly one image.',
          tools: [{ type: 'image_generation' }], tool_choice: 'auto',
          input: [{ role: 'user', content: [{ type: 'input_text', text: params.prompt }] }],
        }),
        signal: combinedSignal,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`ChatGPT image generation failed (HTTP ${response.status}). Check connection access or quota; no fallback was attempted.`);
      }
      const buffer = await readGeneratedImage(response);
      combinedSignal.throwIfAborted();
      const ext = generatedImageExtension(buffer);
      const sessionRoot = await realpath(context.sessionPath);
      const dataDir = join(sessionRoot, 'data');
      await mkdir(dataDir, { recursive: true });
      const resolvedData = await realpath(dataDir);
      const rel = relative(sessionRoot, resolvedData);
      if (isAbsolute(rel) || rel === '..' || rel.startsWith('../')) throw new Error('Session data folder points outside the session');
      const filePath = join(resolvedData, `generated-image-${randomUUID()}.${ext}`);
      await writeFile(filePath, buffer, { flag: 'wx', signal: combinedSignal });
      const preview = '```image-preview\n' + JSON.stringify({ src: filePath, title: 'Generated image' }) + '\n```';
      return { content: [{ type: 'text', text: `Image generated and saved to: ${filePath}\n\nInclude this preview block in your reply:\n${preview}` }], details: { filePath, mimeType: `image/${ext === 'jpg' ? 'jpeg' : ext}` } };
    },
  };
}
