import React, { useState, useEffect } from 'react'
import { ArrowLeft, Heart, ShoppingBag } from 'lucide-react'
import {
  getProductListingByCategory,
  getSubcategories,
  getAllProducts,
  getCategories,
} from '../../services/api'

export default function CategoryPage({
  category,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
}) {
  const [categoryData, setCategoryData] = useState(category)
  const [products, setProducts] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [selectedSubId, setSelectedSubId] = useState(category?.selectedSubcategory || 'ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('featured')

  // Keep categoryData in sync when category prop updates
  useEffect(() => {
    if (category) {
      setCategoryData((prev) => ({
        ...prev,
        ...category,
      }))
      if (category.selectedSubcategory) {
        setSelectedSubId(category.selectedSubcategory)
      }
    }
  }, [category])

  // Load subcategories & category products
  useEffect(() => {
    let ignore = false
    async function loadCategoryData() {
      if (!category?.id) return
      setIsLoading(true)
      try {
        // Resolve category metadata if name is missing (e.g. direct URL route /category/:id)
        if (!category.name) {
          try {
            const allCats = await getCategories()
            const found = (allCats || []).find(
              (c) => String(c.id) === String(category.id)
            )
            if (found && !ignore) {
              setCategoryData((prev) => ({
                ...prev,
                ...found,
              }))
            }
          } catch {}
        }

        // 1. Fetch subcategories
        const subs = await getSubcategories(category.id)
        if (!ignore) {
          // Filter subcategories belonging to this category
          const relevantSubs = (subs || []).filter(
            (s) =>
              String(s.category_id) === String(category.id) ||
              String(s.categoryId) === String(category.id)
          )
          setSubcategories(relevantSubs.length > 0 ? relevantSubs : subs || [])
        }

        // 2. Fetch products for this category
        let prods = await getProductListingByCategory(category.id)
        if ((!prods || prods.length === 0) && !ignore) {
          // Fallback to client-side filtering from all products
          const all = await getAllProducts()
          prods = all.filter(
            (p) =>
              String(p.category) === String(category.id) ||
              String(p.category_id) === String(category.id) ||
              (p.category_name &&
                category.name &&
                p.category_name.toLowerCase() === category.name.toLowerCase())
          )
        }

        if (!ignore) {
          setProducts(prods || [])
        }
      } catch (err) {
        console.error('Failed to load category page data:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadCategoryData()
    return () => {
      ignore = true
    }
  }, [category?.id])

  // Filter products by selected subcategory
  const filteredProducts = products.filter((p) => {
    if (selectedSubId === 'ALL') return true
    return (
      String(p.sub_category) === String(selectedSubId) ||
      String(p.subcategory_id) === String(selectedSubId) ||
      (p.sub_category_name &&
        p.sub_category_name.toLowerCase() === selectedSubId.toLowerCase())
    )
  })

  // Sort products
  const displayedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = Number(a.discount_price || a.actual_price || a.price || 0)
    const priceB = Number(b.discount_price || b.actual_price || b.price || 0)
    if (sortBy === 'price-low') return priceA - priceB
    if (sortBy === 'price-high') return priceB - priceA
    return 0
  })

  const catDisplayName = categoryData?.name || (categoryData?.id ? `Category #${categoryData.id}` : 'Atelier Collection')
  const catDisplayImage =
    categoryData?.image_url ||
    categoryData?.cover_image ||
    categoryData?.img_path ||
    categoryData?.image ||
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80'

  if (!category && !categoryData) return null

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
            Home &rsaquo; Categories &rsaquo;{' '}
            <span className="font-bold text-neutral-900 uppercase">
              {catDisplayName}
            </span>
          </span>
        </div>
      </div>

      {/* Category Hero Banner */}
      <div className="bg-white border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200 p-1 shrink-0 shadow-md">
              <img
                src={catDisplayImage}
                alt={catDisplayName}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-theme-gradient">
                Bespoke Atelier Collection
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 uppercase tracking-tight mt-0.5">
                {catDisplayName}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
                Showing live collections from API for category &ldquo;{catDisplayName}&rdquo;.
              </p>
            </div>

            <div className="text-right shrink-0 hidden sm:block">
              <span className="text-xs text-neutral-500">
                Found{' '}
                <span className="font-bold text-neutral-900">
                  {displayedProducts.length}
                </span>{' '}
                styles
              </span>
            </div>
          </div>

          {/* Subcategories Filter Pills */}
          {subcategories.length > 0 && (
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 shrink-0">
                Subcategories:
              </span>
              <button
                type="button"
                onClick={() => setSelectedSubId('ALL')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedSubId === 'ALL'
                    ? 'bg-theme-gradient text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All {category.name}
              </button>

              {subcategories.map((sub) => {
                const isSelected = selectedSubId === sub.name || selectedSubId === String(sub.id)
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubId(sub.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-theme-gradient text-white shadow-sm'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {sub.image && (
                      <img
                        src={sub.image || sub.img_path}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span>{sub.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Toolbar */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-200 mb-6 text-xs">
          <div className="text-neutral-500 font-medium">
            Showing{' '}
            <span className="font-bold text-neutral-900">
              {displayedProducts.length}
            </span>{' '}
            results
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-xs text-neutral-800 font-medium focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse space-y-3"
              >
                <div className="aspect-[3/4] bg-neutral-200 rounded-xl" />
                <div className="h-4 bg-neutral-200 rounded w-3/4" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200 max-w-md mx-auto my-8">
            <h3 className="text-base font-bold text-neutral-900">
              No products found for this category filter
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Try selecting &ldquo;All {category.name}&rdquo; or exploring other categories.
            </p>
            <button
              onClick={() => setSelectedSubId('ALL')}
              className="px-4 py-2 btn-theme text-xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayedProducts.map((p) => {
              const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
              const price = p.discount_price || p.actual_price || p.price
              const originalPrice = p.actual_price || p.original_price

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                    <img
                      src={p.image || p.img_path || p.main_image}
                      alt={p.product_name || p.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                      onError={(e) => {
                        e.target.src =
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
                      }}
                    />

                    {/* Wishlist Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onToggleWishlist) onToggleWishlist(p)
                      }}
                      className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all cursor-pointer shadow-sm ${
                        isWishlisted
                          ? 'bg-pink-50 text-theme-primary'
                          : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isWishlisted ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]' : ''
                        }`}
                      />
                    </button>

                    {/* Quick Add on Desktop */}
                    <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 hidden sm:block">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddToCart({
                            id: p.id,
                            title: p.product_name || p.title,
                            price,
                            image: p.image || p.img_path,
                            vendor: p.vendor_name || 'Bespoke',
                          })
                        }}
                        className="w-full py-2.5 btn-theme text-xs uppercase tracking-wider shadow-md gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-theme-primary transition-colors line-clamp-1 capitalize">
                        {p.product_name || p.title}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
                        {p.vendor_name || 'Bespoke Atelier'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm sm:text-base font-extrabold text-theme-primary">
                          ₹{price}
                        </span>
                        {originalPrice && Number(originalPrice) > Number(price) && (
                          <span className="text-[11px] text-neutral-400 line-through">
                            ₹{originalPrice}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAddToCart({
                            id: p.id,
                            title: p.product_name || p.title,
                            price,
                            image: p.image || p.img_path,
                            vendor: p.vendor_name || 'Bespoke',
                          })
                        }}
                        className="sm:hidden p-2 bg-theme-gradient text-white rounded-lg cursor-pointer shadow-xs"
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
