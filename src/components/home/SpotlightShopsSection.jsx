import React, { useRef, useState, useEffect } from 'react'
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export default function SpotlightShopsSection({
  spotlights = [],
  onSelectShop,
  onViewAll,
  variant = 'white', // 'white' | 'bespoke'
}) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

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
  }, [spotlights])

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 250
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (!spotlights || spotlights.length === 0) return null

  const isBespoke = variant === 'bespoke'

  return (
    <section
      className={`py-10 relative overflow-hidden transition-colors duration-300 ${
        isBespoke
          ? 'bg-gradient-to-br from-[#B80068] via-[#D6007A] to-[#8E0052] border-y border-white/20 shadow-inner'
          : 'bg-white border-b border-neutral-100'
      }`}
    >
      {/* Background Architectural Cuts & Ambient Glow Design */}
      {isBespoke ? (
        <>
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-black/15 blur-3xl pointer-events-none" />
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
          <div className="flex items-center gap-3">
            <h2
              onClick={onViewAll}
              className={`text-xl sm:text-2xl font-black tracking-tight transition-opacity ${
                isBespoke ? 'text-white drop-shadow-xs' : 'text-neutral-900'
              } ${onViewAll ? 'cursor-pointer hover:opacity-90' : ''}`}
            >
              {isBespoke ? (
                'Shops In Spotlight'
              ) : (
                <>
                  Shops In <span className="text-theme-gradient">Spotlight</span>
                </>
              )}
            </h2>
            {/* Cut-Corner Asymmetric Atelier Badge */}
            <span
              className={`text-[10px] uppercase font-black tracking-widest px-3 py-0.5 border shadow-xs rounded-tl-xl rounded-br-xl rounded-tr-xs rounded-bl-xs ${
                isBespoke
                  ? 'text-white bg-white/20 backdrop-blur-md border-white/30'
                  : 'bg-[#FFF1F8] text-[#D6007A] border-[#F8D4E8]'
              }`}
            >
              Boutiques
            </span>
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
                <span>View All Boutiques</span>
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
              Featured
            </span>

            {/* Left & Right Scroller Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
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
                aria-label="Scroll right"
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
          {spotlights.map((shop) => (
            <div
              key={shop.id}
              onClick={() => onSelectShop && onSelectShop(shop)}
              className={`group relative shrink-0 w-[210px] sm:w-[230px] md:w-[250px] h-[310px] sm:h-[340px] rounded-3xl rounded-tr-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col justify-end hover:-translate-y-1.5 ${
                isBespoke
                  ? 'border-2 border-white/25 hover:border-white'
                  : 'border-2 border-neutral-200/80 hover:border-[#D6007A]'
              }`}
            >
              {/* Boutique Background Image */}
              <img
                src={shop.background_image}
                alt={shop.title || shop.shop_name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                onError={(e) => {
                  e.target.src =
                    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
                }}
              />

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Top Atelier Cut Badge */}
              <div className="absolute top-3.5 left-3.5 z-10">
                <span className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-1 rounded-tl-lg rounded-br-lg rounded-tr-xs rounded-bl-xs border border-white/20 shadow-sm">
                  <Sparkles className="w-3 h-3 text-pink-300" />
                  <span>Verified Atelier</span>
                </span>
              </div>

              {/* Content Overlay */}
              <div className="relative z-10 p-5 w-full flex flex-col items-center text-center">
                <span className="text-[10px] uppercase tracking-widest text-pink-200 font-bold mb-0.5">
                  Starting from
                </span>
                <span className="text-lg sm:text-xl font-black text-white tracking-wide drop-shadow-sm mb-1">
                  ₹{shop.price}
                </span>
                <span className="text-xs text-neutral-200 font-medium line-clamp-1 mb-3.5">
                  {shop.title || shop.shop_name}
                </span>

                {/* White Logo Pill at bottom */}
                <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl py-2.5 px-4 shadow-md flex items-center justify-center transition-all group-hover:bg-white group-hover:shadow-lg border border-white/60">
                  {shop.brand_logo ? (
                    <img
                      src={shop.brand_logo}
                      alt={shop.title}
                      className="h-6 sm:h-7 max-w-[140px] object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="font-serif font-black tracking-widest text-neutral-900 text-xs uppercase flex items-center gap-1.5">
                      <span>{shop.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#D6007A] group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
