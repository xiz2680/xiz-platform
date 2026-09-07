import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

describe('workspace config directory isolation', () => {
  test('uses CRAFT_CONFIG_DIR for the default workspace root', () => {
    const isolatedConfigDir = '/tmp/xiz-platform-config-isolation'
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        '-e',
        "import { getDefaultWorkspacesDir } from './packages/shared/src/workspaces/storage.ts'; process.stdout.write(getDefaultWorkspacesDir())",
      ],
      cwd: join(import.meta.dir, '../../../../..'),
      env: { ...process.env, CRAFT_CONFIG_DIR: isolatedConfigDir },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout.toString()).toBe(join(isolatedConfigDir, 'workspaces'))
  })
})
