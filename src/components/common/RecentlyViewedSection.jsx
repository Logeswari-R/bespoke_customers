import React, { useRef, useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Zap,
  Check,
  Scissors,
  X,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed'
import { formatImageUrl, isProductCustomizable } from '../../utils/recentlyViewedUtils'
import { isProductActive } from '../../services/api'

export default function RecentlyViewedSection({
  userId = null,
  currentProductId = null,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
  onOpenHistory,
  onViewAll,
  variant = 'bespoke', // 'bespoke' | 'white'
  className = '',
}) {
  const { latest10, removeProduct, clearAll } = useRecentlyViewed(userId, {
    currentProductId,
    limit: 10,
  })

  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [latest10])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 260
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  const activeItems = useMemo(
    () => (latest10 || []).filter((item) => item && isProductActive(item)),
    [latest10]
  )

  const handleViewAllClick = () => {
    if (onOpenHistory) onOpenHistory()
    else if (onViewAll) onViewAll()
  }

  // If there are no recently viewed products, hide the section entirely
  if (!activeItems || activeItems.length === 0) {
    return null
  }

  const isBespoke = variant === 'bespoke'

  return (
    <section
      className={`relative overflow-hidden transition-colors duration-300 ${
        isBespoke
          ? 'py-10 bg-gradient-to-br from-[#9E1478] via-[#D6007A] to-[#B80068] border-y border-white/20 shadow-inner'
          : 'py-8 bg-white border-b border-[#F0E5EC]'
      } ${className}`}
    >
      {/* Background Architectural Cuts & Ambient Glow Design for Bespoke Variant */}
      {isBespoke && (
        <>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-black/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                className={`text-xl sm:text-2xl font-semibold tracking-normal ${
                  isBespoke ? 'text-white drop-shadow-xs' : 'text-[#24212A]'
                }`}
              >
                Recently <span className={isBespoke ? 'text-pink-200' : 'text-[#C00078]'}>Viewed</span>
              </h2>
              {/* Cut-Corner Asymmetric Atelier Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider py-0.5 px-2.5 rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs border shadow-xs ${
                  isBespoke
                    ? 'bg-white/20 backdrop-blur-md text-white border-white/30'
                    : 'bg-[#FFF5FA] text-[#C00078] border-[#F0E5EC]'
                }`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>Latest 10</span>
              </span>
            </div>
            <p className={`text-xs ${isBespoke ? 'text-pink-100 font-medium' : 'text-[#77717C] font-normal'}`}>
              Pick up where you left off.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* View All Link to Profile -> History */}
            {(onOpenHistory || onViewAll) && (
              <button
                type="button"
                onClick={handleViewAllClick}
                className={`text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                  isBespoke
                    ? 'text-white hover:text-pink-100 drop-shadow-2xs'
                    : 'text-[#C00078] hover:text-[#90005a] hover:underline'
                }`}
                title="View full browsing history"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Clear All History Button */}
            <button
              type="button"
              onClick={clearAll}
              className={`text-[11px] font-semibold cursor-pointer transition-colors hidden sm:flex items-center gap-1 ${
                isBespoke
                  ? 'text-pink-200 hover:text-white'
                  : 'text-[#77717C] hover:text-[#C00078] hover:underline'
              }`}
              title="Clear recently viewed history"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous recently viewed creations"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollLeft
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollLeft
                    ? 'border-[#F0E5EC] bg-white hover:bg-neutral-50 text-[#24212A] shadow-2xs hover:border-[#C00078] hover:text-[#C00078]'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next recently viewed creations"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollRight
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollRight
                    ? 'border-[#F0E5EC] bg-white hover:bg-neutral-50 text-[#24212A] shadow-2xs hover:border-[#C00078] hover:text-[#C00078]'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Carousel (Left-to-Right) - Exactly up to 10 unique products */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeItems.map((item) => {
            const prodId = item.id || item.product_id
            const isWishlisted = Array.isArray(wishlistIds) && wishlistIds.includes(Number(prodId))
            const targetMatId = item.material_id || item.variant_id || item.selectedMaterialId || null
            const isInCart = Array.isArray(cartItems) && cartItems.some((ci) => {
              const sameProd = String(ci.product_id || ci.productId || ci.id) === String(prodId)
              if (!sameProd) return false
              if (targetMatId) {
                const itemMatId = ci.material_id || ci.materialId || null
                if (itemMatId && String(itemMatId) !== String(targetMatId)) return false
              }
              return true
            })

            const price = parseFloat(item.selling_price || item.price || item.offer_price || 499)
            const originalPrice = parseFloat(item.original_price || item.actual_price || 0)
            const discountPercent = parseInt(item.discount_percentage || 0, 10)
            const customizable = isProductCustomizable(item)
            const imageUrl = formatImageUrl(item.product_image || item.image || item.main_image)

            return (
              <div
                key={`rv-${prodId}`}
                onClick={() => onSelectProduct && onSelectProduct(item)}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col justify-between shrink-0 w-[175px] sm:w-[200px] md:w-[220px] bg-white ${
                  isBespoke
                    ? 'border-2 border-white/30 hover:border-white shadow-lg hover:shadow-2xl hover:-translate-y-1'
                    : 'border border-[#F0E5EC] hover:border-[#C00078]/40 shadow-xs hover:shadow-xl'
                }`}
              >
                {/* Product Image Area */}
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
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start pointer-events-none">
                      <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[#C00078] border border-[#F8D4E8] shadow-2xs select-none">
                        <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                        <span>Custom</span>
                      </span>
                    </div>
                  )}

                  {/* Top Right: Wishlist Heart Button & Remove from History */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    {/* Remove from history button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeProduct(prodId)
                      }}
                      className="p-1.5 rounded-full bg-white/85 text-neutral-400 hover:text-rose-600 hover:bg-white backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 shadow-2xs cursor-pointer"
                      title="Remove from history"
                      aria-label="Remove product from history"
                    >
                      <X className="w-3 h-3" />
                    </button>

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

                  {/* Desktop Quick Action Buttons on Hover */}
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

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onBuyNow) {
                          onBuyNow(item)
                        } else if (onSelectProduct) {
                          onSelectProduct(item)
                        }
                      }}
                      className="flex-1 h-7 px-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-[9px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer border-0 shadow-md"
                      title="Buy Now"
                    >
                      <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="truncate">Buy Now</span>
                    </button>
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
                      className="text-[14px] font-medium text-[#24212A] line-clamp-1 leading-snug group-hover:text-[#C00078] transition-colors mt-0.5"
                      title={item.product_name || item.title}
                    >
                      {item.product_name || item.title}
                    </h3>
                  </div>

                  {/* Price Row */}
                  <div className="border-t border-[#F0E5EC] pt-2.5 mt-2 flex items-baseline justify-between gap-1.5">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-base font-bold text-[#C00078] tabular-nums leading-none">
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      {Number(originalPrice) > Number(price) ? (
                        <span className="text-xs text-neutral-400 line-through tabular-nums leading-none">
                          ₹{originalPrice.toLocaleString('en-IN')}
                        </span>
                      ) : null}
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
    </section>
  )
}
