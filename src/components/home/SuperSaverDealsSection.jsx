import React, { useRef, useState, useEffect, useMemo } from 'react'
import { Sparkles, Zap, ArrowRight, ChevronLeft, ChevronRight, Scissors } from 'lucide-react'
import { isProductCustomizable, isProductActive } from '../../services/api'

export default function SuperSaverDealsSection({
  deals = [],
  onSelectDeal,
  onViewAll,
  variant = 'bespoke', // 'bespoke' | 'white'
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

  const isBespoke = variant === 'bespoke'

  return (
    <section
      className={`py-10 relative overflow-hidden transition-colors duration-300 ${
        isBespoke
          ? 'bg-gradient-to-br from-[#9E1478] via-[#D6007A] to-[#B80068] border-y border-white/20 shadow-inner'
          : 'py-8 bg-white border-b border-neutral-100'
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
        {/* Header with Left-Right Scroller Controls */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2
                onClick={onViewAll}
                className={`text-[22px] sm:text-[24px] font-semibold tracking-normal transition-opacity ${
                  isBespoke ? 'text-white drop-shadow-xs' : 'text-[#24212A]'
                } ${onViewAll ? 'cursor-pointer hover:opacity-90' : ''}`}
              >
                {isBespoke ? (
                  <>
                    SUPER SAVER <span className="text-yellow-300">DEALS</span>
                  </>
                ) : (
                  <>
                    Super <span className="text-theme-gradient">Saver Deals</span>
                  </>
                )}
              </h2>
              {/* Cut-Corner Asymmetric Atelier Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wider py-0.5 px-2.5 rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs font-bold border shadow-xs ${
                  isBespoke
                    ? 'text-white bg-white/20 backdrop-blur-md border-white/30'
                    : 'badge-theme-subtle border-pink-200 text-[#D6007A]'
                }`}
              >
                <Zap className={`w-2.5 h-2.5 ${isBespoke ? 'text-yellow-300 fill-yellow-300' : 'text-[#D6007A]'}`} />
                <span>Celebration Offer</span>
              </span>
            </div>
            <p className={`text-xs ${isBespoke ? 'text-pink-100 font-medium' : 'text-neutral-500 font-normal'}`}>
              Handcrafted luxury silhouettes and artisanal styles at privileged festive rates
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
                    : 'text-theme-primary hover:text-theme-secondary'
                }`}
              >
                <span>View All Super Savers</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <span
              className={`text-[10px] font-bold border px-2 py-0.5 rounded-full tracking-widest uppercase hidden md:inline-block ${
                isBespoke
                  ? 'text-pink-100 border-white/30 bg-white/10 backdrop-blur-xs'
                  : 'text-neutral-400 border-neutral-200'
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
                aria-label="Previous super savers"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollLeft
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollLeft
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
                    : 'border-neutral-100 bg-neutral-50 text-neutral-300 cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Next super savers"
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isBespoke
                    ? canScrollRight
                      ? 'border-white/40 bg-white/20 hover:bg-white text-white hover:text-[#D6007A] shadow-md active:scale-95 backdrop-blur-md'
                      : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed opacity-40'
                    : canScrollRight
                    ? 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 shadow-xs hover:border-[var(--theme-primary)] hover:text-theme-primary'
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
            const isCustomizable = isProductCustomizable(product) || isProductCustomizable(deal)
            const image =
              deal.main_image ||
              deal.image ||
              product.main_image ||
              product.image ||
              product.material_images?.[0]?.img_path ||
              'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'
            const rawPrice = deal.price || deal.discount_price || deal.actual_price || '999'
            const formattedPrice = String(rawPrice).startsWith('₹') ? rawPrice : `₹${rawPrice}`
            const productName = deal.product_name || product.product_name || (deal.title && deal.title.toLowerCase() !== (deal.name || '').toLowerCase() ? deal.title : null) || 'Festive Designer Wear'
            const brandName =
              deal.vendor_name ||
              deal.vendor?.shop_name ||
              product.vendor?.shop_name ||
              product.vendor_name ||
              deal.name ||
              deal.title ||
              'Bespoke Atelier'

            const discountPercent = (() => {
              if (deal.discount_percentage && Number(deal.discount_percentage) > 0) {
                return Number(deal.discount_percentage)
              }
              if (product.discount_percentage && Number(product.discount_percentage) > 0) {
                return Number(product.discount_percentage)
              }
              const p = parseFloat(rawPrice)
              const op = parseFloat(deal.original_price || product.original_price || deal.actual_price)
              if (op > p && p > 0) {
                return Math.round(((op - p) / op) * 100)
              }
              const fallbackPcts = [50, 45, 60, 40, 55, 35]
              return fallbackPcts[Number(deal.id || 0) % fallbackPcts.length] || 50
            })()

            return (
              <div
                key={deal.id}
                onClick={() => onSelectDeal && onSelectDeal(deal)}
                className={`group overflow-hidden cursor-pointer flex flex-col justify-between shrink-0 w-[185px] sm:w-[205px] md:w-[220px] transition-all duration-300 ${
                  isBespoke
                    ? 'bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-white/25 hover:border-white hover:-translate-y-1'
                    : 'card-luxury'
                }`}
              >
                {/* Product Image Box */}
                <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                  <img
                    src={image}
                    alt={productName}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80'
                    }}
                  />

                  {/* Customizable Badge (Compact, Small & Discreet) */}
                  {isCustomizable && (
                    <div className="absolute top-2 left-2 z-10 pointer-events-none">
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[#C00078] border border-pink-200/80 shadow-2xs select-none">
                        <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                        <span>Custom</span>
                      </span>
                    </div>
                  )}

                  {/* Small Offer Percentage Badge (Replaces oversized Special Deal banner) */}
                  {discountPercent > 0 && (
                    <div className="absolute top-2 right-2 z-10 pointer-events-none">
                      <span className="bg-[#C00078] text-white text-[9px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  )}
                </div>

                {/* Unified Elegant Info Footer (Row 1: Product Name + Price | Row 2: Brand Logo only) */}
                <div className="px-4 py-2.5 sm:py-3 bg-white flex flex-col justify-between border-t border-[#F0E5EC]">
                  {/* ROW 1: Product Name on left | Price on right (same line, vertically centered) */}
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="text-[14px] sm:text-[15px] font-medium text-[#24212A] truncate capitalize text-left group-hover:text-[#C00078] transition-colors flex-1"
                      title={productName}
                    >
                      {productName}
                    </h3>
                    <span className="text-[16px] sm:text-[17px] font-bold text-[#C00078] shrink-0 tabular-nums leading-none text-right">
                      {formattedPrice}
                    </span>
                  </div>

                  {/* ROW 2: Brand Logo centered & enlarged in a single line */}
                  <div className="flex items-center justify-center h-8 sm:h-9 mt-2 pt-1.5 border-t border-[#F0E5EC]/70">
                    {deal.brand_logo ? (
                      <img
                        src={deal.brand_logo}
                        alt={brandName}
                        className="h-[28px] sm:h-[32px] max-h-[34px] max-w-[125px] object-contain object-center"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-[11.5px] text-[#77717C] font-semibold tracking-wider uppercase truncate text-center">
                        {brandName}
                      </span>
                    )}
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
