import type { SessionMeta } from '@/atoms/sessions'

/** Conversations shown by the top-level All Sessions destination. */
export function getUnprojectedActiveSessions(metas: SessionMeta[]): SessionMeta[] {
  return metas.filter((meta) => !meta.isArchived && !meta.projectId)
}

/** Active project conversations, grouped and ordered for direct sidebar navigation. */
export function groupActiveProjectSessions(metas: SessionMeta[]): Map<string, SessionMeta[]> {
  const grouped = new Map<string, SessionMeta[]>()

  for (const meta of metas) {
    if (meta.isArchived || !meta.projectId) continue
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
