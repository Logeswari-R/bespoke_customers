import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  X,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Tag,
  Clock,
  Store,
  Loader2,
  CornerDownLeft,
} from 'lucide-react'
import {
  TRENDING_SEARCHES,
  POPULAR_CATEGORIES,
  NAVIGATION_CATEGORIES,
} from '../../data/navigationData'
import { getSearchSuggestionsApi } from '../../services/api'
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../../utils/searchUtils'

/**
 * Highlights the matched characters of query in suggestion text
 */
function renderHighlighted(text = '', query = '') {
  if (!query || !text) return text
  const cleanQ = query.trim().toLowerCase()
  const lowerText = text.toLowerCase()
  const idx = lowerText.indexOf(cleanQ)
  if (idx === -1) {
    // Check if query starts with word
    const firstWord = cleanQ.split(' ')[0]
    const wordIdx = lowerText.indexOf(firstWord)
    if (wordIdx !== -1) {
      return (
        <span>
          {text.substring(0, wordIdx)}
          <strong className="font-bold text-[#C00078]">{text.substring(wordIdx, wordIdx + firstWord.length)}</strong>
          {text.substring(wordIdx + firstWord.length)}
        </span>
      )
    }
    return <span>{text}</span>
  }

  return (
    <span>
      {text.substring(0, idx)}
      <strong className="font-bold text-[#C00078]">{text.substring(idx, idx + cleanQ.length)}</strong>
      {text.substring(idx + cleanQ.length)}
    </span>
  )
}

export default function SearchBar({
  searchQuery = '',
  setSearchQuery,
  onSelectSearch,
  isMobile = false,
  onCloseMobileSearch,
  placeholder = 'What are you looking for? (e.g. Cotton Kurta, Red Saree)',
  products = [],
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [apiSuggestions, setApiSuggestions] = useState(null)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Load recent searches from localStorage
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [isOpen])

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

  const trimmed = (searchQuery || '').trim()

  // Debounced API search suggestions (250-350ms frontend debounce)
  useEffect(() => {
    if (!trimmed) {
      setApiSuggestions(null)
      setIsLoadingSuggestions(false)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      return
    }

    setIsLoadingSuggestions(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(async () => {
      try {
        const data = await getSearchSuggestionsApi(trimmed, controller.signal)
        if (data) {
          setApiSuggestions(data)
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Autocomplete fetch error:', err)
        }
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed])

  // Dynamic Suggestion phrases from API or client fallback
  const dynamicSuggestions = apiSuggestions?.suggestions && apiSuggestions.suggestions.length > 0
    ? apiSuggestions.suggestions
    : trimmed
    ? [
        { text: trimmed, display: trimmed, type: 'keyword' },
        { text: `${trimmed} for women`, display: `${trimmed} for women`, type: 'audience' },
        { text: `silk ${trimmed}`, display: `Silk ${trimmed}`, type: 'fabric' },
        { text: `cotton ${trimmed}`, display: `Cotton ${trimmed}`, type: 'fabric' },
      ]
    : []

  const displayCategories =
    apiSuggestions?.categories && apiSuggestions.categories.length > 0
      ? apiSuggestions.categories
      : []

  const displaySubcategories =
    apiSuggestions?.subcategories && apiSuggestions.subcategories.length > 0
      ? apiSuggestions.subcategories
      : trimmed && Array.isArray(NAVIGATION_CATEGORIES)
      ? NAVIGATION_CATEGORIES.flatMap((cat) =>
          (cat.sections || []).flatMap((sec) =>
            (sec.items || [])
              .filter(
                (item) =>
                  typeof item === 'string' &&
                  item.toLowerCase().includes(trimmed.toLowerCase())
              )
              .map((item) => ({
                id: item,
                name: item,
                category: cat.name || '',
                count: null,
              }))
          )
        ).slice(0, 3)
      : []

  const displayBrands =
    apiSuggestions?.brands && apiSuggestions.brands.length > 0
      ? apiSuggestions.brands
      : []

  const matchingRecentSearches = trimmed
    ? recentSearches.filter((term) =>
        term.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 3)
    : []

  const handleClear = () => {
    setSearchQuery('')
    setApiSuggestions(null)
    inputRef.current?.focus()
  }

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    if (!trimmed) return
    const updated = saveRecentSearch(trimmed)
    setRecentSearches(updated)
    onSelectSearch({ type: 'query', query: trimmed })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectSuggestion = (phrase) => {
    const clean = phrase.trim()
    saveRecentSearch(clean)
    setSearchQuery(clean)
    onSelectSearch({ type: 'query', query: clean })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectRecent = (term) => {
    const updated = saveRecentSearch(term)
    setRecentSearches(updated)
    setSearchQuery(term)
    onSelectSearch({ type: 'query', query: term })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleRemoveRecent = (e, term) => {
    e.stopPropagation()
    const updated = removeRecentSearch(term)
    setRecentSearches(updated)
  }

  const handleClearAllRecent = (e) => {
    e.stopPropagation()
    clearRecentSearches()
    setRecentSearches([])
  }

  const handleSelectTrending = (term) => {
    const updated = saveRecentSearch(term)
    setRecentSearches(updated)
    setSearchQuery(term)
    onSelectSearch({ type: 'query', query: term })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectSubcategory = (item) => {
    const term = item.name || item.subcategory
    saveRecentSearch(term)
    onSelectSearch({
      type: 'subcategory',
      category: item.category || item.categoryName,
      subcategory: term,
    })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectCategory = (cat) => {
    saveRecentSearch(cat.name)
    onSelectSearch({
      type: 'query',
      query: cat.name,
    })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  const handleSelectBrand = (brand) => {
    saveRecentSearch(brand.name)
    onSelectSearch({
      type: 'query',
      query: brand.name,
    })
    setIsOpen(false)
    if (isMobile && onCloseMobileSearch) onCloseMobileSearch()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <form
        id={isMobile ? 'mobile-search-form' : 'desktop-search-form'}
        name="searchForm"
        role="search"
        onSubmit={handleSearchSubmit}
        className="relative flex items-center"
      >
        <div className="absolute left-3.5 pointer-events-none text-neutral-400">
          <Search className="w-4 h-4 transition-colors group-focus-within:text-black" />
        </div>

        <input
          ref={inputRef}
          id={isMobile ? 'mobile-search-input' : 'desktop-search-input'}
          name="searchQuery"
          type="text"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-neutral-100/90 hover:bg-neutral-100 focus:bg-white text-sm text-[#24212A] placeholder-neutral-500 pl-10 pr-10 py-2.5 rounded-full border border-neutral-200/60 focus:border-[#C00078] focus:outline-none focus:ring-2 focus:ring-[#C00078]/15 transition-all duration-200 shadow-xs"
          aria-label="Search garments, sarees, and boutiques"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        <div className="absolute right-3.5 flex items-center gap-1.5">
          {isLoadingSuggestions && (
            <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
          )}
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Suggested Search Phrases Dropdown on Focus */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* If user hasn't typed yet, show recent history, trending & popular categories */}
          {!trimmed && (
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 5 Recent Searches History */}
              {recentSearches.length > 0 && (
                <div className="pb-1">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C00078]" />
                      <span>Recent Searches</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAllRecent}
                      className="text-[11px] font-semibold text-neutral-400 hover:text-[#C00078] hover:underline cursor-pointer lowercase"
                    >
                      clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.slice(0, 5).map((term) => (
                      <div
                        key={term}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-[#FFF1F8]/80 hover:bg-[#FFF1F8] border border-[#F0E5EC] text-[#24212A] text-xs rounded-full transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectRecent(term)}
                          className="font-medium hover:text-[#C00078] cursor-pointer text-left"
                        >
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveRecent(e, term)}
                          className="text-neutral-400 hover:text-[#C00078] p-0.5 rounded-full hover:bg-neutral-200/50 cursor-pointer transition-colors"
                          title="Remove from history"
                          aria-label={`Remove ${term} from history`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending searches */}
              <div className={recentSearches.length > 0 ? 'border-t border-neutral-100 pt-3' : ''}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#C00078]" />
                  <span>Popular Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_SEARCHES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleSelectTrending(item)}
                      className="px-3 py-1.5 text-xs bg-neutral-100 hover:bg-[#FFF1F8] hover:border-[#C00078]/40 border border-transparent text-[#24212A] hover:text-[#C00078] rounded-full transition-all cursor-pointer font-medium"
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
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#FFF1F8]/50 text-left transition-colors group cursor-pointer border border-transparent hover:border-[#F0E5EC]"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#24212A] group-hover:text-[#C00078]">
                          {cat.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                          in {cat.category}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-[#C00078] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* When user has typed, show DYNAMIC SUGGESTIONS (NO product cards!) */}
          {trimmed && (
            <div className="p-3 max-h-[75vh] overflow-y-auto divide-y divide-neutral-100">
              {/* Matching Recent Searches */}
              {matchingRecentSearches.length > 0 && (
                <div className="pb-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-1">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    <span>Recent History</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 px-2">
                    {matchingRecentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSelectRecent(term)}
                        className="px-2.5 py-1 text-xs bg-[#FFF1F8] border border-[#F0E5EC] hover:bg-[#F0E5EC] text-[#24212A] rounded-full cursor-pointer flex items-center gap-1.5"
                      >
                        <Clock className="w-3 h-3 text-[#C00078]" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. Dynamic Search Phrase Suggestions (e.g. "saree", "saree for women", "silk saree") */}
              {dynamicSuggestions.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2.5 py-1">
                    <Search className="w-3 h-3 text-[#C00078]" />
                    <span>Suggestions</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dynamicSuggestions.map((item, idx) => (
                      <button
                        key={`sugg-${item.text}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSuggestion(item.text)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-[#FFF1F8] transition-colors text-left group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#C00078] shrink-0" />
                          <span className="text-[#24212A] group-hover:text-[#C00078] truncate text-[13px]">
                            {renderHighlighted(item.display || item.text, trimmed)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {item.type && item.type !== 'keyword' && (
                            <span className="text-[10px] text-neutral-400 bg-neutral-100 group-hover:bg-[#FFF1F8] px-2 py-0.5 rounded-full font-medium">
                              {item.type === 'audience' ? 'for audience' : item.type === 'category' ? 'in Category' : item.type === 'fabric' ? 'Fabric' : item.type === 'occasion' ? 'Occasion' : item.type === 'product' ? 'Product' : ''}
                            </span>
                          )}
                          <CornerDownLeft className="w-3 h-3 text-neutral-300 group-hover:text-[#C00078] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Matching Categories & Subcategories */}
              {(displayCategories.length > 0 || displaySubcategories.length > 0) && (
                <div className="py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2.5 py-1">
                    <Tag className="w-3.5 h-3.5 text-[#C00078]" />
                    <span>Categories &amp; Styles</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {displayCategories.map((c) => (
                      <button
                        key={`cat-${c.id}`}
                        type="button"
                        onClick={() => handleSelectCategory(c)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg hover:bg-[#FFF1F8] transition-colors text-left group cursor-pointer"
                      >
                        <span className="font-medium text-[#24212A] group-hover:text-[#C00078]">
                          {c.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-500 uppercase tracking-wider font-semibold">
                          Category {c.count ? `(${c.count})` : ''}
                        </span>
                      </button>
                    ))}
                    {displaySubcategories.map((item, idx) => (
                      <button
                        key={`sub-${item.id || item.name}-${idx}`}
                        type="button"
                        onClick={() => handleSelectSubcategory(item)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg hover:bg-[#FFF1F8] transition-colors text-left group cursor-pointer"
                      >
                        <span className="font-medium text-[#24212A] group-hover:text-[#C00078]">
                          {item.name || item.subcategory}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-500 uppercase tracking-wider font-semibold">
                          {item.category ? `${item.category} ` : ''}{item.count ? `(${item.count})` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Matching Brands / Designers */}
              {displayBrands.length > 0 && (
                <div className="py-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-2.5 py-1">
                    <Store className="w-3.5 h-3.5 text-[#C00078]" />
                    <span>Designers &amp; Boutiques</span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {displayBrands.map((b) => (
                      <button
                        key={`brand-${b.id}`}
                        type="button"
                        onClick={() => handleSelectBrand(b)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg hover:bg-[#FFF1F8] transition-colors text-left group cursor-pointer"
                      >
                        <span className="font-medium text-[#24212A] group-hover:text-[#C00078]">
                          {b.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-neutral-100 rounded text-neutral-500 font-semibold">
                          {b.count ? `${b.count} creations` : 'Designer'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dynamicSuggestions.length === 0 &&
                displayCategories.length === 0 &&
                displaySubcategories.length === 0 &&
                displayBrands.length === 0 && (
                  <div className="py-8 text-center text-neutral-500 text-xs">
                    No suggestions found for &ldquo;{searchQuery}&rdquo;.
                    <div className="mt-2 text-neutral-400 text-[11px]">
                      Press Enter or click below to search our entire catalogue.
                    </div>
                  </div>
                )}

              {/* View all search results button */}
              <div className="pt-2 px-1">
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="w-full py-2.5 bg-[#C00078] hover:bg-[#a00064] text-white font-medium rounded-full text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <span>Search store for &ldquo;{searchQuery}&rdquo;</span>
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
