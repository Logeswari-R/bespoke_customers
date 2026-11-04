import React, { useState, useEffect } from 'react'
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react'
import { getCategories } from '../../services/api'

export default function CategoriesListingPage({
  onBack,
  onSelectCategory,
  onSelectSubcategory,
}) {
  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    async function loadCategories() {
      setIsLoading(true)
      try {
        const data = await getCategories()
        if (!ignore && Array.isArray(data)) {
          setCategories(data)
        }
      } catch (err) {
        console.error('Failed to load categories:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    loadCategories()
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <span className="font-bold text-neutral-900 uppercase">Categories</span>
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-neutral-200/80 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-theme-gradient">
            Atelier Directory
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 uppercase mt-1">
            All Handcrafted <span className="text-theme-gradient">Categories</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            Browse our full catalog of handcrafted cuts, custom tailoring, and contemporary silhouettes.
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-xs font-semibold text-neutral-500">
              Loading categories from API...
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center bg-white rounded-2xl border border-neutral-200 p-8 text-center">
            <Layers className="w-12 h-12 text-neutral-300 mb-3" />
            <h3 className="text-base font-bold text-neutral-800">No categories found</h3>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 btn-theme text-xs cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col"
              >
                <div
                  onClick={() => onSelectCategory && onSelectCategory(cat)}
                  className="relative aspect-[16/9] bg-neutral-100 overflow-hidden cursor-pointer group"
                >
                  <img
                    src={cat.image_url || cat.cover_image || cat.img_path || cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h2 className="text-lg font-bold capitalize drop-shadow-sm group-hover:text-pink-300 transition-colors">
                      {cat.name}
                    </h2>
                    <span className="text-[11px] text-neutral-300 font-medium">
                      {(cat.subcategories && cat.subcategories.length) || 0} subcategories
                    </span>
                  </div>
                </div>

                {/* Subcategories list */}
                {Array.isArray(cat.subcategories) && cat.subcategories.length > 0 && (
                  <div className="p-4 border-t border-neutral-100 flex-1 flex flex-col justify-between">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {cat.subcategories.slice(0, 6).map((sub) => (
                        <button
                          key={sub.id || sub.name}
                          type="button"
                          onClick={() =>
                            onSelectSubcategory &&
                            onSelectSubcategory({
                              category: cat.name,
                              categoryId: cat.id,
                              subcategory: sub.name || sub,
                            })
                          }
                          className="text-[11px] font-medium bg-neutral-100 hover:bg-pink-50 hover:text-theme-primary text-neutral-700 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                        >
                          {sub.name || sub}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectCategory && onSelectCategory(cat)}
                      className="inline-flex items-center justify-between text-xs font-bold text-theme-primary hover:text-theme-secondary pt-2 border-t border-neutral-100 cursor-pointer"
                    >
                      <span>Explore {cat.name} Collection</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
