import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Tag, ChevronLeft, ChevronRight, Scissors } from 'lucide-react'
import { isProductCustomizable, isProductActive } from '../../services/api'

export default function CurrentDealsSection({
  deals = [],
  onSelectDeal,
  onViewAll,
  variant = 'white', // 'white' | 'bespoke'
}) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const activeDeals = useMemo(
    () => (deals || []).filter((deal) => isProductActive(deal.product || deal)),
    [deals]
  )

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
  }, [activeDeals])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 240
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (activeDeals.length === 0) return null

  // Fallback demo images for items without image
  const fallbackImages = {
    417: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80',
    418: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=600&q=80',
  }

  const getDealCategoryName = (catId) => {
    switch (String(catId)) {
      case '44':
        return 'Menswear'
      case '46':
        return 'Girls Clothing'
      case '45':
        return 'Boys Clothing'
      case '48':
        return 'Indian & Fusion Wear'
      default:
        return 'Designer Fashion'
    }
  }

  const getPrice = (deal) => {
    if (deal.discount_price) return deal.discount_price
    if (deal.price) return deal.price
    if (deal.actual_price) return deal.actual_price
    if (deal.product?.discount_price) return deal.product.discount_price
    if (deal.product?.price) return deal.product.price
    if (deal.product?.actual_price) return deal.product.actual_price
    return '499.00'
  }

  const getOriginalPrice = (deal) => {
    if (deal.actual_price && deal.discount_price && Number(deal.actual_price) > Number(deal.discount_price)) {
      return deal.actual_price
    }
    if (deal.product?.actual_price && deal.product?.discount_price && Number(deal.product.actual_price) > Number(deal.product?.discount_price)) {
      return deal.product.actual_price
    }
    return null
  }

  const isBespoke = variant === 'bespoke'

  return (
    <section
      className={`py-10 relative overflow-hidden transition-colors duration-300 ${
        isBespoke
          ? 'bg-gradient-to-br from-[#9E1478] via-[#D6007A] to-[#B80068] border-y border-white/20 shadow-inner'
          : 'bg-white border-b border-neutral-100'
      }`}
    >
      {/* Background Architectural Cuts & Ambient Glow Design */}
      {isBespoke ? (
        <>
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-black/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
        </>
      ) : (
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full blur-[140px] pointer-events-none opacity-25"
          style={{
            background: 'radial-gradient(circle, #fce7f3 0%, #fdf2f8 100%)',
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header with Left-Right Scroller Controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2
                onClick={onViewAll}
                className={`text-[22px] sm:text-[24px] font-semibold tracking-normal transition-opacity ${
                  isBespoke ? 'text-white drop-shadow-xs' : 'text-[#24212A]'
                } ${onViewAll ? 'cursor-pointer hover:opacity-90' : ''}`}
              >
                {isBespoke ? (
                  'Top Current Deals'
                ) : (
                  <>
                    Top Current <span className="text-theme-gradient">Deals</span>
                  </>
                )}
              </h2>
              {/* Cut-Corner Asymmetric Atelier Badge */}
              <span
                className={`text-[10px] uppercase font-semibold tracking-wider px-3 py-0.5 border shadow-xs rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs ${
                  isBespoke
                    ? 'text-white bg-white/20 backdrop-blur-md border-white/30'
                    : 'bg-[#FFF1F8] text-[#D6007A] border-[#F8D4E8]'
                }`}
              >
                Limited Drop
              </span>
            </div>
            <p className={`text-xs ${isBespoke ? 'text-pink-100 font-medium' : 'text-neutral-500 font-normal'}`}>
              Exclusive high-fashion drops available for a limited celebration window
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onViewAll && (
              <button
                type="button"
                onClick={onViewAll}
                className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer group ${
                  isBespoke
                    ? 'text-white hover:text-pink-100 drop-shadow-2xs'
                    : 'text-[#D6007A] hover:text-[#9e1478]'
                }`}
              >
                <span>View All Deals</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <span
              className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full tracking-widest uppercase hidden md:inline-block ${
                isBespoke
                  ? 'text-pink-100 border-white/30 bg-white/10 backdrop-blur-xs'
                  : 'text-neutral-400 border-neutral-200 bg-neutral-50'
              }`}
            >
              Exclusive
            </span>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Previous deals"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollLeft
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollLeft
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[#D6007A] hover:text-[#D6007A]'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next deals"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollRight
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollRight
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[#D6007A] hover:text-[#D6007A]'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Single Row Horizontal Scroller (Left-to-Right) */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {activeDeals.map((deal) => {
            const product = deal.product || {}
            const image =
              deal.main_image ||
              deal.image ||
              product.main_image ||
              product.material_images?.[0]?.img_path ||
              fallbackImages[product.id] ||
              'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
            const price = getPrice(deal)
            const originalPrice = getOriginalPrice(deal)
            const isCustomizable = isProductCustomizable(product) || isProductCustomizable(deal)
            const productName = deal.product_name || product.product_name || deal.title || deal.name || 'Mens Designer Wear'
            const studioName =
              deal.vendor_name ||
              deal.vendor?.shop_name ||
              product.vendor?.shop_name ||
              product.vendor_name ||
              deal.name ||
              'Bespoke Studio'

            const discountPercent = (() => {
              if (deal.discount_percentage && Number(deal.discount_percentage) > 0) {
                return Number(deal.discount_percentage)
              }
              if (product.discount_percentage && Number(product.discount_percentage) > 0) {
                return Number(product.discount_percentage)
              }
              const p = parseFloat(price)
              const op = parseFloat(originalPrice)
              if (op > p && p > 0) {
                return Math.round(((op - p) / op) * 100)
              }
              const fallbackPcts = [50, 40, 60, 35, 45, 55]
              return fallbackPcts[Number(deal.id || 0) % fallbackPcts.length] || 50
            })()

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal && onSelectDeal(deal)}
                className={`group relative rounded-3xl rounded-tr-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-end shrink-0 w-[185px] sm:w-[205px] md:w-[220px] aspect-[3/4] hover:-translate-y-1.5 bg-neutral-900 ${
                  isBespoke
                    ? 'border-2 border-white/25 hover:border-white'
                    : 'border-2 border-neutral-200 hover:border-[#D6007A]'
                }`}
              >
                {/* Product Image */}
                <img
                  src={image}
                  alt={productName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80'
                  }}
                />

                {/* Customizable Badge with Cut Corners */}
                {isCustomizable && (
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-tl-xs rounded-br-xs rounded-tr-lg rounded-bl-lg bg-black/70 backdrop-blur-md text-white border border-white/25 shadow-2xs select-none">
                      <Scissors className="w-2.5 h-2.5 text-pink-300" />
                      <span>Custom</span>
                    </span>
                  </div>
                )}

                {/* Offer Percentage Badge with Asymmetric Cut */}
                {discountPercent > 0 && (
                  <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                    <span className="bg-white text-[#C00078] text-[10px] font-semibold px-2 py-0.5 rounded-tl-lg rounded-br-lg rounded-tr-xs rounded-bl-xs shadow-xs">
                      {discountPercent}% OFF
                    </span>
                  </div>
                )}

                {/* Refined Smooth Luxury Gradient Vignette for Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 via-35% to-transparent transition-opacity group-hover:from-black/95" />

                {/* Card Content at Bottom of Gradient */}
                <div className="relative z-10 p-3 sm:p-3.5 text-white">
                  {/* Line 1: Product Name on left, Amount on right in the same line */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h3
                      className="text-[14px] font-medium text-white line-clamp-1 capitalize group-hover:text-pink-200 transition-colors flex-1"
                      title={productName}
                    >
                      {productName}
                    </h3>
                    <div className="flex items-baseline gap-1 shrink-0">
                      <span className="text-[16px] sm:text-[17px] font-bold text-white tabular-nums tracking-normal">
                        ₹{price}
                      </span>
                      {Number(originalPrice) > Number(price) ? (
                        <span className="text-[11px] text-white/60 line-through tabular-nums">
                          ₹{originalPrice}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Line 2 (below): Studio / Brand name in single line */}
                  <div className="flex items-center justify-between gap-2 mt-1 pt-1 border-t border-white/15">
                    <span className="text-[11px] text-pink-200/90 font-medium capitalize truncate">
                      {studioName}
                    </span>
                    <span className="text-[10px] font-bold text-white/80 group-hover:text-pink-200 flex items-center gap-0.5 transition-colors shrink-0">
                      <span>View</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
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
