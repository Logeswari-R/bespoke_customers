import React, { useRef, useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Zap,
  Check,
  Scissors,
  Star,
  Sparkles,
} from 'lucide-react'
import { getProductRecommendationsApi, formatImageUrl, isProductCustomizable, isProductActive } from '../../services/api'

export default function RecommendedProductsSection({
  productId = null,
  currentProductId = null,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
  className = '',
}) {
  const targetPid = String(productId || currentProductId || '').trim()
  const [recommendations, setRecommendations] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

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
    let ignore = false
    const controller = new AbortController()

    if (!targetPid) {
      setRecommendations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasError(false)

    getProductRecommendationsApi(targetPid, { limit: 12, signal: controller.signal })
      .then((res) => {
        if (ignore) return
        if (res && res.status && Array.isArray(res.recommendations)) {
          // Filter out reference product and ensure active
          const filtered = res.recommendations.filter(
            (p) => String(p.id || p.product_id) !== targetPid && isProductActive(p)
          )
          setRecommendations(filtered)
        } else {
          setRecommendations([])
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        console.warn('Failed to load recommended products:', err.message)
        if (!ignore) {
          setHasError(true)
          setRecommendations([])
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
      controller.abort()
    }
  }, [targetPid])

  useEffect(() => {
    checkScroll()
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [recommendations])

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

  // If loading, display premium skeletons
  if (isLoading) {
    return (
      <section className={`py-8 bg-white border-b border-[#F0E5EC] relative ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="h-6 w-44 bg-neutral-200/80 rounded-md animate-pulse mb-1" />
              <div className="h-3 w-64 bg-neutral-100 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="flex items-stretch gap-4 sm:gap-5 overflow-x-hidden pb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={`rec-skel-${i}`}
                className="shrink-0 w-[190px] sm:w-[215px] md:w-[230px] rounded-2xl border border-[#F0E5EC] overflow-hidden bg-white p-3 space-y-3"
              >
                <div className="aspect-[3/4] bg-neutral-100 rounded-xl animate-pulse" />
                <div className="h-3 bg-neutral-100 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-neutral-200/70 rounded-md w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // If error occurred or no recommendations exist, gracefully return null
  if (hasError || !recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <section className={`py-8 bg-white border-b border-[#F0E5EC] relative ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#24212A] tracking-normal">
                You May <span className="text-[#C00078]">Also Like</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider py-0.5 px-2 rounded-full bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC]">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Curated</span>
              </span>
            </div>
            <p className="text-xs text-[#77717C] font-normal">
              Discover styles selected based on this product.
            </p>
          </div>

          {/* Desktop Left & Right Scroller Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll('left')}
              disabled={!canScrollLeft}
              aria-label="Previous recommended products"
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollLeft
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
              aria-label="Next recommended products"
              className={`p-2 rounded-full border transition-all cursor-pointer ${
                canScrollRight
                  ? 'border-[#F0E5EC] bg-white hover:bg-neutral-50 text-[#24212A] shadow-2xs hover:border-[#C00078] hover:text-[#C00078]'
                  : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Horizontal Carousel (Left-to-Right) */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 no-scrollbar scroll-smooth flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {recommendations.map((item) => {
            const prodId = item.id || item.product_id
            const isWishlisted = wishlistIds.some((id) => String(id) === String(prodId))
            const targetMatId = item.material_id || item.variant_id || item.selectedMaterialId || null
            const isInCart = cartItems.some((ci) => {
              const sameProd = String(ci.product_id || ci.id || ci.product?.id) === String(prodId)
              if (!sameProd) return false
              if (targetMatId) {
                const itemMatId = ci.material_id || ci.materialId || null
                if (itemMatId && String(itemMatId) !== String(targetMatId)) return false
              }
              return true
            })

            const price = parseFloat(item.offer_price || item.selling_price || item.price || 499)
            const originalPrice = parseFloat(item.actual_price || item.original_price || item.originalPrice || 0)
            const discountPercent = parseInt(item.discount_percentage || item.discountPercentage || 0, 10)
            const customizable = isProductCustomizable(item)
            const ratingScore = parseFloat(item.rating || 4.5).toFixed(1)
            const imageUrl = formatImageUrl(item.main_image || item.image || item.image_url)

            return (
              <div
                key={`rec-${prodId}`}
                onClick={() => onSelectProduct && onSelectProduct(item)}
                className="group relative rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between shrink-0 w-[190px] sm:w-[215px] md:w-[230px] border border-[#F0E5EC] hover:border-[#C00078]/40 bg-white"
              >
                {/* Product Image Area */}
                <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={item.product_name || item.title}
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

                  {/* Top Right: Wishlist Heart Button */}
                  {onToggleWishlist && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleWishlist(item)
                      }}
                      className={`absolute top-2 right-2 z-10 p-1.5 rounded-full backdrop-blur-xs transition-all shadow-2xs cursor-pointer ${
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
                        className="h-7 px-2 bg-[#24212A] hover:bg-black text-white rounded-lg text-[9px] font-semibold uppercase tracking-wider flex items-center justify-center gap-0.5 transition-colors cursor-pointer border-0"
                        title="Buy Now"
                      >
                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="hidden md:inline">Buy</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Product Card Details */}
                <div className="p-3 flex flex-col flex-grow justify-between bg-white">
                  <div>
                    {/* Brand / Vendor & Rating */}
                    <div className="flex items-center justify-between text-[11px] text-[#77717C] mb-1">
                      <span className="truncate font-semibold max-w-[130px]">
                        {item.brand_name || item.vendor_name || 'Bespoke Designer'}
                      </span>
                      <div className="flex items-center gap-0.5 text-amber-600 shrink-0 font-bold text-[10px]">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{ratingScore}</span>
                      </div>
                    </div>

                    {/* Product Name */}
                    <h3 className="text-[14px] font-medium text-[#24212A] line-clamp-1 group-hover:text-[#C00078] transition-colors leading-snug mb-1">
                      {item.product_name || item.title}
                    </h3>

                    {/* Category / Subcategory Info */}
                    <p className="text-[11px] text-[#77717C] truncate mb-2">
                      {item.subcategory_name || item.subcategory || item.category_name || item.category}
                    </p>
                  </div>

                  {/* Pricing Info */}
                  <div className="flex items-baseline gap-1.5 flex-wrap pt-1 border-t border-neutral-100">
                    <span className="text-base font-bold text-[#24212A] tabular-nums">
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    {Number(originalPrice) > Number(price) ? (
                      <span className="text-xs text-neutral-400 line-through tabular-nums">
                        ₹{originalPrice.toLocaleString('en-IN')}
                      </span>
                    ) : null}
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

