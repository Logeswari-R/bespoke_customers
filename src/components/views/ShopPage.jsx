import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Heart, ShoppingBag, Store, Zap, Check, Scissors, ChevronLeft, ChevronRight } from 'lucide-react'
import { getProducts, getSpotlights, isProductCustomizable, formatImageUrl } from '../../services/api'
import { notifyContentReady } from '../../utils/scrollRestoration'

export default function ShopPage({
  shop,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
}) {
  const [shopData, setShopData] = useState(shop)
  const [products, setProducts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Pagination Configuration: Exactly 15 items per page
  const ITEMS_PER_PAGE = 15
  const [currentPage, setCurrentPage] = useState(1)
  const topRef = useRef(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [shop?.id])

  const totalItems = products.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems)
  const paginatedProducts = useMemo(() => {
    return products.slice(startIndex, endIndex)
  }, [products, startIndex, endIndex])

  useEffect(() => {
    if (shop) {
      setShopData((prev) => ({ ...prev, ...shop }))
    }
  }, [shop?.id, shop?.shop_id, shop?.title])

  useEffect(() => {
    let ignore = false
    async function fetchShopProducts() {
      if (!shop) return
      setIsLoading(true)
      try {
        const rawTargetId = String(shop.id || shop.shop_id || '').trim()

        // 1. Fetch spotlights and shops to resolve exact boutique by ID, slug, or vendor ID
        let resolvedShop = shop
        let vendorId = shop.shop_id || shop.id || 1

        try {
          const [spotsRes, allShopsRes] = await Promise.allSettled([
            getSpotlights(),
            fetch('/api/shoplist/view').then((r) => r.json()).catch(() => null),
          ])

          const spots = spotsRes.status === 'fulfilled' && Array.isArray(spotsRes.value) ? spotsRes.value : []
          const allShops =
            allShopsRes.status === 'fulfilled' && allShopsRes.value?.status && Array.isArray(allShopsRes.value.data)
              ? allShopsRes.value.data
              : []

          const targetSlug = rawTargetId.toLowerCase().replace(/[^a-z0-9]/g, '')
          const isNum = /^\d+$/.test(rawTargetId)
          const targetNum = isNum ? Number(rawTargetId) : null

          let found = null

          // Priority 1: Match by Spotlight ID (16 for Zivara, 17 for DreamWeave, 18 for Lunara, etc.)
          if (targetNum !== null) {
            found = spots.find((s) => Number(s.id) === targetNum)
          }

          // Priority 2: Match by Title / Slug against Spotlights (e.g. "dreamwave", "dreamweave", "zivara", "lunara")
          if (!found && targetSlug) {
            found = spots.find((s) => {
              const titleClean = String(s.title || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              const shopNameClean = String(s.shop_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              return (
                titleClean === targetSlug ||
                shopNameClean === targetSlug ||
                titleClean.includes(targetSlug) ||
                (targetSlug.includes('dream') && titleClean.includes('dream')) ||
                (targetSlug.includes('ziv') && titleClean.includes('ziv')) ||
                (targetSlug.includes('lunar') && titleClean.includes('lunar')) ||
                (targetSlug.includes('test') && (titleClean.includes('test') || shopNameClean.includes('test')))
              )
            })
          }

          // Priority 3: Match by vendor shop_id in Spotlights
          if (!found && targetNum !== null) {
            found = spots.find((s) => Number(s.shop_id) === targetNum)
          }

          // Priority 4: Search all vendors from /api/shoplist/view
          if (!found) {
            const vendorMatch = allShops.find((v) => {
              if (targetNum !== null && Number(v.id) === targetNum) return true
              const vShopClean = String(v.shop_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              const vSellerClean = String(v.seller_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
              return (
                vShopClean === targetSlug ||
                vSellerClean === targetSlug ||
                vShopClean.includes(targetSlug) ||
                (targetSlug.includes('test') && (vShopClean.includes('test') || vSellerClean.includes('test')))
              )
            })
            if (vendorMatch) {
              found = {
                id: vendorMatch.id,
                shop_id: vendorMatch.id,
                title: vendorMatch.shop_name,
                shop_name: vendorMatch.shop_name,
                brand_logo: formatImageUrl(vendorMatch.img_path),
                background_image: formatImageUrl(vendorMatch.img_path),
                price: vendorMatch.price || '499',
              }
            }
          }

          // Priority 5: Fallback for explicit 'test' boutique if not in active spotlights
          if (!found && targetSlug.includes('test')) {
            found = {
              id: 14,
              shop_id: 19,
              title: 'Test Atelier',
              shop_name: 'The Style Edit',
              price: '100',
            }
          }

          if (found) {
            resolvedShop = { ...found, ...shop, ...found }
            vendorId = found.shop_id || found.id || vendorId
            if (!ignore) {
              setShopData(resolvedShop)
            }
          }
        } catch (e) {
          console.warn('Failed resolving spotlight metadata:', e)
        }

        const prods = await getProducts({ vendor_id: vendorId })
        if (!ignore) {
          setProducts(prods || [])
        }
      } catch (err) {
        console.error('Error fetching shop products:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }
    fetchShopProducts()
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
    <div ref={topRef} className="bg-neutral-50/70 min-h-screen pb-16">
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
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4">
            {paginatedProducts.map((p) => {
              const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
              const price = p.discount_price || p.actual_price || 499

              const isCustomizable = isProductCustomizable(p)

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

                    {/* Customizable Badge (Compact, Small & Discreet) */}
                    {isCustomizable && (
                      <div className="absolute top-2 left-2 z-10 pointer-events-none">
                        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[#C00078] border border-pink-200/80 shadow-2xs select-none">
                          <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                          <span>Custom</span>
                        </span>
                      </div>
                    )}

                    {/* Small Offer Percentage Badge */}
                    {p.discount_percentage > 0 && (
                      <div className="absolute top-2 right-9 z-10 pointer-events-none">
                        <span className="bg-[#C00078] text-white text-[8.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                          {p.discount_percentage}% OFF
                        </span>
                      </div>
                    )}

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

                  {/* Product Info Section (Redesigned with Strict Alignment & Tokens) */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-white text-left">
                    <div className="flex-1 flex flex-col">
                      {/* Row 1: Product name on left corner & Custom badge on right corner */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="text-[16px] font-semibold text-[#24212A] leading-snug line-clamp-2 text-left group-hover:text-[#C00078] transition-colors break-words flex-1"
                          title={p.product_name || p.name || 'Curated Silhouette'}
                        >
                          {p.product_name || p.name || 'Curated Silhouette'}
                        </h3>

                        {isCustomizable && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-2 py-0.5 rounded-[6px] shrink-0 select-none mt-0.5">
                            <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                            <span>CUSTOM</span>
                          </span>
                        )}
                      </div>

                      {/* Row 2: Vendor / shop name */}
                      <p
                        className="text-[13.5px] font-normal text-[#77717C] text-left truncate mt-1"
                        title={shop.title || shop.shop_name || 'Bespoke Atelier'}
                      >
                        {shop.title || shop.shop_name || 'Bespoke Atelier'}
                      </p>
                    </div>

                    {/* 4. Subtle divider & 5. Horizontal Price Layout */}
                    <div className="border-t border-[#F0E5EC] mt-3 pt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[20px] font-bold text-[#C00078] leading-none">
                          ₹{price}
                        </span>
                        {p.original_price && Number(p.original_price) > Number(price) && (
                          <span className="text-[13.5px] font-normal text-[#999999] line-through leading-none">
                            ₹{p.original_price}
                          </span>
                        )}
                        {p.discount_percentage > 0 && (
                          <span className="inline-flex items-center text-[10.5px] font-bold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-1.5 py-0.5 rounded-[5px] leading-none">
                            {p.discount_percentage}% OFF
                          </span>
                        )}
                      </div>
                      {(() => {
                        const isInCart = cartItems.some(
                          (c) => Number(c.product_id || c.product?.id || c.id) === Number(p.id)
                        )
                        return (
                          <div className="flex items-center gap-1.5">
                            {isInCart ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onOpenCart) onOpenCart()
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs flex items-center gap-1 transition-colors"
                                title="In Bag - Go to Bag"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">In Bag</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddToCart(p)
                                }}
                                className="p-2 bg-theme-gradient text-white rounded-lg cursor-pointer shadow-xs flex items-center justify-center"
                                aria-label="Add to bag"
                                title="Add to Bag"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onBuyNow) {
                                  onBuyNow(p)
                                } else if (onSelectProduct) {
                                  onSelectProduct(p)
                                }
                              }}
                              className="px-2.5 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs flex items-center gap-1 transition-colors"
                              title="Buy Now"
                            >
                              <Zap className="w-3 h-3 text-amber-400" />
                              <span>Buy</span>
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls: Exactly 15 items per page */}
          {totalPages > 1 && (
            <div className="mt-8 pt-5 border-t border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-600 font-medium">
                Showing <span className="font-bold text-neutral-900">{startIndex + 1}</span>–
                <span className="font-bold text-neutral-900">{endIndex}</span> of{' '}
                <span className="font-bold text-neutral-900">{totalItems}</span> products
              </p>

              <div className="flex items-center gap-1.5 select-none">
                {/* Previous Button */}
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    safePage <= 1
                      ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-400'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer'
                  }`}
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                  const isCurrent = pageNum === safePage
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum)
                        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C00078] text-white shadow-xs'
                          : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300'
                      }`}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                {/* Next Button */}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                    safePage >= totalPages
                      ? 'opacity-40 cursor-not-allowed bg-neutral-100 text-neutral-400'
                      : 'bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200 shadow-2xs cursor-pointer'
                  }`}
                  aria-label="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
