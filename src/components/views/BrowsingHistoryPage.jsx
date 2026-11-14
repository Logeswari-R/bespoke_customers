import React, { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Trash2,
  Clock,
  Heart,
  ShoppingBag,
  Zap,
  Check,
  Scissors,
  X,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed'
import { formatImageUrl, isProductCustomizable } from '../../utils/recentlyViewedUtils'
import { isProductActive } from '../../services/api'

/**
 * Categorize ISO date string into 'Today', 'Yesterday', or 'Earlier'
 */
function getDateBucket(dateStr) {
  if (!dateStr) return 'Earlier'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Earlier'

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 24 * 60 * 60 * 1000
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  if (itemDate >= today) return 'Today'
  if (itemDate >= yesterday) return 'Yesterday'
  return 'Earlier'
}

/**
 * Format timestamp into human-readable label
 */
function formatViewedTime(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 24 * 60 * 60 * 1000
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

  const timePart = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (itemDate >= today) {
    return `Today at ${timePart}`
  }
  if (itemDate >= yesterday) {
    return `Yesterday at ${timePart}`
  }
  const datePart = date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return `${datePart} at ${timePart}`
}

const ITEMS_PER_PAGE = 24

export default function BrowsingHistoryPage({
  currentUser = null,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
  onExploreProducts,
}) {
  const { allHistory, removeProduct, clearAll } = useRecentlyViewed(currentUser?.id)
  const [showClearModal, setShowClearModal] = useState(false)
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const [selectedFilter, setSelectedFilter] = useState('ALL') // 'ALL' | 'CUSTOM' | 'DISCOUNT'

  // Filter products based on quick chip selection (strictly active only)
  const filteredProducts = useMemo(() => {
    if (!allHistory) return []
    let list = allHistory.filter((p) => p && isProductActive(p))

    if (selectedFilter === 'CUSTOM') {
      list = list.filter((p) => isProductCustomizable(p))
    } else if (selectedFilter === 'DISCOUNT') {
      list = list.filter((p) => Number(p.discount_percentage || 0) > 0)
    }

    return list
  }, [allHistory, selectedFilter])

  // Products to display with incremental loading
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount)
  }, [filteredProducts, visibleCount])

  // Group paginated products into Today, Yesterday, Earlier
  const groupedProducts = useMemo(() => {
    const groups = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    }

    for (const item of paginatedProducts) {
      const bucket = getDateBucket(item.viewed_at)
      if (groups[bucket]) {
        groups[bucket].push(item)
      } else {
        groups.Earlier.push(item)
      }
    }

    return groups
  }, [paginatedProducts])

  const handleClearHistory = () => {
    clearAll()
    setShowClearModal(false)
  }

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + ITEMS_PER_PAGE)
  }

  return (
    <div className="min-h-screen bg-[#FBF9FA] text-[#24212A] pb-24 md:pb-16 font-sans">
      {/* 1. Sticky Navigation Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#F0E5EC] px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-black transition-colors cursor-pointer"
                title="Go back"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-serif font-bold text-[#24212A] tracking-tight">
                  Browsing <span className="text-[#C00078]">History</span>
                </h1>
                {allHistory.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8]">
                    {allHistory.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#77717C] hidden sm:block">
                Products you've recently explored.
              </p>
            </div>
          </div>

          {/* Clear History Trigger Action */}
          {allHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 hover:text-rose-600 hover:bg-rose-50 border border-neutral-200 hover:border-rose-200 transition-colors cursor-pointer"
              title="Clear all browsing history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Empty State */}
        {allHistory.length === 0 ? (
          <div className="max-w-md mx-auto my-16 text-center px-4">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-[#FFF5FA] border border-[#F8D4E8] flex items-center justify-center text-[#C00078] shadow-sm mb-5">
              <Clock className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#24212A] mb-2">
              Your browsing history is empty
            </h2>
            <p className="text-sm text-[#77717C] mb-6">
              Products you explore will appear here so you can easily pick up where you left off.
            </p>
            <button
              type="button"
              onClick={() => (onExploreProducts ? onExploreProducts() : onBack && onBack())}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C00078] hover:bg-[#a00064] text-white font-semibold text-sm shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Products</span>
            </button>
          </div>
        ) : (
          <>
            {/* Quick Filter Chips */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedFilter === 'ALL'
                      ? 'bg-[#C00078] text-white shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-black border border-[#F0E5EC]'
                  }`}
                >
                  All Items ({allHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('CUSTOM')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedFilter === 'CUSTOM'
                      ? 'bg-[#C00078] text-white shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-black border border-[#F0E5EC]'
                  }`}
                >
                  <Scissors className="w-3 h-3" />
                  <span>Customizable</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFilter('DISCOUNT')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    selectedFilter === 'DISCOUNT'
                      ? 'bg-[#C00078] text-white shadow-xs'
                      : 'bg-white text-neutral-600 hover:text-black border border-[#F0E5EC]'
                  }`}
                >
                  On Sale
                </button>
              </div>

              <span className="text-xs text-[#77717C]">
                Showing {paginatedProducts.length} of {filteredProducts.length} items
              </span>
            </div>

            {/* Date-Grouped Product Sections: Today, Yesterday, Earlier */}
            {['Today', 'Yesterday', 'Earlier'].map((bucketName) => {
              const bucketItems = groupedProducts[bucketName]
              if (!bucketItems || bucketItems.length === 0) return null

              return (
                <div key={bucketName} className="mb-10">
                  {/* Bucket Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm sm:text-base font-bold text-[#24212A] tracking-tight flex items-center gap-2">
                      <span>{bucketName}</span>
                      <span className="text-xs font-normal text-[#77717C]">
                        ({bucketItems.length})
                      </span>
                    </h3>
                    <div className="flex-1 h-px bg-[#F0E5EC]" />
                  </div>

                  {/* Responsive Product Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                    {bucketItems.map((item) => {
                      const prodId = item.id || item.product_id
                      const isWishlisted =
                        Array.isArray(wishlistIds) && wishlistIds.includes(Number(prodId))
                      const isInCart =
                        Array.isArray(cartItems) &&
                        cartItems.some(
                          (ci) =>
                            String(ci.product_id || ci.productId || ci.id) === String(prodId)
                        )

                      const price = parseFloat(
                        item.selling_price || item.price || item.offer_price || 499
                      )
                      const originalPrice = parseFloat(
                        item.original_price || item.actual_price || 0
                      )
                      const discountPercent = parseInt(item.discount_percentage || 0, 10)
                      const customizable = isProductCustomizable(item)
                      const imageUrl = formatImageUrl(
                        item.product_image || item.image || item.main_image
                      )
                      const viewedLabel = formatViewedTime(item.viewed_at)

                      return (
                        <div
                          key={`hist-${prodId}`}
                          onClick={() => onSelectProduct && onSelectProduct(item)}
                          className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between border border-[#F0E5EC] hover:border-[#C00078]/40 bg-white"
                        >
                          {/* Image Container */}
                          <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                            <img
                              src={imageUrl}
                              alt={item.product_name || item.title}
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                              onError={(e) => {
                                e.target.src =
                                  'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
                              }}
                            />

                            {/* Top Left: Customizable Badge */}
                            {customizable && (
                              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[#C00078] border border-[#F8D4E8] shadow-2xs select-none">
                                  <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                                  <span>Custom</span>
                                </span>
                              </div>
                            )}

                            {/* Top Right: Remove from History & Wishlist */}
                            <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                              {/* Remove single item action */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeProduct(prodId)
                                }}
                                className="p-1.5 rounded-full bg-white/90 text-neutral-400 hover:text-rose-600 hover:bg-white backdrop-blur-xs transition-all shadow-2xs cursor-pointer"
                                title="Remove this product from history"
                                aria-label="Remove product from history"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              {/* Wishlist toggle */}
                              {onToggleWishlist && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onToggleWishlist(item)
                                  }}
                                  className={`p-1.5 rounded-full backdrop-blur-xs transition-all shadow-2xs cursor-pointer ${
                                    isWishlisted
                                      ? 'bg-[#FFF1F8] text-[#C00078]'
                                      : 'bg-white/85 text-neutral-600 hover:text-[#C00078] hover:bg-white'
                                  }`}
                                  title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                  aria-label="Toggle Wishlist"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      isWishlisted ? 'fill-[#C00078] stroke-[#C00078]' : ''
                                    }`}
                                  />
                                </button>
                              )}
                            </div>

                            {/* Bottom Left: Discount Percentage Badge */}
                            {discountPercent > 0 && (
                              <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
                                <span className="bg-[#C00078] text-white text-[8.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                                  {discountPercent}% OFF
                                </span>
                              </div>
                            )}

                            {/* Desktop Hover Quick Action Bar */}
                            <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hidden sm:flex items-center gap-1.5 z-20">
                              {isInCart ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (onOpenCart) onOpenCart()
                                  }}
                                  className="flex-1 h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer border-0"
                                  title="In Bag - View Bag"
                                >
                                  <Check className="w-3 h-3 text-white" />
                                  <span className="truncate">In Bag</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (onAddToCart) onAddToCart(item)
                                  }}
                                  className="flex-1 h-7 px-2 bg-[#C00078] hover:bg-[#a00064] text-white rounded-lg text-[9px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer border-0 shadow-md"
                                  title="Add to Bag"
                                >
                                  <ShoppingBag className="w-3 h-3 text-white" />
                                  <span className="truncate">Add to Bag</span>
                                </button>
                              )}

                              {onBuyNow && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onBuyNow(item)
                                  }}
                                  className="h-7 px-2 bg-[#24212A] hover:bg-black text-white rounded-lg text-[9px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer border-0 shadow-md"
                                  title="Buy Now"
                                >
                                  <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                                  <span className="hidden md:inline">Buy</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Product Card Details */}
                          <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 bg-white text-left">
                            <div>
                              {/* Brand / Vendor Info */}
                              <p
                                className="text-[11px] font-normal text-[#77717C] truncate"
                                title={item.brand_name || 'Bespoke Atelier'}
                              >
                                {item.brand_name || 'Bespoke Atelier'}
                              </p>

                              {/* Title */}
                              <h3
                                className="text-xs sm:text-[13px] font-semibold text-[#24212A] line-clamp-1 leading-snug group-hover:text-[#C00078] transition-colors mt-0.5"
                                title={item.product_name || item.title}
                              >
                                {item.product_name || item.title}
                              </h3>
                            </div>

                            {/* Timestamp Indicator */}
                            {viewedLabel && (
                              <div className="flex items-center gap-1 text-[10px] text-neutral-400 mt-1.5 pt-1 border-t border-neutral-100">
                                <Clock className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
                                <span className="truncate">{viewedLabel}</span>
                              </div>
                            )}

                            {/* Price Row */}
                            <div className="border-t border-[#F0E5EC] pt-2 mt-2 flex items-baseline justify-between gap-1.5">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-bold text-[#C00078] leading-none">
                                  ₹{price.toLocaleString('en-IN')}
                                </span>
                                {originalPrice && Number(originalPrice) > Number(price) && (
                                  <span className="text-[11px] text-neutral-400 line-through leading-none">
                                    ₹{originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              {/* Mobile Quick Add to Bag */}
                              <div className="sm:hidden">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (onAddToCart) onAddToCart(item)
                                  }}
                                  className="p-1.5 bg-[#FFF1F8] text-[#C00078] rounded-full hover:bg-[#C00078] hover:text-white transition-colors"
                                  title="Add to Bag"
                                >
                                  <ShoppingBag className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Load More Pagination Button */}
            {filteredProducts.length > visibleCount && (
              <div className="text-center py-6">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 rounded-full border border-[#C00078] text-[#C00078] hover:bg-[#FFF1F8] text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Load More ({filteredProducts.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal for Clearing History */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl border border-neutral-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#24212A] mb-1">
              Clear Browsing History?
            </h3>
            <p className="text-xs text-[#77717C] mb-6">
              This will remove all {allHistory.length} products from your recently viewed history on this device. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

