import * as React from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import type { BrowserPaneBounds } from '../../../shared/types'

export interface ProjectBrowserPanelProps {
  projectId: string
  sessionId?: string | null
  initialUrl?: string
  className?: string
  onClose?: () => void
  onInstanceCreated?: (instanceId: string) => void
}

export function rectToBrowserPaneBounds(
  rect: Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>,
): BrowserPaneBounds {
  return {
    x: Math.max(0, Math.round(rect.x)),
    y: Math.max(0, Math.round(rect.y)),
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  }
}

/**
 * Renderer anchor for a native Chromium browser surface embedded in the main
 * Electron window. The DOM node only supplies layout bounds; website content
 * is rendered by BrowserPaneManager, never by an iframe or webview element.
 */
export function ProjectBrowserPanel({
  projectId,
  sessionId,
  initialUrl,
  className,
  onClose,
  onInstanceCreated,
}: ProjectBrowserPanelProps) {
  const { t } = useTranslation()
  const anchorRef = React.useRef<HTMLDivElement>(null)
  // Browser lifetime is project-scoped. Keep the session that originally
  // opened it for agent-control binding without recreating on session switches.
  const ownerSessionIdRef = React.useRef(sessionId)
  const instanceIdRef = React.useRef<string | null>(null)
  const latestBoundsRef = React.useRef<BrowserPaneBounds | null>(null)
  const onCloseRef = React.useRef(onClose)
  const onInstanceCreatedRef = React.useRef(onInstanceCreated)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    onCloseRef.current = onClose
    onInstanceCreatedRef.current = onInstanceCreated
  }, [onClose, onInstanceCreated])

  React.useLayoutEffect(() => {
    const api = window.electronAPI?.browserPane
    const anchor = anchorRef.current
    if (!api || !anchor) {
      setError(t('browser.embeddedUnavailable'))
      return
    }
    setError(null)

    let disposed = false
    let frame: number | null = null

    const isOccludedByPortal = (anchorRect: DOMRect): boolean => {
      const portals = document.querySelectorAll<HTMLElement>(
        '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]',
      )
      return Array.from(portals).some((portal) => {
        const style = window.getComputedStyle(portal)
        if (style.display === 'none' || style.visibility === 'hidden') return false
        const rect = portal.getBoundingClientRect()
        return rect.width > 0
          && rect.height > 0
          && rect.right > anchorRect.left
          && rect.left < anchorRect.right
          && rect.bottom > anchorRect.top
          && rect.top < anchorRect.bottom
      })
    }

    const measure = () => {
      frame = null
      const rect = anchor.getBoundingClientRect()
      const bounds = rectToBrowserPaneBounds(rect)
      latestBoundsRef.current = bounds
      const instanceId = instanceIdRef.current
      if (instanceId) {
        const effectiveBounds = isOccludedByPortal(rect)
          ? { x: 0, y: 0, width: 0, height: 0 }
          : bounds
        void api.setEmbeddedBounds(instanceId, effectiveBounds).catch((cause) => {
          if (!disposed) console.warn('[ProjectBrowserPanel] Failed to resize browser:', cause)
        })
      }
    }

    const scheduleMeasure = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(anchor)
    const portalObserver = new MutationObserver(scheduleMeasure)
    portalObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state', 'role', 'style'],
    })
    window.addEventListener('resize', scheduleMeasure)
    window.addEventListener('scroll', scheduleMeasure, true)
    measure()

    const removeRemovedListener = api.onRemoved((removedId) => {
      if (removedId !== instanceIdRef.current) return
      instanceIdRef.current = null
      if (!disposed) onCloseRef.current?.()
    })

    void (async () => {
      let createdInstanceId: string | null = null
      try {
        // React StrictMode immediately tears down its first probe effect. Yield
        // once so that probe exits without opening a throwaway native window.
        await Promise.resolve()
        if (disposed) return

        const ownerSessionId = ownerSessionIdRef.current
        const instanceId = await api.create({
          id: `project-browser-${crypto.randomUUID()}`,
          show: false,
          ...(ownerSessionId ? { bindToSessionId: ownerSessionId } : {}),
          ...(initialUrl?.trim() ? { initialUrl: initialUrl.trim() } : {}),
        })
        createdInstanceId = instanceId
        if (disposed) {
          await api.destroy(instanceId)
          return
        }

        instanceIdRef.current = instanceId
        onInstanceCreatedRef.current?.(instanceId)
        const bounds = latestBoundsRef.current ?? rectToBrowserPaneBounds(anchor.getBoundingClientRect())
        await api.attachEmbedded(instanceId, bounds)
        if (!disposed) setError(null)
      } catch (cause) {
        console.error('[ProjectBrowserPanel] Failed to create embedded browser:', cause)
        if (createdInstanceId) {
          if (instanceIdRef.current === createdInstanceId) instanceIdRef.current = null
          try {
            await api.destroy(createdInstanceId)
          } catch {
            // It may already have been removed by a concurrent panel cleanup.
          }
        }
        if (!disposed) setError(t('browser.embeddedFailed'))
      }
    })()

    return () => {
      disposed = true
      observer.disconnect()
      portalObserver.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
      window.removeEventListener('scroll', scheduleMeasure, true)
      removeRemovedListener()
      if (frame !== null) cancelAnimationFrame(frame)
      const instanceId = instanceIdRef.current
      instanceIdRef.current = null
      if (instanceId) void api.destroy(instanceId)
    }
  }, [projectId, initialUrl, t])

  return (
    <div
      ref={anchorRef}
      data-project-browser-panel={projectId}
      data-session-id={sessionId ?? undefined}
      className={cn('relative min-h-0 min-w-0 overflow-hidden bg-background', className)}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {error}
        </div>
      )}
    </div>
  )
}
