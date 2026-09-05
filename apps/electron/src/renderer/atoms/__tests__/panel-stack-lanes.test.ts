import { describe, it, expect } from 'bun:test'
import { createStore } from 'jotai'
import {
  panelStackAtom,
  focusedPanelIdAtom,
  pushPanelAtom,
  reconcilePanelStackAtom,
  resizePanelsAtom,
  updateFocusedPanelRouteAtom,
  type PanelStackEntry,
} from '../panel-stack'

function getStack(store: ReturnType<typeof createStore>): PanelStackEntry[] {
  return store.get(panelStackAtom)
}

describe('panel stack single-lane behavior', () => {
  it('keeps insertion order for new panels', () => {
    const store = createStore()

    store.set(pushPanelAtom, { route: 'allSessions/session/s1' })
    store.set(pushPanelAtom, { route: 'sources/source/github' })
    store.set(pushPanelAtom, { route: 'settings' })

    const stack = getStack(store)
    expect(stack).toHaveLength(3)
    expect(stack[0].route).toBe('allSessions/session/s1')
    expect(stack[1].route).toBe('sources/source/github')
    expect(stack[2].route).toBe('settings')
    expect(stack.every((p) => p.laneId === 'main')).toBe(true)
  })

  it('gives newly pushed panels a non-zero share and proportionally shrinks existing panels', () => {
    const store = createStore()

    store.set(pushPanelAtom, { route: 'allSessions/session/s1' })
    expect(getStack(store)[0].proportion).toBeCloseTo(1)

    store.set(pushPanelAtom, { route: 'allSessions/session/s2' })
    expect(getStack(store).map((panel) => panel.proportion)).toEqual([0.5, 0.5])

    store.set(resizePanelsAtom, {
      leftIndex: 0,
      rightIndex: 1,
      leftProportion: 0.75,
      rightProportion: 0.25,
    })
    store.set(pushPanelAtom, { route: 'allSessions/session/s3' })

    const proportions = getStack(store).map((panel) => panel.proportion)
    expect(proportions[0]).toBeCloseTo(0.5)
    expect(proportions[1]).toBeCloseTo(1 / 6)
    expect(proportions[2]).toBeCloseTo(1 / 3)
    expect(proportions.every((proportion) => proportion > 0)).toBe(true)
    expect(proportions.reduce((sum, proportion) => sum + proportion, 0)).toBeCloseTo(1)
  })

  it('implicit navigation updates focused panel route', () => {
    const store = createStore()

    store.set(pushPanelAtom, { route: 'allSessions/session/s1' })
    store.set(pushPanelAtom, { route: 'sources/source/github' })

    const sourcePanel = getStack(store).find((p) => p.route === 'sources/source/github')
    expect(sourcePanel).toBeDefined()
    store.set(focusedPanelIdAtom, sourcePanel!.id)

    store.set(updateFocusedPanelRouteAtom, 'allSessions/session/s2')

    const stack = getStack(store)
    expect(stack).toHaveLength(2)
    expect(stack.some((p) => p.route === 'allSessions/session/s2')).toBe(true)
    expect(stack.some((p) => p.route === 'allSessions/session/s1')).toBe(true)
  })

  it('pushPanel afterIndex inserts immediately after the given panel', () => {
    const store = createStore()

    store.set(pushPanelAtom, { route: 'allSessions/session/s1' })
    store.set(pushPanelAtom, { route: 'allSessions/session/s2' })

    store.set(pushPanelAtom, { route: 'sources/source/linear', afterIndex: 0 })

    const stack = getStack(store)
    expect(stack).toHaveLength(3)
    expect(stack[0].route).toBe('allSessions/session/s1')
    expect(stack[1].route).toBe('sources/source/linear')
    expect(stack[2].route).toBe('allSessions/session/s2')
  })

  it('reconcile focuses by focusedIndex first when duplicate routes exist', () => {
    const store = createStore()

    const changed = store.set(reconcilePanelStackAtom, {
      entries: [
        { route: 'allSessions/session/s1', proportion: 0.5 },
        { route: 'allSessions/session/s1', proportion: 0.5 },
      ],
      focusedIndex: 1,
    })

    expect(changed).toBe(true)

    const stack = getStack(store)
    expect(stack).toHaveLength(2)
    const focusedId = store.get(focusedPanelIdAtom)
    expect(focusedId).toBe(stack[1].id)
  })

  it('reconcile no-op keeps focused index target with duplicate routes', () => {
    const store = createStore()

    store.set(reconcilePanelStackAtom, {
      entries: [
        { route: 'allSessions/session/s1', proportion: 0.5 },
        { route: 'allSessions/session/s1', proportion: 0.5 },
      ],
      focusedIndex: 1,
    })

    const stack = getStack(store)
    const firstId = stack[0].id
    const secondId = stack[1].id
    expect(firstId).not.toBe(secondId)

    const changed = store.set(reconcilePanelStackAtom, {
      entries: [
        { route: 'allSessions/session/s1', proportion: 0.5 },
        { route: 'allSessions/session/s1', proportion: 0.5 },
      ],
      focusedIndex: 1,
    })

    expect(changed).toBe(false)
    expect(store.get(focusedPanelIdAtom)).toBe(secondId)
  })

  it('reconcile replaces project detail with one focused session panel', () => {
    const store = createStore()

    store.set(reconcilePanelStackAtom, {
      entries: [{ route: 'projects/project/project-one', proportion: 1 }],
      focusedIndex: 0,
    })
    const projectPanelId = getStack(store)[0].id

    const changed = store.set(reconcilePanelStackAtom, {
      entries: [{ route: 'allSessions/session/session-one', proportion: 1 }],
      focusedIndex: 0,
    })

    const stack = getStack(store)
    expect(changed).toBe(true)
    expect(stack).toHaveLength(1)
    expect(stack[0]).toMatchObject({
      id: projectPanelId,
      route: 'allSessions/session/session-one',
      proportion: 1,
      panelType: 'session',
      laneId: 'main',
    })
    expect(store.get(focusedPanelIdAtom)).toBe(projectPanelId)
  })
})
