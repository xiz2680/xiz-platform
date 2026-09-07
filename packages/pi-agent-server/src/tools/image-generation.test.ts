import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImageGenerationTool, generatedImageExtension, readGeneratedImage, type ImageGenerationContext } from './image-generation.ts';

const nativeFetch = globalThis.fetch;
const dirs: string[] = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const token = `header.${Buffer.from(JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: 'test-account' } })).toString('base64url')}.signature`;
const image = { type: 'image_generation_call', id: 'img1', status: 'completed', result: png.toString('base64') };
const stream = (events: object[]) => new Response(new TextEncoder().encode(events.map(e => `data: ${JSON.stringify(e)}\r\n\r\n`).join('')));
const good = () => stream([{ type: 'response.output_item.done', item: image }, { type: 'response.completed', response: { status: 'completed', output: [] } }]);
async function context(): Promise<ImageGenerationContext> {
  const dir = await mkdtemp(join(tmpdir(), 'xiz-image-test-')); dirs.push(dir);
  return { auth: { provider: 'openai-codex', credential: { type: 'api_key', key: token } }, model: 'pi/gpt-5.6-sol', sessionPath: dir };
}
const run = (tool: ReturnType<typeof createImageGenerationTool>, signal?: AbortSignal) => tool.execute('call1', { prompt: 'A blue circle' }, signal, undefined, {} as never);
afterEach(async () => { globalThis.fetch = nativeFetch; for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true }); });

describe('ChatGPT image generation', () => {
  it('collects streamed image items even when completion has empty output', async () => {
    expect(await readGeneratedImage(good())).toEqual(png);
  });
  it('accepts a JSON response including pretty-printed bodies', async () => {
    expect(await readGeneratedImage(new Response(JSON.stringify({ status: 'completed', output: [image] }, null, 2)))).toEqual(png);
  });
  it('rejects interrupted and failed streams instead of saving partial images', async () => {
    await expect(readGeneratedImage(stream([{ type: 'response.output_item.done', item: image }]))).rejects.toThrow('no completed image');
    await expect(readGeneratedImage(stream([{ type: 'response.failed' }]))).rejects.toThrow('failed or was interrupted');
    await expect(readGeneratedImage(stream([{ type: 'response.completed', response: { output: [] } }]))).rejects.toThrow('no completed image');
  });
  it('rejects malformed base64 and unknown image formats', async () => {
    await expect(readGeneratedImage(stream([{ type: 'response.completed', response: { output: [{ ...image, result: '!!!' }] } }]))).rejects.toThrow('Invalid');
    expect(() => generatedImageExtension(Buffer.from('not an image'))).toThrow('Unsupported');
  });
  it('saves unique session-scoped images and returns reusable previews without base64', async () => {
    const ctx = await context(); const requests: any[] = [];
    globalThis.fetch = (async (_url, init) => { requests.push(JSON.parse(String(init?.body))); return good(); }) as typeof fetch;
    const tool = createImageGenerationTool(() => ctx);
    const a = await run(tool); const b = await run(tool);
    expect(requests[0].tools).toEqual([{ type: 'image_generation' }]);
    expect(requests[0].model).toBe('gpt-5.6-sol');
    const first = a.details as { filePath: string };
    expect(first.filePath).toContain('/data/generated-image-');
    expect(first.filePath).not.toBe((b.details as { filePath: string }).filePath);
    expect(await readFile(first.filePath)).toEqual(png);
    expect(JSON.stringify(a.content)).toContain('image-preview');
    expect(JSON.stringify(a)).not.toContain(png.toString('base64'));
    expect(JSON.stringify(a)).not.toContain(token);
  });
  it('uses refreshed credentials on each call', async () => {
    const ctx = await context(); const headers: any[] = [];
    globalThis.fetch = (async (_url, init) => { headers.push(init?.headers); return good(); }) as typeof fetch;
    const tool = createImageGenerationTool(() => ctx); await run(tool);
    ctx.auth!.credential = { type: 'oauth', access: token + 'new', refresh: '', expires: 0 }; await run(tool);
    expect(headers[1].Authorization).toBe(`Bearer ${token}new`);
  });
  it('does not request images for unsupported connections or canceled calls', async () => {
    const ctx = await context(); let calls = 0;
    globalThis.fetch = (async () => { calls++; return good(); }) as typeof fetch;
    const tool = createImageGenerationTool(() => ctx);
    await expect(run(tool, AbortSignal.abort())).rejects.toThrow();
    ctx.auth!.provider = 'openai';
    await expect(run(tool)).rejects.toThrow('ChatGPT login');
    expect(calls).toBe(0);
  });
  it('propagates service rejection without fallbacks or credential leakage', async () => {
    const ctx = await context(); let calls = 0;
    globalThis.fetch = (async () => { calls++; return new Response(token, { status: 403 }); }) as typeof fetch;
    await expect(run(createImageGenerationTool(() => ctx))).rejects.toThrow('HTTP 403');
    expect(calls).toBe(1);
    expect(await readdir(ctx.sessionPath)).toEqual([]);
  });
  it('refuses a data symlink outside the session', async () => {
    const ctx = await context(); const outside = await context();
    await symlink(outside.sessionPath, join(ctx.sessionPath, 'data'));
    globalThis.fetch = (async () => good()) as typeof fetch;
    await expect(run(createImageGenerationTool(() => ctx))).rejects.toThrow('outside the session');
    expect(await readdir(outside.sessionPath)).toEqual([]);
  });
});
