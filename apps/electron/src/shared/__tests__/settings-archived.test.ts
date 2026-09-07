import { describe, expect, test } from 'bun:test'
import { SETTINGS_ITEMS } from '../menu-schema'
import { SETTINGS_PAGES, isValidSettingsSubpage } from '../settings-registry'
import { parseRouteToNavigationState } from '../route-parser'
import { routes } from '../routes'

describe('archived settings integration', () => {
  test('is a canonical settings page following preferences', () => {
    expect(isValidSettingsSubpage('archived')).toBe(true)
    expect(SETTINGS_PAGES.slice(-2).map(page => page.id)).toEqual(['preferences', 'archived'])
  })

  test('is included once in shared desktop and compact settings menus', () => {
    expect(SETTINGS_ITEMS.filter(item => item.id === 'archived')).toEqual([
      { id: 'archived', labelKey: 'sidebar.archived', descriptionKey: 'session.noArchivedSessionsDesc', icon: 'Archive' },
    ])
  })

  test('opens a settings detail page instead of the removed session navigator', () => {
    expect(parseRouteToNavigationState(routes.view.settings('archived'))).toMatchObject({
      navigator: 'settings', subpage: 'archived',
    })
  })
})
