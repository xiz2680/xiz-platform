import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const windowManagerSource = readFileSync(
  fileURLToPath(new URL('../window-manager.ts', import.meta.url)),
  'utf8',
)

describe('window context-menu ownership', () => {
  it('does not replace renderer context menus with a development debug menu', () => {
    expect(windowManagerSource).not.toContain("webContents.on('context-menu'")
    expect(windowManagerSource).not.toContain('Inspect Element')
    expect(windowManagerSource).not.toContain('Menu.buildFromTemplate')
  })
})
