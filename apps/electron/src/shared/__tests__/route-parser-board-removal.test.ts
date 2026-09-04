import { describe, expect, test } from 'bun:test'

import {
  isCompoundRoute,
  parseCompoundRoute,
  parseRouteToNavigationState,
} from '../route-parser'

describe('removed board route', () => {
  test('is no longer recognized as a view', () => {
    expect(isCompoundRoute('board')).toBe(false)
    expect(parseCompoundRoute('board')).toBeNull()
    expect(parseRouteToNavigationState('board')).toBeNull()
  })
})
