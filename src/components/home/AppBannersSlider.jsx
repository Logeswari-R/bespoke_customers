import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { formatImageUrl } from '../../services/api'

export default function AppBannersSlider({
  banners = [],
  onSelectBanner,
}) {
  const [currentIdx, setCurrentIdx] = useState(0)

  // Filter and format banners from API
  const formattedBanners = (banners && banners.length > 0 ? banners : [])
    .map((b) => ({
      ...b,
      imageUrl: formatImageUrl(b.img_path || b.image),
    }))
    .filter((b) => Boolean(b.imageUrl))

  // Fallback to real API banner if banners array is empty
  const bannerList =
    formattedBanners.length > 0
      ? formattedBanners
      : [
          {
            id: 16,
            imageUrl:
              'https://bespoke-2026.s3.ap-south-1.amazonaws.com/app_banners/3PnnmFL3cjN3NXun6HW2FwKjWOw9aG.webp',
            searchfield_text: 'Mens T-Shirt',
            navigate: '1',
            searchfield_id: '416',
          },
          {
            id: 15,
            imageUrl:
              'https://bespoke-2026.s3.ap-south-1.amazonaws.com/app_banners/lVhFSo18DYq60RG7cwVPNa0ztHY52n.webp',
            searchfield_text: 'Monish ma',
            navigate: '2',
            searchfield_id: '1',
          },
        ]

  // Auto-play slider
  useEffect(() => {
    if (bannerList.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % bannerList.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [bannerList.length])

  const nextSlide = (e) => {
    e?.stopPropagation()
    setCurrentIdx((prev) => (prev + 1) % bannerList.length)
  }

  const prevSlide = (e) => {
    e?.stopPropagation()
    setCurrentIdx(
      (prev) => (prev - 1 + bannerList.length) % bannerList.length
    )
  }

  return (
    <section className="bg-white py-2.5 sm:py-4 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Banner Slider Container - Matches below section width, exact 960x576 image aspect ratio */}
        <div className="w-full relative rounded-2xl overflow-hidden shadow-xs group border border-neutral-100 bg-neutral-100">
          <div className="relative w-full aspect-[960/576] overflow-hidden flex items-center justify-center">
            {bannerList.map((banner, idx) => {
              const isActive = idx === currentIdx
              return (
                <div
                  key={banner.id || idx}
                  onClick={() => onSelectBanner && onSelectBanner(banner)}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer flex items-center justify-center ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.searchfield_text || 'Bespoke Banner'}
                    className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.01]"
                    onError={(e) => {
                      e.target.src =
                        'https://bespoke-2026.s3.ap-south-1.amazonaws.com/app_banners/3PnnmFL3cjN3NXun6HW2FwKjWOw9aG.webp'
                    }}
                  />
                </div>
              )
            })}

            {/* Left / Right Navigation Arrows */}
            {bannerList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevSlide}
                  className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md border border-white/20 active:scale-95"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2.5 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-md border border-white/20 active:scale-95"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dots Indicator */}
        {bannerList.length > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-2.5 sm:mt-3">
            {bannerList.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentIdx
                    ? 'w-6 bg-[#C00078] shadow-xs'
                    : 'w-1.5 bg-neutral-300 hover:bg-neutral-400'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
