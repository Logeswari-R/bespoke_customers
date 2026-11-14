/**
 * Scroll Restoration and Browser History Manager for Bespoke Ecommerce
 *
 * Provides:
 * - Route-specific scroll position caching in sessionStorage & history.state
 * - Differentiation between New (Push) navigation and Back/Forward (Pop) navigation
 * - Layout-aware scroll restoration that waits for dynamic content/API to render
 * - Automatic restoration after browser refresh (F5 / Reload)
 * - Coordinated scroll clearing for fresh intentional navigations
 */

const STORAGE_PREFIX = 'bespoke_scroll:'
const MAX_RESTORE_ATTEMPTS = 60 // ~1.5 - 2 seconds over requestAnimationFrame

const requestFrame = (cb) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(cb)
  }
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb)
  }
  return setTimeout(cb, 16)
}

const cancelFrame = (id) => {
  if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(id)
  } else if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

let isInitialized = false
let currentRouteKey = ''
let activeRestoration = null
let pendingRestoreY = null
let isPopNavigation = false

/**
 * Generate unique route key for a URL (pathname + search)
 */
export function getRouteKey(pathname = window.location.pathname, search = window.location.search) {
  const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/'
  return `${cleanPath}${search || ''}`
}

/**
 * Retrieve saved scroll position from sessionStorage or history.state
 */
export function getSavedScrollPosition(routeKey = getRouteKey()) {
  if (typeof window === 'undefined') return null

  // 1. Try history.state first if it matches current entry
  if (window.history.state && typeof window.history.state.scrollY === 'number') {
    if (window.history.state.routeKey === routeKey) {
      return {
        x: window.history.state.scrollX || 0,
        y: window.history.state.scrollY,
      }
    }
  }

  // 2. Try sessionStorage
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${routeKey}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed?.y === 'number') {
        return parsed
      }
    }
  } catch (_) {}

  return null
}

/**
 * Commit current scroll position to sessionStorage and history.state
 */
export function saveCurrentScrollPosition(routeKey = getRouteKey()) {
  if (typeof window === 'undefined') return

  const y = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0)
  const x = Math.max(0, window.scrollX || document.documentElement.scrollLeft || 0)

  // Save to sessionStorage
  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${routeKey}`,
      JSON.stringify({ x, y, timestamp: Date.now() })
    )
  } catch (_) {}

  // Update current history entry with scroll position without adding a new entry
  if (window.history && window.history.replaceState && window.history.state) {
    try {
      window.history.replaceState(
        {
          ...window.history.state,
          routeKey,
          scrollX: x,
          scrollY: y,
        },
        '',
        window.location.href
      )
    } catch (_) {}
  }
}

/**
 * Layout-aware scroll restoration
 * Uses requestAnimationFrame and document height inspection
 * to ensure we don't attempt to scroll before the DOM has rendered to the target height.
 */
export function attemptScrollRestoration(targetY, targetX = 0, onComplete) {
  if (typeof window === 'undefined') return

  // Cancel any previous restoration
  if (activeRestoration) {
    cancelFrame(activeRestoration)
    activeRestoration = null
  }

  // If restoring to top, execute immediately
  if (targetY <= 0) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (onComplete) onComplete()
    return
  }

  let attempts = 0

  const checkAndScroll = () => {
    const docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight
    )
    const winHeight = window.innerHeight

    // Check if document has rendered tall enough to support targetY
    const canReachTarget = docHeight >= targetY + Math.min(winHeight * 0.2, 100) || docHeight >= targetY

    if (canReachTarget) {
      window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' })

      // Verify that the browser actually scrolled to target
      const currentY = window.scrollY || document.documentElement.scrollTop || 0
      if (Math.abs(currentY - targetY) < 15 || attempts > 15) {
        activeRestoration = null
        pendingRestoreY = null
        if (onComplete) onComplete()
        return
      }
    }

    attempts++
    if (attempts < MAX_RESTORE_ATTEMPTS) {
      activeRestoration = requestFrame(checkAndScroll)
    } else {
      // Final attempt
      window.scrollTo({ top: targetY, left: targetX, behavior: 'instant' })
      activeRestoration = null
      pendingRestoreY = null
      if (onComplete) onComplete()
    }
  }

  activeRestoration = requestFrame(checkAndScroll)
}

/**
 * Notify the manager that content on the current page has finished rendering/fetching
 * This accelerates scroll restoration as soon as API data lands.
 */
export function notifyContentReady(routeKey) {
  const activeKey = routeKey || getRouteKey()
  if (pendingRestoreY !== null && pendingRestoreY > 0) {
    attemptScrollRestoration(pendingRestoreY, 0, () => {
      pendingRestoreY = null
    })
  } else if (isPopNavigation) {
    const saved = getSavedScrollPosition(activeKey)
    if (saved && saved.y > 0) {
      attemptScrollRestoration(saved.y, saved.x || 0)
    }
  }
}

/**
 * Handle route transition before navigating
 * Call this right before pushState / navigateTo to record source position and prepare target
 */
export function prepareNavigation(fromUrl, toUrl, isReplace = false) {
  const fromKey = fromUrl || getRouteKey()
  const toKey = toUrl ? getRouteKey(toUrl.split('?')[0], toUrl.includes('?') ? '?' + toUrl.split('?')[1] : '') : ''

  // 1. Save scroll position of the page we are departing
  saveCurrentScrollPosition(fromKey)

  // 2. Mark this as a new intentional navigation (not Back/Forward)
  isPopNavigation = false
  pendingRestoreY = 0

  // 3. Clear any old saved position for the target URL so new navigation starts fresh at the top
  if (!isReplace && toKey && toKey !== fromKey) {
    try {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${toKey}`)
    } catch (_) {}
  }
}

/**
 * Handle popstate (Back/Forward browser buttons)
 */
export function handlePopStateNavigation(targetUrl) {
  const targetKey = targetUrl || getRouteKey()
  isPopNavigation = true

  const saved = getSavedScrollPosition(targetKey)
  if (saved && saved.y > 0) {
    pendingRestoreY = saved.y
    attemptScrollRestoration(saved.y, saved.x || 0)
  } else {
    pendingRestoreY = 0
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }
}

/**
 * Initialize scroll restoration system
 */
export function initScrollRestoration() {
  if (isInitialized || typeof window === 'undefined') return
  isInitialized = true

  // Set browser to manual scroll restoration so it doesn't fight our layout-aware logic
  if ('scrollRestoration' in window.history) {
    try {
      window.history.scrollRestoration = 'manual'
    } catch (_) {}
  }

  currentRouteKey = getRouteKey()

  // Throttled scroll listener to continuously capture user scroll
  let ticking = false
  const onScroll = () => {
    if (!ticking) {
      requestFrame(() => {
        const key = getRouteKey()
        saveCurrentScrollPosition(key)
        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  // Save on pagehide and beforeunload (survives tab close or reload)
  const onPageUnload = () => {
    saveCurrentScrollPosition(getRouteKey())
  }
  window.addEventListener('pagehide', onPageUnload)
  window.addEventListener('beforeunload', onPageUnload)

  // Check if current load is a browser REFRESH / RELOAD
  let isReload = false
  try {
    const navEntries = performance.getEntriesByType('navigation')
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
      isReload = true
    }
  } catch (_) {}

  // If reload or if initial route has saved position, restore it
  const savedInitial = getSavedScrollPosition(currentRouteKey)
  if (savedInitial && savedInitial.y > 0 && (isReload || window.history.state?.scrollY)) {
    isPopNavigation = true
    pendingRestoreY = savedInitial.y
    attemptScrollRestoration(savedInitial.y, savedInitial.x || 0)
  }

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', onPageUnload)
    window.removeEventListener('beforeunload', onPageUnload)
  }
}
