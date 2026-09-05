import { describe, expect, it } from 'bun:test'
import { rectToBrowserPaneBounds } from '../ProjectBrowserPanel'

describe('rectToBrowserPaneBounds', () => {
  it('rounds DOM coordinates for Electron native view bounds', () => {
    expect(rectToBrowserPaneBounds({ x: 420.4, y: 72.6, width: 639.7, height: 811.2 })).toEqual({
      x: 420,
      y: 73,
      width: 640,
      height: 811,
    })
  })

  it('does not pass negative dimensions or origins to the main process', () => {
    expect(rectToBrowserPaneBounds({ x: -10, y: -20, width: -30, height: -40 })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    })
  })
})
