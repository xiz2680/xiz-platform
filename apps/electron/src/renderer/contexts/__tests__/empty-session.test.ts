import { describe, expect, it } from 'bun:test'
import type { SessionMeta } from '../../atoms/sessions'
import { shouldDiscardEmptySession } from '../empty-session'

const empty = { id: 'new', messageCount: 0 } as SessionMeta

describe('empty conversation cleanup', () => {
  it('discards an untouched conversation, including whitespace-only drafts', () => {
    expect(shouldDiscardEmptySession(empty)).toBe(true)
    expect(shouldDiscardEmptySession(empty, '  \n')).toBe(true)
  })
  it('preserves text and attachment-only drafts', () => {
    expect(shouldDiscardEmptySession(empty, 'Do this')).toBe(false)
    expect(shouldDiscardEmptySession(empty, '', 1)).toBe(false)
  })
  it('preserves sent user messages even before a title or response arrives', () => {
    expect(shouldDiscardEmptySession({ ...empty, messageCount: 1 })).toBe(false)
    expect(shouldDiscardEmptySession({ ...empty, isProcessing: true })).toBe(false)
    expect(shouldDiscardEmptySession({ ...empty, isAsyncOperationOngoing: true })).toBe(false)
  })
  it('does not delete unknown, named, or completed conversations', () => {
    expect(shouldDiscardEmptySession(undefined)).toBe(false)
    expect(shouldDiscardEmptySession({ ...empty, name: 'Saved' })).toBe(false)
    expect(shouldDiscardEmptySession({ ...empty, lastFinalMessageId: 'reply' })).toBe(false)
  })
})
