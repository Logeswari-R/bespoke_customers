import React, { useState, useEffect } from 'react'
import { ArrowLeft, Store, ArrowRight } from 'lucide-react'
import { getSpotlights } from '../../services/api'
import { PageLoadingAnimation } from '../animations'
import { notifyContentReady } from '../../utils/scrollRestoration'

export default function ShopsListingPage({
  onBack,
  onSelectShop,
}) {
  const [shops, setShops] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function loadShops() {
      setIsLoading(true)
      try {
        const data = await getSpotlights()
        if (!ignore && Array.isArray(data)) {
          setShops(data)
        }
      } catch (err) {
        console.error('Failed to load shops from API:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }
    loadShops()
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="bg-neutral-50/70 min-h-screen pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-neutral-200/80 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home Feed</span>
          </button>
          <span className="text-neutral-500 font-medium">
            Home &rsaquo;{' '}
            <span className="font-bold text-neutral-900 uppercase">Shops In Spotlight</span>
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-neutral-200/80 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-theme-gradient">
            Verified Boutiques
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 uppercase mt-1">
            Shops In <span className="text-theme-gradient">Spotlight</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            Discover verified couture boutiques, tailoring ateliers, and bespoke studios.
          </p>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <PageLoadingAnimation
            message="Loading spotlight boutiques..."
            subMessage="Discovering curated couture shops & partners"
            minHeight="min-h-[40vh]"
          />
        ) : shops.length === 0 ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <Store className="w-12 h-12 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-800">No boutiques found</h3>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 btn-theme text-xs cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div
                key={shop.id}
                onClick={() => onSelectShop && onSelectShop(shop)}
                className="group relative bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
                  <img
                    src={shop.background_image || shop.image || shop.cover_image}
                    alt={shop.title || shop.shop_name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Brand Logo if available */}
                  {shop.brand_logo && (
                    <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white p-1 shadow-md border border-white/20 overflow-hidden">
                      <img
                        src={shop.brand_logo}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300">
                      Bespoke Boutique
                    </span>
                    <h3 className="text-base font-bold drop-shadow-sm group-hover:text-pink-200 transition-colors">
                      {shop.title || shop.shop_name}
                    </h3>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-600">
                    Custom Tailoring & Ready Wear
                  </span>
                  <span className="font-bold text-theme-primary inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Visit Shop</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
