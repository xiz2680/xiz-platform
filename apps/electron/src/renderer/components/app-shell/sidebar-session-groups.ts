import type { SessionMeta } from '@/atoms/sessions'

/** Draft-only conversations stay out of navigation until the first interaction. */
export function hasSessionInteraction(meta: SessionMeta): boolean {
  return (meta.messageCount ?? 0) > 0 || !!meta.lastFinalMessageId
}

/** Conversations shown by the top-level All Sessions destination. */
export function getUnprojectedActiveSessions(metas: SessionMeta[]): SessionMeta[] {
  return metas
    .filter((meta) => !meta.isArchived && !meta.projectId && hasSessionInteraction(meta))
    .sort((a, b) => (b.lastMessageAt ?? b.createdAt ?? 0) - (a.lastMessageAt ?? a.createdAt ?? 0))
}

/** Active project conversations, grouped and ordered for direct sidebar navigation. */
export function groupActiveProjectSessions(metas: SessionMeta[]): Map<string, SessionMeta[]> {
  const grouped = new Map<string, SessionMeta[]>()

  for (const meta of metas) {
    if (meta.isArchived || !meta.projectId || !hasSessionInteraction(meta)) continue
    const sessions = grouped.get(meta.projectId) ?? []
    sessions.push(meta)
    grouped.set(meta.projectId, sessions)
  }

  for (const sessions of grouped.values()) {
    sessions.sort(
      (a, b) => (b.lastMessageAt ?? b.createdAt ?? 0) - (a.lastMessageAt ?? a.createdAt ?? 0),
    )
  }

  return grouped
}
