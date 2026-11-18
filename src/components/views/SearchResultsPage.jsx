import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Zap,
  Scissors,
  Check,
  SlidersHorizontal,
  X,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  Tag,
  Store,
} from 'lucide-react'
import { isProductCustomizable, getSearchProductsApi, isProductActive } from '../../services/api'
import {
  matchProductQuery,
  scoreProductQuery,
  getProductFabrics,
  getProductColors,
} from '../../utils/searchUtils'

export default function SearchResultsPage({
  query = '',
  products = [],
  allCategories = [],
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
}) {
  const [searchTerm, setSearchTerm] = useState(query)
  const [activeQuery, setActiveQuery] = useState(query)
  const [sortBy, setSortBy] = useState('recommended')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 24

  // Filter States
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedSubcategories, setSelectedSubcategories] = useState([])
  const [selectedBrands, setSelectedBrands] = useState([])
  const [selectedFabrics, setSelectedFabrics] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [productType, setProductType] = useState('') // 'customizable' | 'ready_made' | ''
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [minRating, setMinRating] = useState('')

  // Accordion toggle states for desktop sidebar
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    subcategories: true,
    fabrics: true,
    colors: true,
    sizes: true,
    occasions: true,
    brands: true,
    price: true,
    product_type: true,
    rating: true,
  })

  // Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  // API Data & Loading State
  const [apiResult, setApiResult] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const topRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Sync internal search when prop query changes
  useEffect(() => {
    setSearchTerm(query)
    setActiveQuery(query)
    setCurrentPage(1)
  }, [query])

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Fetch search products with dynamic facets from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const params = {
      q: activeQuery,
      sort: sortBy,
      page: currentPage,
      limit: itemsPerPage,
    }

    if (selectedCategories.length > 0) params.category_id = selectedCategories.join(',')
    if (selectedSubcategories.length > 0) params.subcategory_id = selectedSubcategories.join(',')
    if (selectedBrands.length > 0) params.brand_id = selectedBrands.join(',')
    if (selectedFabrics.length > 0) params.fabric = selectedFabrics.join(',')
    if (selectedColors.length > 0) params.color = selectedColors.join(',')
    if (selectedSizes.length > 0) params.size = selectedSizes.join(',')
    if (selectedOccasions.length > 0) params.occasion = selectedOccasions.join(',')
    if (productType) params.product_type = productType
    if (priceRange.min !== '') params.min_price = priceRange.min
    if (priceRange.max !== '') params.max_price = priceRange.max
    if (minRating) params.rating = minRating

    try {
      const data = await getSearchProductsApi(params, controller.signal)
      if (data) {
        setApiResult(data)
      } else {
        // Fallback to client-side derivation if API is unreachable
        deriveClientFallback()
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Search fetch error, using client fallback:', err)
        deriveClientFallback()
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    activeQuery,
    sortBy,
    currentPage,
    selectedCategories,
    selectedSubcategories,
    selectedBrands,
    selectedFabrics,
    selectedColors,
    selectedSizes,
    selectedOccasions,
    productType,
    priceRange,
    minRating,
  ])

  // Fallback client-side search logic if offline
  const deriveClientFallback = () => {
    const rawList = Array.isArray(products) ? products : []
    let filtered = rawList.filter((p) => matchProductQuery(p, activeQuery))

    if (selectedFabrics.length > 0) {
      filtered = filtered.filter((p) => {
        const pF = getProductFabrics(p).map((f) => f.toLowerCase())
        return selectedFabrics.some((sf) => pF.includes(sf.toLowerCase()))
      })
    }
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) => {
        const pC = getProductColors(p).map((c) => c.toLowerCase())
        return selectedColors.some((sc) => pC.includes(sc.toLowerCase()))
      })
    }
    if (productType === 'customizable') {
      filtered = filtered.filter((p) => isProductCustomizable(p))
    } else if (productType === 'ready_made') {
      filtered = filtered.filter((p) => !isProductCustomizable(p))
    }

    if (sortBy === 'price-low') {
      filtered.sort((a, b) => Number(a.price || a.discount_price || 0) - Number(b.price || b.discount_price || 0))
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => Number(b.price || b.discount_price || 0) - Number(a.price || a.discount_price || 0))
    } else if (sortBy === 'new_arrivals') {
      filtered.sort((a, b) => (b.id || 0) - (a.id || 0))
    }

    const total = filtered.length
    const offset = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(offset, offset + itemsPerPage)

    setApiResult({
      products: paginated,
      total,
      page: currentPage,
      limit: itemsPerPage,
      total_pages: Math.ceil(total / itemsPerPage),
      filters: {
        categories: [],
        subcategories: [],
        brands: [],
        fabrics: [],
        colors: [],
        sizes: [],
        occasions: [],
        product_types: [
          { type: 'customizable', name: 'Customizable', count: total },
          { type: 'ready_made', name: 'Ready to Wear', count: total },
        ],
        price_range: { min: 200, max: 5000 },
        context: { is_saree: false, is_non_clothing: false },
      },
    })
  }

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Reset page when any filter changes
  const handleFilterChange = (setter, val) => {
    setCurrentPage(1)
    setter(val)
  }

  const toggleArrayItem = (list, setList, item) => {
    setCurrentPage(1)
    if (list.includes(item)) {
      setList(list.filter((x) => x !== item))
    } else {
      setList([...list, item])
    }
  }

  // Clear all filters
  const handleClearAll = () => {
    setSelectedCategories([])
    setSelectedSubcategories([])
    setSelectedBrands([])
    setSelectedFabrics([])
    setSelectedColors([])
    setSelectedSizes([])
    setSelectedOccasions([])
    setProductType('')
    setPriceRange({ min: '', max: '' })
    setMinRating('')
    setCurrentPage(1)
  }

  // Active filter chips calculation
  const activeChips = []
  selectedCategories.forEach((catId) => {
    const catObj = apiResult?.filters?.categories?.find((c) => String(c.id) === String(catId) || String(c.id).split(',').includes(String(catId)))
    activeChips.push({
      id: `cat-${catId}`,
      label: `Category: ${catObj?.name || catId}`,
      remove: () => setSelectedCategories(selectedCategories.filter((id) => id !== catId)),
    })
  })
  selectedSubcategories.forEach((subId) => {
    const subObj = apiResult?.filters?.subcategories?.find((s) => String(s.id) === String(subId) || String(s.id).split(',').includes(String(subId)))
    activeChips.push({
      id: `sub-${subId}`,
      label: `Style: ${subObj?.name || subId}`,
      remove: () => setSelectedSubcategories(selectedSubcategories.filter((id) => id !== subId)),
    })
  })
  selectedBrands.forEach((bId) => {
    const bObj = apiResult?.filters?.brands?.find((b) => String(b.id) === String(bId))
    activeChips.push({
      id: `brand-${bId}`,
      label: `Designer: ${bObj?.name || bId}`,
      remove: () => setSelectedBrands(selectedBrands.filter((id) => id !== bId)),
    })
  })
  selectedFabrics.forEach((fab) => {
    activeChips.push({
      id: `fab-${fab}`,
      label: `Fabric: ${fab}`,
      remove: () => setSelectedFabrics(selectedFabrics.filter((f) => f !== fab)),
    })
  })
  selectedColors.forEach((col) => {
    activeChips.push({
      id: `col-${col}`,
      label: `Color: ${col}`,
      remove: () => setSelectedColors(selectedColors.filter((c) => c !== col)),
    })
  })
  selectedSizes.forEach((sz) => {
    activeChips.push({
      id: `size-${sz}`,
      label: `Size: ${sz}`,
      remove: () => setSelectedSizes(selectedSizes.filter((s) => s !== sz)),
    })
  })
  selectedOccasions.forEach((occ) => {
    activeChips.push({
      id: `occ-${occ}`,
      label: `Occasion: ${occ}`,
      remove: () => setSelectedOccasions(selectedOccasions.filter((o) => o !== occ)),
    })
  })
  if (productType) {
    activeChips.push({
      id: 'ptype',
      label: productType === 'customizable' ? 'Type: Customizable' : 'Type: Ready to Wear',
      remove: () => setProductType(''),
    })
  }
  if (priceRange.min !== '' || priceRange.max !== '') {
    activeChips.push({
      id: 'price',
      label: `Price: ₹${priceRange.min || 0} - ₹${priceRange.max || 'Max'}`,
      remove: () => setPriceRange({ min: '', max: '' }),
    })
  }
  if (minRating) {
    activeChips.push({
      id: 'rating',
      label: `Rating: ${minRating}★ & above`,
      remove: () => setMinRating(''),
    })
  }

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    if (searchTerm.trim() !== activeQuery) {
      setActiveQuery(searchTerm.trim())
      setCurrentPage(1)
    }
  }

  const displayedProducts = (apiResult?.products || []).filter(isProductActive)
  const totalCount = apiResult?.total || 0
  const totalPages = apiResult?.total_pages || 1
  const filtersData = apiResult?.filters || {}
  const isSaree = filtersData?.context?.is_saree || false
  const isNonClothing = filtersData?.context?.is_non_clothing || false

  // Render Filter Content (Shared between Desktop Sidebar and Mobile Drawer)
  const renderFilterOptions = () => (
    <div className="space-y-6 text-sm">
      {/* 1. Category Filter */}
      {filtersData.categories && filtersData.categories.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Category</span>
            {expandedSections.categories ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.categories && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filtersData.categories.map((c) => {
                const isSelected = selectedCategories.includes(String(c.id))
                return (
                  <label
                    key={`cat-${c.id}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedCategories, setSelectedCategories, String(c.id))}
                        className="w-3.5 h-3.5 rounded text-[#C00078] focus:ring-[#C00078] border-neutral-300"
                      />
                      <span>{c.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({c.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Subcategory / Saree Style Filter */}
      {filtersData.subcategories && filtersData.subcategories.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('subcategories')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>{isSaree ? 'Saree Style' : 'Subcategory'}</span>
            {expandedSections.subcategories ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.subcategories && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filtersData.subcategories.map((sc) => {
                const isSelected = selectedSubcategories.some(
                  (sel) =>
                    String(sel) === String(sc.id) ||
                    String(sc.id).split(',').includes(String(sel)) ||
                    String(sel).split(',').includes(String(sc.id))
                )
                return (
                  <label
                    key={`sc-${sc.id}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedSubcategories, setSelectedSubcategories, String(sc.id))}
                        className="w-3.5 h-3.5 rounded text-[#C00078] focus:ring-[#C00078] border-neutral-300"
                      />
                      <span>{sc.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({sc.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Fabric Filter (pruned for non-clothing) */}
      {!isNonClothing && filtersData.fabrics && filtersData.fabrics.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('fabrics')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Fabric / Material</span>
            {expandedSections.fabrics ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.fabrics && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filtersData.fabrics.map((f) => {
                const isSelected = selectedFabrics.includes(f.name)
                return (
                  <label
                    key={`fab-${f.name}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedFabrics, setSelectedFabrics, f.name)}
                        className="w-3.5 h-3.5 rounded text-[#C00078] focus:ring-[#C00078] border-neutral-300"
                      />
                      <span>{f.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({f.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. Color Filter */}
      {filtersData.colors && filtersData.colors.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Color</span>
            {expandedSections.colors ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.colors && (
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {filtersData.colors.map((c) => {
                const isSelected = selectedColors.includes(c.name)
                return (
                  <label
                    key={`col-${c.name}`}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078] font-bold'
                        : 'border-[#F0E5EC] hover:bg-neutral-50 text-[#24212A]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleArrayItem(selectedColors, setSelectedColors, c.name)}
                      className="sr-only"
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                      style={{
                        backgroundColor: c.name.toLowerCase() === 'multicolor' ? '#ddd' : c.name.toLowerCase(),
                      }}
                    />
                    <span className="truncate flex-1">{c.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">({c.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Size Filter (pruned for non-clothing and sarees) */}
      {!isNonClothing && !isSaree && filtersData.sizes && filtersData.sizes.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Size</span>
            {expandedSections.sizes ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.sizes && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {filtersData.sizes.map((s) => {
                const isSelected = selectedSizes.includes(s.name)
                return (
                  <button
                    key={`size-${s.name}`}
                    type="button"
                    onClick={() => toggleArrayItem(selectedSizes, setSelectedSizes, s.name)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-all ${
                      isSelected
                        ? 'border-[#C00078] bg-[#C00078] text-white shadow-sm'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                    }`}
                  >
                    {s.name} <span className="opacity-70 text-[10px]">({s.count})</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Occasion Filter (pruned for non-clothing) */}
      {!isNonClothing && filtersData.occasions && filtersData.occasions.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('occasions')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Occasion</span>
            {expandedSections.occasions ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.occasions && (
            <div className="mt-2.5 space-y-1.5">
              {filtersData.occasions.map((o) => {
                const isSelected = selectedOccasions.includes(o.name)
                return (
                  <label
                    key={`occ-${o.name}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedOccasions, setSelectedOccasions, o.name)}
                        className="w-3.5 h-3.5 rounded text-[#C00078] focus:ring-[#C00078] border-neutral-300"
                      />
                      <span>{o.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({o.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Brand / Designer Filter */}
      {filtersData.brands && filtersData.brands.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('brands')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Designer / Brand</span>
            {expandedSections.brands ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.brands && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filtersData.brands.map((b) => {
                const isSelected = selectedBrands.includes(String(b.id))
                return (
                  <label
                    key={`brand-${b.id}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedBrands, setSelectedBrands, String(b.id))}
                        className="w-3.5 h-3.5 rounded text-[#C00078] focus:ring-[#C00078] border-neutral-300"
                      />
                      <span className="truncate max-w-[150px]">{b.name}</span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({b.count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. Product Type: Ready-Made vs Customizable */}
      {filtersData.product_types && filtersData.product_types.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('product_type')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
          >
            <span>Product Type</span>
            {expandedSections.product_type ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>
          {expandedSections.product_type && (
            <div className="mt-2.5 space-y-1.5">
              <label className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="product_type"
                    checked={productType === ''}
                    onChange={() => handleFilterChange(setProductType, '')}
                    className="w-3.5 h-3.5 text-[#C00078] focus:ring-[#C00078]"
                  />
                  <span>All Types</span>
                </div>
              </label>
              {filtersData.product_types.map((pt) => (
                <label
                  key={`pt-${pt.type}`}
                  className="flex items-center justify-between text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1 select-none"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="product_type"
                      checked={productType === pt.type}
                      onChange={() => handleFilterChange(setProductType, pt.type)}
                      className="w-3.5 h-3.5 text-[#C00078] focus:ring-[#C00078]"
                    />
                    <span>{pt.name}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">({pt.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. Price Range Filter */}
      <div className="border-b border-[#F0E5EC] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
        >
          <span>Price Range</span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>
        {expandedSections.price && (
          <div className="mt-2.5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Min (₹)</label>
                <input
                  type="number"
                  placeholder={filtersData?.price_range?.min || 0}
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:border-[#C00078] focus:outline-none"
                />
              </div>
              <span className="text-neutral-400 pt-3">-</span>
              <div className="flex-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">Max (₹)</label>
                <input
                  type="number"
                  placeholder={filtersData?.price_range?.max || 5000}
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-lg focus:border-[#C00078] focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="w-full py-1.5 bg-[#FFF1F8] border border-[#F8D4E8] text-[#C00078] rounded-lg text-xs font-semibold hover:bg-[#F8D4E8] transition-colors cursor-pointer"
            >
              Apply Price
            </button>
          </div>
        )}
      </div>

      {/* 10. Rating Filter */}
      <div className="pb-2">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[#C00078] transition-colors"
        >
          <span>Customer Rating</span>
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>
        {expandedSections.rating && (
          <div className="mt-2.5 space-y-1">
            {[4.5, 4.0, 3.5].map((r) => (
              <label
                key={`rating-${r}`}
                className="flex items-center gap-2 text-xs text-[#24212A] hover:text-[#C00078] cursor-pointer py-1"
              >
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === String(r)}
                  onChange={() => handleFilterChange(setMinRating, minRating === String(r) ? '' : String(r))}
                  className="w-3.5 h-3.5 text-[#C00078] focus:ring-[#C00078]"
                />
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{r}★ &amp; above</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div ref={topRef} className="min-h-screen bg-[#FBF9FA] text-[#24212A] pb-16">
      {/* 1. Header Banner & Breadcrumb */}
      <div className="bg-white border-b border-[#F0E5EC] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Back button & Breadcrumb */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                  title="Go Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <nav className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="hover:text-black cursor-pointer" onClick={onBack}>
                  Home
                </span>
                <span>›</span>
                <span className="text-[#C00078] font-semibold">
                  {activeQuery ? `"${activeQuery}"` : 'All Products'}
                </span>
              </nav>
            </div>

            {/* Right: Quick Search Box & Result Count */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Refine search..."
                  className="w-full bg-neutral-100/80 focus:bg-white text-xs pl-8 pr-7 py-1.5 rounded-full border border-neutral-200/80 focus:border-[#C00078] focus:outline-none transition-all"
                />
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2 pointer-events-none" />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Title Bar & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#F0E5EC]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#24212A] tracking-normal">
              {activeQuery ? (
                <>
                  Search Results for <span className="text-[#C00078] italic">&ldquo;{activeQuery}&rdquo;</span>
                </>
              ) : (
                'Explore Bespoke Creations'
              )}
            </h1>
            <p className="text-xs sm:text-sm text-[#77717C] mt-1">
              Showing {totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–
              {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} authentic atelier creations
            </p>
          </div>

          {/* Controls: Mobile Filter Button & Sort Dropdown */}
          <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
            {/* Mobile Filter Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-white border border-[#F0E5EC] rounded-full text-xs font-semibold text-[#24212A] hover:bg-[#FFF1F8] transition-colors shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C00078]" />
              <span>Filters</span>
              {activeChips.length > 0 && (
                <span className="w-4 h-4 bg-[#C00078] text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                  {activeChips.length}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-white border border-[#F0E5EC] text-xs font-medium text-[#24212A] rounded-full px-3 py-2 pr-8 focus:border-[#C00078] focus:outline-none cursor-pointer shadow-xs"
              >
                <option value="recommended">Recommended (Relevance)</option>
                <option value="popularity">Popularity</option>
                <option value="new_arrivals">New Arrivals</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="highest_discount">Highest Discount</option>
                <option value="highest_rating">Highest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Active Filter Chips */}
        {activeChips.length > 0 && (
          <div className="py-3 flex flex-wrap items-center gap-2 border-b border-[#F0E5EC]/80 animate-in fade-in">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Active Filters:
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF1F8] border border-[#F8D4E8] text-[#C00078] text-xs rounded-full font-medium shadow-2xs"
              >
                <span>{chip.label}</span>
                <button
                  type="button"
                  onClick={chip.remove}
                  className="hover:text-black hover:bg-[#F8D4E8] rounded-full p-0.5 transition-colors cursor-pointer"
                  title="Remove filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-neutral-500 hover:text-[#C00078] hover:underline cursor-pointer ml-2 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}

        {/* 3. Main Body: Desktop Sidebar + Product Grid */}
        <div className="pt-6 grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Left Sidebar (1/4 width) */}
          <aside className="hidden lg:block lg:col-span-1 bg-white p-5 rounded-2xl border border-[#F0E5EC] shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0E5EC] mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C00078]" />
                <h2 className="font-semibold text-sm text-[#24212A] tracking-normal">
                  Refine Search
                </h2>
              </div>
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-[#C00078] hover:underline cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>
            {renderFilterOptions()}
          </aside>

          {/* Right Column: Product Grid & Pagination (3/4 width) */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 text-[#C00078] animate-spin mb-3" />
                <p className="text-sm font-medium text-[#77717C]">Finding bespoke creations...</p>
              </div>
            ) : displayedProducts.length === 0 ? (
              /* Empty State */
              <div className="bg-white rounded-2xl border border-[#F0E5EC] p-10 sm:p-14 text-center shadow-xs">
                <div className="w-16 h-16 bg-[#FFF1F8] border border-[#F8D4E8] rounded-full flex items-center justify-center mx-auto mb-4 text-[#C00078]">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-[#24212A] mb-1">
                  No matching creations found
                </h3>
                <p className="text-xs sm:text-sm text-[#77717C] max-w-md mx-auto mb-6">
                  We couldn&apos;t find any products matching your current search and filter criteria.
                  Try broader terms or clearing active filters.
                </p>
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-5 py-2.5 bg-[#C00078] hover:bg-[#a00064] text-white rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear All Filters</span>
                  </button>
                )}
                {/* Helpful suggestions */}
                <div className="mt-8 pt-6 border-t border-[#F0E5EC] text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Popular searches to try:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Silk Saree', 'Cotton Kurta', 'Banarasi Saree', 'Black Tshirt', 'Modern Frock'].map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setSearchTerm(term)
                          setActiveQuery(term)
                          handleClearAll()
                        }}
                        className="px-3 py-1 bg-neutral-100 hover:bg-[#FFF1F8] hover:text-[#C00078] text-xs rounded-full text-[#24212A] transition-colors font-medium cursor-pointer"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Responsive Product Grid */
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {displayedProducts.map((p) => {
                    const isWishlisted = wishlistIds.some((id) => String(id) === String(p.id))
                    const targetMatId = p.material_id || p.variant_id || p.selectedMaterialId || null
                    const isInCart = cartItems.some((ci) => {
                      const sameProd = String(ci.id) === String(p.id) || String(ci.product_id) === String(p.id)
                      if (!sameProd) return false
                      if (targetMatId) {
                        const itemMatId = ci.material_id || ci.materialId || null
                        if (itemMatId && String(itemMatId) !== String(targetMatId)) return false
                      }
                      return true
                    })
                    const isCustomizable = isProductCustomizable(p)
                    const pPrice = Number(p.effective_price || p.price || 499)
                    const pOriginalPrice = Number(p.original_price || pPrice)
                    const pDiscount = Number(p.discount_percentage || (pOriginalPrice > pPrice ? Math.round(((pOriginalPrice - pPrice) / pOriginalPrice) * 100) : 0))

                    return (
                      <div
                        key={p.unique_id || `search-prod-${p.id}-${p.variant_id || p.material_id || 0}`}
                        onClick={() => onSelectProduct && onSelectProduct(p)}
                        className="group bg-white rounded-2xl border border-[#F0E5EC] overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer relative"
                      >
                        {/* Image Container with Badges & Wishlist */}
                        <div className="relative aspect-3/4 bg-neutral-100 overflow-hidden">
                          <img
                            src={p.image || p.main_image}
                            alt={p.product_name || p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            onError={(e) => {
                              e.target.src =
                                'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
                            }}
                          />

                          {/* Wishlist Heart Button */}
                          {onToggleWishlist && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleWishlist(p)
                              }}
                              className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all z-10 ${
                                isWishlisted
                                  ? 'bg-white text-rose-600 shadow-md scale-110'
                                  : 'bg-white/80 hover:bg-white text-neutral-600 hover:text-rose-600 shadow-xs'
                              }`}
                              title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-600' : ''}`}
                              />
                            </button>
                          )}

                          {/* Customizable Tag */}
                          {isCustomizable && (
                            <div className="absolute top-2.5 left-2.5 z-10">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#C00078] bg-white/95 backdrop-blur-md border border-[#F8D4E8] px-2 py-0.5 rounded-full shadow-xs">
                                <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                                <span>Customizable</span>
                              </span>
                            </div>
                          )}

                          {/* Hover Action Overlay (Add to Bag & Buy Now) */}
                          <div className="absolute inset-x-2 bottom-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex gap-1.5">
                            {isInCart ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onOpenCart) onOpenCart()
                                }}
                                className="flex-1 h-8 bg-emerald-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md hover:bg-emerald-700 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>In Bag</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onAddToCart) {
                                    onAddToCart({
                                      id: p.id,
                                      product_id: p.id,
                                      material_id: p.material_id || p.variant_id || p.selectedMaterialId,
                                      materialId: p.material_id || p.variant_id || p.selectedMaterialId,
                                      price_id: p.price_id || p.priceId,
                                      priceId: p.price_id || p.priceId,
                                      title: p.title || p.product_name,
                                      product_name: p.product_name || p.title,
                                      price: pPrice,
                                      original_price: pOriginalPrice,
                                      image: p.image || p.main_image,
                                      color: p.color,
                                      fabric: p.fabric,
                                      vendor: p.brand || p.shop_name || 'Bespoke',
                                      size: p.size || (p.sizes && p.sizes[0]) || 'Standard',
                                    })
                                  }
                                }}
                                className="flex-1 h-8 bg-[#C00078] hover:bg-[#a00064] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md transition-colors"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                <span>Add to Bag</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onBuyNow) onBuyNow(p)
                                else if (onSelectProduct) onSelectProduct(p)
                              }}
                              className="flex-1 h-8 bg-black/90 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 shadow-md backdrop-blur-md transition-colors"
                            >
                              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>

                        {/* Product Card Details */}
                        <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            {/* Brand / Designer & Rating */}
                            <div className="flex items-center justify-between text-xs text-[#77717C] mb-1">
                              <span className="font-medium truncate max-w-[140px]" title={p.shop_name || p.vendor?.shop_name || p.vendor_name || p.brand || 'Bespoke Atelier'}>
                                {p.shop_name || p.vendor?.shop_name || p.vendor_name || p.brand || 'Bespoke Atelier'}
                              </span>
                              <span className="flex items-center gap-0.5 text-neutral-800 font-semibold text-[11px]">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span>{Number(p.rating || 4.8).toFixed(1)}</span>
                              </span>
                            </div>

                            {/* Product Title */}
                            <h3
                              className="text-[14.5px] font-medium text-[#24212A] line-clamp-2 leading-snug group-hover:text-[#C00078] transition-colors"
                              title={p.product_name || p.title}
                            >
                              {p.product_name || p.title}
                            </h3>

                            {/* Category, Fabrics & Colors metadata */}
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {p.fabric && (
                                <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                  {p.fabric}
                                </span>
                              )}
                              {p.color && (
                                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                                  {p.color}
                                </span>
                              )}
                              {p.subcategory_name && (
                                <span className="text-[10px] text-neutral-400">
                                  • {p.subcategory_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Mobile Actions */}
                          <div className="pt-3 border-t border-[#F0E5EC] mt-3 flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-[17px] font-bold text-[#C00078] tabular-nums leading-none">
                                ₹{pPrice}
                              </span>
                              {pOriginalPrice > pPrice && (
                                <span className="text-xs text-neutral-400 line-through tabular-nums leading-none">
                                  ₹{pOriginalPrice}
                                </span>
                              )}
                              {pDiscount > 0 && (
                                <span className="text-[10.5px] font-semibold text-[#C00078] bg-[#FFF5FA] border border-[#F0E5EC] px-1.5 py-0.5 rounded leading-none">
                                  {pDiscount}% OFF
                                </span>
                              )}
                            </div>

                            {/* Mobile Bag icon */}
                            <div className="sm:hidden">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onAddToCart) {
                                    onAddToCart({
                                      id: p.id,
                                      product_id: p.id,
                                      material_id: p.material_id || p.variant_id || p.selectedMaterialId,
                                      materialId: p.material_id || p.variant_id || p.selectedMaterialId,
                                      price_id: p.price_id || p.priceId,
                                      priceId: p.price_id || p.priceId,
                                      title: p.title || p.product_name,
                                      product_name: p.product_name || p.title,
                                      price: pPrice,
                                      original_price: pOriginalPrice,
                                      image: p.image || p.main_image,
                                      color: p.color,
                                      fabric: p.fabric,
                                      vendor: p.brand || p.shop_name || 'Bespoke',
                                      size: p.size || (p.sizes && p.sizes[0]) || 'Standard',
                                    })
                                  }
                                }}
                                className="p-2 bg-[#FFF1F8] text-[#C00078] rounded-full hover:bg-[#C00078] hover:text-white transition-colors"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 4. Pagination (24 items per page) */}
                {totalPages > 1 && (
                  <div className="pt-10 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-2 bg-white border border-[#F0E5EC] text-xs font-semibold text-[#24212A] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const isCurrent = page === currentPage
                        // Window pagination around current page
                        if (
                          totalPages > 7 &&
                          Math.abs(page - currentPage) > 2 &&
                          page !== 1 &&
                          page !== totalPages
                        ) {
                          if (Math.abs(page - currentPage) === 3) {
                            return (
                              <span key={`dots-${page}`} className="px-1 text-neutral-400 text-xs">
                                ...
                              </span>
                            )
                          }
                          return null
                        }

                        return (
                          <button
                            key={`page-${page}`}
                            type="button"
                            onClick={() => handlePageChange(page)}
                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                              isCurrent
                                ? 'bg-[#C00078] text-white shadow-md'
                                : 'bg-white border border-[#F0E5EC] text-[#24212A] hover:bg-[#FFF1F8] hover:text-[#C00078]'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-2 bg-white border border-[#F0E5EC] text-xs font-semibold text-[#24212A] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 5. Mobile Filter Drawer (Slide-Over) */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#F0E5EC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C00078]" />
                <h3 className="font-semibold text-sm text-[#24212A] tracking-normal">
                  Filters
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 text-neutral-400 hover:text-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto p-5">{renderFilterOptions()}</div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-[#F0E5EC] bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex-1 py-2.5 border border-[#F0E5EC] text-[#24212A] rounded-full text-xs font-bold hover:bg-neutral-50 transition-colors"
              >
                Reset All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-2.5 bg-[#C00078] hover:bg-[#a00064] text-white rounded-full text-xs font-bold shadow-md transition-colors"
              >
                Apply Filters ({totalCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
