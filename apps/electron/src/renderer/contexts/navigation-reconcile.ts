import { buildRouteFromNavigationState, parseRouteToNavigationState } from '../../shared/route-parser'
import type { ViewRoute } from '../../shared/routes'
import type { NavigationState } from '../../shared/types'

export type AutoSelectionResolver = (state: NavigationState) => NavigationState

/** Decode every proportion our URL writer emits, including collapsed panes. */
export function parsePanelEntry(entry: string): { route: ViewRoute; proportion: number } {
  const colon = entry.lastIndexOf(':')
  if (colon > 0) {
    const suffix = entry.slice(colon + 1)
    const proportion = Number(suffix)
    if (suffix && Number.isFinite(proportion) && proportion >= 0 && proportion <= 1) {
      return { route: entry.slice(0, colon) as ViewRoute, proportion }
    }
  }
  return { route: entry as ViewRoute, proportion: 0 }
}

/**
 * Normalize a panel route during URL reconciliation.
 *
 * Ensures filter-only routes (e.g. `allSessions`) can be upgraded to
 * canonical detail routes (e.g. `allSessions/session/{id}`) via the same
 * auto-selection policy used by normal navigation.
 */
export function normalizePanelRouteForReconcile(
  route: ViewRoute,
  resolveAutoSelection: AutoSelectionResolver,
): ViewRoute {
  const navState = parseRouteToNavigationState(route)
  if (!navState) return route

  // Preserve explicit detail routes exactly as encoded in URL.
  // Reconciliation should only auto-select for filter/list routes.
  if ('details' in navState && navState.details) {
    return route
  }

  const resolved = resolveAutoSelection(navState)
  return buildRouteFromNavigationState(resolved) as ViewRoute
}
