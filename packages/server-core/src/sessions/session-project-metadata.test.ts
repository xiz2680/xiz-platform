import { describe, expect, it } from 'bun:test'
import { SessionManager, createManagedSession } from './SessionManager.ts'

describe('session project metadata response', () => {
  it('preserves projectId and workingDirectory in the renderer Session', async () => {
    const sessionManager = new SessionManager()
    const workspace = {
      id: 'ws-project-response',
      name: 'Project response workspace',
      rootPath: '/tmp/xiz-project-response',
      createdAt: Date.now(),
    }
    const managed = createManagedSession(
      {
        id: 'session-project-response',
        projectId: 'project-1',
        workingDirectory: '/tmp/project-1',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
      },
      workspace as never,
      { messagesLoaded: true },
    )

    ;(sessionManager as unknown as { sessions: Map<string, unknown> }).sessions.set(
      managed.id,
      managed,
    )

    const session = await sessionManager.getSession(managed.id)

    expect(session?.projectId).toBe('project-1')
    expect(session?.workingDirectory).toBe('/tmp/project-1')
  })
})
