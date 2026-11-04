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
    <section className="bg-white py-3 sm:py-5 border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Banner Slider Container - Responsive full-width luxury hero */}
        <div className="w-full relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-md bg-neutral-900 group">
          <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] md:aspect-[2.6/1] lg:aspect-[2.8/1] overflow-hidden">
            {bannerList.map((banner, idx) => {
              const isActive = idx === currentIdx
              return (
                <div
                  key={banner.id || idx}
                  onClick={() => onSelectBanner && onSelectBanner(banner)}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out cursor-pointer ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={banner.imageUrl}
                    alt={banner.searchfield_text || 'Bespoke Banner'}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-101"
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
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                  aria-label="Previous banner"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                  aria-label="Next banner"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dots Indicator (Matches Screenshot 1 style: pill for active, dot for inactive) */}
        {bannerList.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-3.5">
            {bannerList.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  i === currentIdx
                    ? 'w-6 bg-theme-gradient shadow-xs'
                    : 'w-2 bg-neutral-300 hover:bg-neutral-400'
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
