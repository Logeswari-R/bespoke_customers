import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Heart,
  ShoppingBag,
  Star,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  Zap,
  Scissors,
} from 'lucide-react'
import { NAVIGATION_CATEGORIES } from '../../data/navigationData'
import { isProductCustomizable, isProductActive } from '../../services/api'

export default function ProductListing({
  activeFilter,
  onSelectCategory,
  onSelectSubcategory,
  onResetFilter,
  products = [],
  wishlistIds = [],
  onToggleWishlist,
  onAddToCart,
  cartItems = [],
  onOpenCart,
  onBuyNow,
}) {
  const [sortBy, setSortBy] = useState('featured')
  const [addedNotice, setAddedNotice] = useState(null)

  // Find active category config
  const currentCategoryData = useMemo(() => {
    return NAVIGATION_CATEGORIES.find(
      (c) =>
        c.name === activeFilter.category ||
        c.id === activeFilter.categoryId
    )
  }, [activeFilter.category, activeFilter.categoryId])

  // Filtered products list (strictly active only)
  const filteredProducts = useMemo(() => {
    let result = products.filter(isProductActive)

    if (activeFilter.type === 'query' && activeFilter.query) {
      const q = activeFilter.query.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory.toLowerCase().includes(q) ||
          (p.section && p.section.toLowerCase().includes(q))
      )
    } else {
      if (activeFilter.category && activeFilter.category !== 'ALL') {
        result = result.filter((p) => p.category === activeFilter.category)
      }
      if (activeFilter.subcategory) {
        result = result.filter((p) => p.subcategory === activeFilter.subcategory)
      }
      if (activeFilter.section) {
        result = result.filter(
          (p) => !p.section || p.section === activeFilter.section
        )
      }
    }

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price)
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating)
    }

    return result
  }, [products, activeFilter, sortBy])

  // Pagination Configuration: Exactly 15 items per page
  const ITEMS_PER_PAGE = 15
  const [currentPage, setCurrentPage] = useState(1)
  const topRef = useRef(null)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, sortBy])

  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems)
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, startIndex, endIndex])

  const handleAdd = (product) => {
    onAddToCart(product)
    setAddedNotice(`Added "${product.title}" to bag`)
    setTimeout(() => setAddedNotice(null), 2500)
  }

  return (
    <div ref={topRef} className="min-h-screen bg-neutral-50/60 pb-20">
      {/* Toast Notification */}
      {addedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* Hero Category Banner */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4 flex-wrap">
            <button
              onClick={onResetFilter}
              className="hover:text-black transition-colors cursor-pointer font-medium"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />

            {activeFilter.category && (
              <>
                <button
                  onClick={() =>
                    onSelectCategory({
                      name: activeFilter.category,
                      id: activeFilter.categoryId,
                    })
                  }
                  className="hover:text-black transition-colors cursor-pointer font-medium uppercase"
                >
                  {activeFilter.category}
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
              </>
            )}

            {activeFilter.section && (
              <>
                <span className="text-neutral-500">{activeFilter.section}</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
              </>
            )}

            <span className="text-neutral-900 font-bold truncate">
              {activeFilter.subcategory ||
                (activeFilter.query ? `Search: "${activeFilter.query}"` : 'All Products')}
            </span>
          </nav>

          {/* Heading & description */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-neutral-900 uppercase">
                {activeFilter.subcategory ||
                  activeFilter.category ||
                  (activeFilter.query ? `Search Results` : 'Curated Collections')}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
                {currentCategoryData?.featured?.subtitle ||
                  'Explore our handcrafted, luxury fashion curation with signature atelier cuts.'}
              </p>
            </div>

            <div className="text-xs text-neutral-500 shrink-0 font-medium">
              Showing <span className="font-bold text-neutral-900">{filteredProducts.length}</span> styles
            </div>
          </div>

          {/* Subcategory quick-filter pills (when category is active) */}
          {currentCategoryData && (
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 shrink-0 mr-1">
                Explore:
              </span>
              <button
                type="button"
                onClick={() =>
                  onSelectCategory({
                    name: currentCategoryData.name,
                    id: currentCategoryData.id,
                  })
                }
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                  !activeFilter.subcategory
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All {currentCategoryData.name}
              </button>
              {currentCategoryData.sections.flatMap((s) => s.items).slice(0, 10).map((sub) => {
                const isSelected = activeFilter.subcategory === sub
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() =>
                      onSelectSubcategory({
                        category: currentCategoryData.name,
                        categoryId: currentCategoryData.id,
                        subcategory: sub,
                      })
                    }
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {sub}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Catalog Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Controls Toolbar: Active filter tags & Sorting */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200/80 mb-8">
          {/* Active filter badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-400 flex items-center gap-1 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
            </span>
            {activeFilter.category && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-neutral-200 rounded-md font-medium text-neutral-800 shadow-2xs">
                {activeFilter.category}
              </span>
            )}
            {activeFilter.subcategory && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-white border border-neutral-200 rounded-md font-semibold text-neutral-900 shadow-2xs">
                {activeFilter.subcategory}
              </span>
            )}
            {(activeFilter.category || activeFilter.subcategory || activeFilter.query) && (
              <button
                onClick={onResetFilter}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 text-xs self-end sm:self-auto">
            <span className="text-neutral-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-neutral-200 rounded-lg px-3 py-1.5 text-neutral-800 font-medium focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer shadow-2xs"
            >
              <option value="featured">Featured / Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Customer Rating</option>
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center max-w-md mx-auto my-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">
              No exact match found
            </h3>
            <p className="text-xs text-neutral-500 mb-6">
              We couldn't find items matching your selected criteria. Try exploring another subcategory or clear filters.
            </p>
            <button
              onClick={onResetFilter}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Show All Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3 sm:gap-4">
            {paginatedProducts.map((product) => {
              const isWishlisted = wishlistIds.includes(product.id)
              const isCustomizable = isProductCustomizable(product)

              return (
                <div
                  key={product.unique_id || `${product.id}-${product.variant_id || 0}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-neutral-200/70 hover:border-neutral-300 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col"
                >
                  {/* Product Image & Badges */}
                  <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Customizable Badge (Compact, Small & Discreet) */}
                    {isCustomizable ? (
                      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[#C00078] border border-pink-200/80 shadow-2xs select-none">
                        <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                        <span>Custom</span>
                      </span>
                    ) : product.tag ? (
                      <span className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/95 text-neutral-900 shadow-2xs">
                        {product.tag}
                      </span>
                    ) : null}

                    {/* Small Offer Percentage Badge */}
                    {product.discount_percentage > 0 && (
                      <span className="absolute top-2 right-9 z-10 bg-[#C00078] text-white text-[8.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs pointer-events-none">
                        {product.discount_percentage}% OFF
                      </span>
                    )}

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
                      className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                        isWishlisted
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                      }`}
                      aria-label="Wishlist toggle"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'fill-rose-600 stroke-rose-600' : ''
                        }`}
                      />
                    </button>

                    {/* Single Line Quick Action overlay */}
                    {(() => {
                      const isInCart = cartItems.some(
                        (c) => Number(c.product_id || c.product?.id || c.id) === Number(product.id)
                      )
                      return (
                        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hidden sm:flex items-center gap-1.5 z-10">
                          {isInCart ? (
                            <button
                              onClick={() => {
                                if (onOpenCart) onOpenCart()
                              }}
                              className="flex-1 h-7 sm:h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-semibold uppercase tracking-wider rounded-[9px] flex items-center justify-center gap-1 cursor-pointer transition-colors duration-150 ease-out border-0 shadow-none"
                              title="In Bag - Go to Bag"
                            >
                              <Check className="w-3 h-3 stroke-[2.5] shrink-0 text-white" />
                              <span className="truncate">In Bag</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAdd(product)}
                              className="flex-1 h-7 sm:h-8 px-2 bg-[#C00078] hover:bg-[#A80069] active:bg-[#97005F] text-white text-[9.5px] font-semibold uppercase tracking-wider rounded-[9px] transition-colors duration-150 ease-out flex items-center justify-center gap-1 cursor-pointer border-0 shadow-none"
                              title="Add to Bag"
                            >
                              <ShoppingBag className="w-3 h-3 shrink-0 text-white" />
                              <span className="truncate">Add to Bag</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (onBuyNow) {
                                onBuyNow(product)
                              } else {
                                handleAdd(product)
                              }
                            }}
                            className="flex-1 h-7 sm:h-8 px-2 bg-[#222222] hover:bg-[#111111] active:bg-[#000000] text-white text-[9.5px] font-semibold uppercase tracking-wider rounded-[9px] transition-colors duration-150 ease-out flex items-center justify-center gap-1 cursor-pointer border-0 shadow-none"
                            title="Buy Now"
                          >
                            <Zap className="w-3 h-3 text-white fill-white shrink-0" />
                            <span className="truncate">Buy Now</span>
                          </button>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Product Info Section (Redesigned with Strict Alignment & Tokens) */}
                  <div className="p-4 flex-1 flex flex-col justify-between bg-white text-left">
                    <div className="flex-1 flex flex-col">
                      {/* Row 1: Product name on left corner & Custom badge on right corner */}
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className="text-[16px] font-semibold text-[#24212A] leading-snug line-clamp-2 text-left group-hover:text-[#C00078] transition-colors break-words flex-1"
                          title={product.title || product.product_name}
                        >
                          {product.title || product.product_name}
                        </h3>

                        {isCustomizable && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-2 py-0.5 rounded-[6px] shrink-0 select-none mt-0.5">
                            <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                            <span>CUSTOM</span>
                          </span>
                        )}
                      </div>

                      {/* Row 2: Vendor / shop name */}
                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <p
                          className="text-[13.5px] font-normal text-[#77717C] text-left truncate"
                          title={product.shop_name || product.vendor?.shop_name || product.vendor_name || product.brand || 'Bespoke Atelier'}
                        >
                          {product.shop_name || product.vendor?.shop_name || product.vendor_name || product.brand || 'Bespoke Atelier'}
                        </p>
                        {product.variant_name && (
                          <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/60 truncate max-w-[110px] shrink-0" title={`Variant: ${product.variant_name}`}>
                            {product.variant_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 4. Subtle divider & 5. Horizontal Price Layout */}
                    <div className="border-t border-[#F0E5EC] mt-3 pt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[20px] font-bold text-[#C00078] leading-none">
                          ₹{product.price}
                        </span>
                        {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                          <span className="text-[13.5px] font-normal text-[#999999] line-through leading-none">
                            ₹{product.originalPrice}
                          </span>
                        )}
                        {product.discount_percentage > 0 && (
                          <span className="inline-flex items-center text-[10.5px] font-bold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-1.5 py-0.5 rounded-[5px] leading-none">
                            {product.discount_percentage}% OFF
                          </span>
                        )}
                      </div>

                      {(() => {
                        const isInCart = cartItems.some(
                          (c) => Number(c.product_id || c.product?.id || c.id) === Number(product.id)
                        )
                        return (
                          <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                            {isInCart ? (
                              <button
                                onClick={() => {
                                  if (onOpenCart) onOpenCart()
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-[9px] cursor-pointer shadow-none flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150 ease-out border-0"
                                aria-label="Go to bag"
                                title="In Bag - Go to Bag"
                              >
                                <Check className="w-3 h-3 text-white stroke-[2.5]" />
                                <span>In Bag</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAdd(product)}
                                className="px-2.5 py-1.5 bg-[#C00078] hover:bg-[#A80069] active:bg-[#97005F] text-white rounded-[9px] cursor-pointer shadow-none flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150 ease-out border-0"
                                aria-label="Add to bag"
                                title="Add to Bag"
                              >
                                <ShoppingBag className="w-3 h-3 text-white" />
                                <span>Add</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (onBuyNow) {
                                  onBuyNow(product)
                                } else {
                                  handleAdd(product)
                                }
                              }}
                              className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#111111] active:bg-[#000000] text-white text-[10px] font-semibold uppercase tracking-wider rounded-[9px] cursor-pointer shadow-none flex items-center gap-1 transition-colors duration-150 ease-out border-0"
                              title="Buy Now"
                            >
                              <Zap className="w-3 h-3 text-white fill-white" />
                              <span>Buy</span>
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
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
                <span className="font-bold text-neutral-900">{totalItems}</span> creations
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
        )}
      </div>
    </div>
  )
}

