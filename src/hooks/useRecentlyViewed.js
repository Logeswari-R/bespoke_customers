import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getRecentlyViewedProducts,
  getLatestRecentlyViewedProducts,
  addRecentlyViewedProduct,
  removeRecentlyViewedProduct,
  clearRecentlyViewedProducts,
} from '../utils/recentlyViewedUtils'

/**
 * Custom React Hook to interact with the shared recently viewed cache in real-time.
 * Synchronizes across components, windows, and browser tabs via event listeners.
 *
 * @param {string|number|null} userId - Current user ID or null for guest
 * @param {object} options - Options such as currentProductId to exclude or limit
 */
export function useRecentlyViewed(userId = null, options = {}) {
  const currentProductId = options?.currentProductId ? String(options.currentProductId).trim() : null
  const limit = typeof options?.limit === 'number' ? options.limit : null

  const [items, setItems] = useState(() => getRecentlyViewedProducts(userId))

  // Refresh items when userId changes (e.g. login/logout)
  useEffect(() => {
    setItems(getRecentlyViewedProducts(userId))
  }, [userId])

  // Synchronize on custom updates or cross-tab storage changes
  useEffect(() => {
    function handleUpdate(e) {
      if (e.detail?.userId !== undefined) {
        if (String(e.detail.userId || '') === String(userId || '')) {
          setItems(e.detail.list || getRecentlyViewedProducts(userId))
        }
      } else {
        setItems(getRecentlyViewedProducts(userId))
      }
    }

    function handleStorage(e) {
      if (e.key && e.key.startsWith('bespoke_recently_viewed_v1')) {
        setItems(getRecentlyViewedProducts(userId))
      }
    }

    window.addEventListener('bespoke_recently_viewed_updated', handleUpdate)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('bespoke_recently_viewed_updated', handleUpdate)
      window.removeEventListener('storage', handleStorage)
    }
  }, [userId])

  // Add a product to history
  const addProduct = useCallback(
    (product) => {
      return addRecentlyViewedProduct(product, userId)
    },
    [userId]
  )

  // Remove a product from history
  const removeProduct = useCallback(
    (productId) => {
      return removeRecentlyViewedProduct(productId, userId)
    },
    [userId]
  )

  // Clear all history
  const clearAll = useCallback(() => {
    clearRecentlyViewedProducts(userId)
  }, [userId])

  // Exclude current product if on PDP
  const filteredItems = useMemo(() => {
    if (!currentProductId) return items
    return items.filter(
      (item) =>
        String(item.id) !== currentProductId &&
        String(item.product_id) !== currentProductId
    )
  }, [items, currentProductId])

  // Carousel view: exactly latest 10 items (or specified limit)
  const latest10 = useMemo(() => {
    return filteredItems.slice(0, limit || 10)
  }, [filteredItems, limit])

  return {
    recentlyViewed: filteredItems,
    latest10,
    allHistory: items,
    rawRecentlyViewed: items,
    hasItems: filteredItems.length > 0,
    totalCount: items.length,
    addProduct,
    removeProduct,
    clearAll,
  }
}

export default useRecentlyViewed
