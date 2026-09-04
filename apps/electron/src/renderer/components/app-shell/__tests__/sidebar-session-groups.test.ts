import { describe, expect, test } from 'bun:test'
import type { SessionMeta } from '@/atoms/sessions'
import {
  getUnprojectedActiveSessions,
  groupActiveProjectSessions,
} from '../sidebar-session-groups'

const meta = (overrides: Partial<SessionMeta> & Pick<SessionMeta, 'id'>): SessionMeta => ({
  workspaceId: 'workspace-1',
  ...overrides,
})

describe('sidebar session groups', () => {
  test('All Sessions includes only active conversations without a project', () => {
    const sessions = [
      meta({ id: 'unprojected' }),
      meta({ id: 'projected', projectId: 'project-1' }),
      meta({ id: 'archived', isArchived: true }),
      meta({ id: 'archived-project', isArchived: true, projectId: 'project-1' }),
    ]

    expect(getUnprojectedActiveSessions(sessions).map((session) => session.id)).toEqual([
      'unprojected',
    ])
  })

  test('project groups omit archived conversations and sort by recent activity', () => {
    const groups = groupActiveProjectSessions([
      meta({ id: 'older', projectId: 'project-1', lastMessageAt: 10 }),
      meta({ id: 'newer', projectId: 'project-1', lastMessageAt: 30 }),
      meta({ id: 'other', projectId: 'project-2', createdAt: 20 }),
      meta({ id: 'archived', projectId: 'project-1', isArchived: true, lastMessageAt: 40 }),
      meta({ id: 'unprojected', lastMessageAt: 50 }),
    ])

    expect(groups.get('project-1')?.map((session) => session.id)).toEqual(['newer', 'older'])
    expect(groups.get('project-2')?.map((session) => session.id)).toEqual(['other'])
  })
})
