import React, { useState, useEffect, useRef } from 'react'
import { Search, X, TrendingUp, Sparkles, ArrowRight, Tag } from 'lucide-react'
import {
  TRENDING_SEARCHES,
  POPULAR_CATEGORIES,
  NAVIGATION_CATEGORIES,
  SAMPLE_PRODUCTS,
} from '../../data/navigationData'

export default function SearchBar({
  searchQuery = '',
  setSearchQuery,
  onSelectSearch,
  isMobile = false,
  onCloseMobileSearch,
  placeholder = 'What are you looking for?',
  products = [],
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Derive matching suggestions safely
  const trimmed = (searchQuery || '').trim().toLowerCase()

  // Find matching subcategories across all navigation categories with total null safety
  const matchingSubcategories = trimmed && Array.isArray(NAVIGATION_CATEGORIES)
    ? NAVIGATION_CATEGORIES.flatMap((cat) =>
        (cat.sections || []).flatMap((sec) =>
          (sec.items || [])
            .filter((item) => typeof item === 'string' && item.toLowerCase().includes(trimmed))
            .map((item) => ({
              subcategory: item,
              categoryName: cat.name || '',
              categoryId: cat.id,
              section: sec.title || '',
            }))
        )
      ).slice(0, 5)
    : []

  // Pool of products: uses passed live products if available, fallback to SAMPLE_PRODUCTS
  const productPool = Array.isArray(products) && products.length > 0 ? products : SAMPLE_PRODUCTS

  // Find matching products safely without crashing on undefined titles/categories
  const matchingProducts = trimmed && Array.isArray(productPool)
    ? productPool
        .filter((p) => {
          if (!p) return false
          const name = String(p.product_name || p.title || p.name || '').toLowerCase()
          const cat = String(typeof p.category === 'string' ? p.category : p.category_name || '').toLowerCase()
          const sub = String(typeof p.subcategory === 'string' ? p.subcategory : p.sub_category_name || '').toLowerCase()
          return name.includes(trimmed) || cat.includes(trimmed) || sub.includes(trimmed)
        })
        .slice(0, 5)
    : []

  const handleClear = () => {
    setSearchQuery('')
    inputRef.current?.focus()
  }

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    if (!trimmed) return
    onSelectSearch({ type: 'query', query: trimmed })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectTrending = (term) => {
    setSearchQuery(term)
    onSelectSearch({ type: 'query', query: term })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectSubcategory = (item) => {
    onSelectSearch({
      type: 'subcategory',
      category: item.categoryName,
      subcategory: item.subcategory,
    })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectProduct = (product) => {
    onSelectSearch({
      type: 'product',
      product,
    })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form onSubmit={handleSearchSubmit} className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-neutral-400">
          <Search className="w-4 h-4 transition-colors group-focus-within:text-black" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white text-sm text-neutral-900 placeholder-neutral-500 pl-10 pr-10 py-2.5 rounded-full border border-transparent focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 transition-all duration-200"
          aria-label="Search products"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        {searchQuery ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
            aria-label="Clear search query"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </form>

      {/* Suggested Products & Categories Dropdown on Focus */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* If user hasn't typed yet, show trending & categories */}
          {!trimmed && (
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Trending searches */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Trending Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelectTrending(item)}
                      className="px-3 py-1.5 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-full transition-all cursor-pointer font-medium"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular categories */}
              <div className="border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Popular Categories</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.name + cat.category}
                      type="button"
                      onClick={() =>
                        handleSelectSubcategory({
                          subcategory: cat.name,
                          categoryName: cat.category,
                        })
                      }
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 text-left transition-colors group cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-semibold text-neutral-800 group-hover:text-black">
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                          in {cat.category}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* When user has typed, show matching results */}
          {trimmed && (
            <div className="p-3 max-h-[75vh] overflow-y-auto divide-y divide-neutral-100">
              {/* Matching Subcategories */}
              {matchingSubcategories.length > 0 && (
                <div className="pb-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                    <Tag className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Matching Categories</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {matchingSubcategories.map((item, idx) => (
                      <button
                        key={`${item.subcategory}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSubcategory(item)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-neutral-50 transition-colors text-left group cursor-pointer"
                      >
                        <span className="font-medium text-neutral-800 group-hover:text-black">
                          {item.subcategory}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-500 uppercase tracking-wider font-semibold">
                          {item.categoryName} • {item.section}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Products */}
              {matchingProducts.length > 0 && (
                <div className="pt-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1 mb-1">
                    Products
                  </div>
                  <div className="space-y-1">
                    {matchingProducts.map((p) => {
                      const pTitle = p.product_name || p.title || p.name || 'Bespoke Item'
                      const pImg = p.image || p.img_path || p.main_image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=120&q=80'
                      const pPrice = p.discount_price || p.actual_price || p.price || 499
                      const pCat = p.category_name || p.category || 'Atelier'
                      const pSub = p.subcategory || p.sub_category_name || ''

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectProduct(p)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 transition-colors text-left group cursor-pointer"
                        >
                          <img
                            src={pImg}
                            alt={pTitle}
                            className="w-10 h-12 object-cover rounded bg-neutral-100 shrink-0"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=120&q=80'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-neutral-900 truncate group-hover:text-theme-primary transition-colors">
                              {pTitle}
                            </p>
                            <p className="text-[11px] text-neutral-500">
                              {pCat} {pSub ? `› ${pSub}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-theme-primary">
                              ₹{pPrice}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {matchingSubcategories.length === 0 && matchingProducts.length === 0 && (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  No matching categories or products found for &ldquo;{searchQuery}&rdquo;.
                  <div className="mt-2 text-neutral-400 text-[11px]">
                    Press Enter to perform a global store search.
                  </div>
                </div>
              )}

              {/* View all search results button */}
              <div className="pt-2 px-1">
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full py-2.5 btn-theme text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span>Search for &ldquo;{searchQuery}&rdquo;</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
