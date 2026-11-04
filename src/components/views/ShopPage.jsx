import React, { useState, useEffect } from 'react'
import { ArrowLeft, Heart, ShoppingBag, Store } from 'lucide-react'
import { getProducts, getSpotlights } from '../../services/api'

export default function ShopPage({
  shop,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
}) {
  const [shopData, setShopData] = useState(shop)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (shop) {
      setShopData((prev) => ({ ...prev, ...shop }))
    }
  }, [shop])

  useEffect(() => {
    let ignore = false
    async function fetchShopProducts() {
      if (!shop) return
      setIsLoading(true)
      try {
        const shopId = shop.shop_id || shop.id || 1

        // Resolve shop metadata if title/name is missing
        if (!shop.title && !shop.shop_name) {
          try {
            const spots = await getSpotlights()
            const found = (spots || []).find(
              (s) => String(s.shop_id || s.id) === String(shopId)
            )
            if (found && !ignore) {
              setShopData((prev) => ({ ...prev, ...found }))
            }
          } catch {}
        }

        const prods = await getProducts({ vendor_id: shopId })
        if (!ignore) {
          setProducts(prods || [])
        }
      } catch (err) {
        console.error('Error fetching shop products:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    fetchShopProducts()
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return () => {
      ignore = true
    }
  }, [shop?.id, shop?.shop_id])

  if (!shop && !shopData) return null

  const shopDisplayName = shopData?.title || shopData?.shop_name || `Atelier #${shopData?.shop_id || shopData?.id || ''}`
  const shopDisplayImage =
    shopData?.background_image ||
    shopData?.image ||
    shopData?.cover_image ||
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80'

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
            Home &rsaquo; Shops In Spotlight &rsaquo;{' '}
            <span className="font-bold text-neutral-900">
              {shopDisplayName}
            </span>
          </span>
        </div>
      </div>

      {/* Boutique Banner Header */}
      <div className="relative h-64 sm:h-80 bg-neutral-900 overflow-hidden flex items-end">
        <img
          src={shopDisplayImage}
          alt={shopDisplayName}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-xl shrink-0 flex items-center justify-center">
              {shopData?.brand_logo ? (
                <img
                  src={shopData.brand_logo}
                  alt={shopDisplayName}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Store className="w-8 h-8 text-theme-primary" />
              )}
            </div>

            <div className="text-white">
              <span className="text-xs uppercase tracking-widest text-pink-300 font-bold">
                Boutique in Spotlight
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-0.5">
                {shopDisplayName}
              </h1>
              {shopData?.price && (
                <p className="text-xs text-neutral-300 mt-1">
                  Curated collections starting from{' '}
                  <span className="font-bold text-white">₹{shopData.price}</span>
                </p>
              )}
            </div>
          </div>

          <span className="text-xs bg-white/20 backdrop-blur-xs text-white px-3 py-1 rounded-full font-bold">
            Verified Boutique Partner
          </span>
        </div>
      </div>

      {/* Products in Boutique */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-900 mb-6">
          Boutique Catalog ({products.length} Products)
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] bg-neutral-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p) => {
              const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
              const price = p.discount_price || p.actual_price || 499

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={p.image || p.img_path}
                      alt={p.product_name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onToggleWishlist) onToggleWishlist(p)
                      }}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 shadow-sm"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]' : 'text-neutral-600'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-theme-primary transition-colors line-clamp-1">
                        {p.product_name}
                      </h3>
                      <p className="text-[11px] text-neutral-500">{shop.title}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-extrabold text-theme-primary">
                        ₹{price}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddToCart(p)
                        }}
                        className="p-2 bg-theme-gradient text-white rounded-lg cursor-pointer shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
