import React, { useState, useMemo } from 'react'
import {
  Heart,
  ShoppingBag,
  Star,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Check,
} from 'lucide-react'
import { NAVIGATION_CATEGORIES } from '../../data/navigationData'

export default function ProductListing({
  activeFilter,
  onSelectCategory,
  onSelectSubcategory,
  onResetFilter,
  products = [],
  wishlistIds = [],
  onToggleWishlist,
  onAddToCart,
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

  // Filtered products list
  const filteredProducts = useMemo(() => {
    let result = [...products]

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

  const handleAdd = (product) => {
    onAddToCart(product)
    setAddedNotice(`Added "${product.title}" to bag`)
    setTimeout(() => setAddedNotice(null), 2500)
  }

  return (
    <div className="min-h-screen bg-neutral-50/60 pb-20">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isWishlisted = wishlistIds.includes(product.id)

              return (
                <div
                  key={product.id}
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

                    {/* Tag badge */}
                    {product.tag && (
                      <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/95 text-neutral-900 shadow-xs">
                        {product.tag}
                      </span>
                    )}

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(product.id)}
                      className={`absolute top-3 right-3 p-2 rounded-full transition-all cursor-pointer shadow-sm ${
                        isWishlisted
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                      }`}
                      aria-label="Wishlist toggle"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isWishlisted ? 'fill-rose-600 stroke-rose-600' : ''
                        }`}
                      />
                    </button>

                    {/* Quick Add overlay button */}
                    <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={() => handleAdd(product)}
                        className="w-full py-2.5 bg-white/95 backdrop-blur-xs hover:bg-neutral-900 hover:text-white text-neutral-900 text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                    </div>
                  </div>

                  {/* Product Meta */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                        <span className="uppercase tracking-wider font-semibold">
                          {product.category} &bull; {product.subcategory}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
                          <span>{product.rating}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-neutral-900 group-hover:text-black line-clamp-2">
                        {product.title}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-neutral-900">
                          ${product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="text-xs text-neutral-400 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleAdd(product)}
                        className="sm:hidden p-2 bg-neutral-900 text-white rounded-lg cursor-pointer"
                        aria-label="Add to bag"
                      >
                        <ShoppingBag className="w-4 h-4" />
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

