import type { SessionMeta } from '../atoms/sessions'

/** Only discard a conversation when we know it contains no user work. */
export function shouldDiscardEmptySession(
  meta: SessionMeta | undefined,
  draft = '',
  attachmentCount = 0,
): boolean {
  return !!meta && meta.messageCount === 0 && !meta.lastFinalMessageId &&
    !meta.name && !meta.isProcessing && !meta.isAsyncOperationOngoing &&
    !draft.trim() && attachmentCount === 0
}
