import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Heart,
  ShoppingBag,
  Zap,
  Check,
  Scissors,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { isProductCustomizable, isProductActive } from '../../services/api'

// Helper to normalize and infer product attributes for filters
function getProductAttributes(product) {
  const pSizes = Array.isArray(product.sizes) ? product.sizes : []
  const pFabrics = Array.isArray(product.fabrics)
    ? product.fabrics
    : product.fabric
    ? [product.fabric]
    : []
  const pColors = Array.isArray(product.colors)
    ? product.colors
    : product.color
    ? [product.color]
    : []
  const pOccasions = Array.isArray(product.occasions)
    ? product.occasions
    : product.occasion
    ? [product.occasion]
    : []

  const text = `${product.product_name || product.title || ''} ${product.description || ''} ${
    product.category || ''
  } ${product.subcategory || ''}`.toLowerCase()

  const fabrics = [...pFabrics]
  const colors = [...pColors]
  const occasions = [...pOccasions]
  const sizes = [...pSizes]

  const KNOWN_FABRICS = [
    'Cotton',
    'Silk',
    'Polyester',
    'Linen',
    'Georgette',
    'Chiffon',
    'Rayon',
    'Velvet',
    'Satin',
    'Tulle',
    'Denim',
  ]
  KNOWN_FABRICS.forEach((f) => {
    if (text.includes(f.toLowerCase()) && !fabrics.includes(f)) {
      fabrics.push(f)
    }
  })
  if (fabrics.length === 0) fabrics.push('Cotton')

  const KNOWN_COLORS = [
    'Black',
    'White',
    'Red',
    'Blue',
    'Green',
    'Yellow',
    'Pink',
    'Maroon',
    'Beige',
    'Gold',
  ]
  KNOWN_COLORS.forEach((c) => {
    if (text.includes(c.toLowerCase()) && !colors.includes(c)) {
      colors.push(c)
    }
  })
  if (colors.length === 0) colors.push('Multicolor')

  if (text.includes('wedding') || text.includes('bridal') || text.includes('banarasi')) {
    if (!occasions.includes('Wedding')) occasions.push('Wedding')
  }
  if (
    text.includes('festival') ||
    text.includes('festive') ||
    text.includes('traditional') ||
    text.includes('saree')
  ) {
    if (!occasions.includes('Festive')) occasions.push('Festive')
  }
  if (text.includes('party') || text.includes('evening') || text.includes('celebration')) {
    if (!occasions.includes('Party')) occasions.push('Party')
  }
  if (
    text.includes('formal') ||
    text.includes('boardroom') ||
    text.includes('office') ||
    text.includes('button-down')
  ) {
    if (!occasions.includes('Formal')) occasions.push('Formal')
  }
  if (
    text.includes('casual') ||
    text.includes('t shirt') ||
    text.includes('tshirt') ||
    text.includes('shirt') ||
    text.includes('cup') ||
    occasions.length === 0
  ) {
    if (!occasions.includes('Casual')) occasions.push('Casual')
  }

  // Gender normalization
  let gender = (product.gender || '').toLowerCase()
  if (!gender || gender === 'null') {
    if (text.includes('mens') || text.includes('men') || text.includes('boy')) gender = 'male'
    else if (
      text.includes('women') ||
      text.includes('ladies') ||
      text.includes('saree') ||
      text.includes('dress') ||
      text.includes('girl')
    )
      gender = 'female'
    else if (text.includes('kids') || text.includes('child')) gender = 'kids'
    else gender = 'unisex'
  }

  const price = parseFloat(product.discount_price || product.actual_price || product.price || 0)

  return {
    fabrics,
    colors,
    occasions,
    sizes,
    gender,
    price,
  }
}

// Master filter definitions
const FABRIC_OPTIONS = [
  'Cotton',
  'Silk',
  'Polyester',
  'Linen',
  'Georgette',
  'Chiffon',
  'Rayon',
  'Velvet',
  'Satin',
  'Tulle',
]

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'FREE SIZE', 'Standard']

const COLOR_OPTIONS = [
  { name: 'Black', hex: '#18181b', border: '#27272a' },
  { name: 'White', hex: '#ffffff', border: '#e4e4e7' },
  { name: 'Red', hex: '#dc2626', border: '#ef4444' },
  { name: 'Blue', hex: '#2563eb', border: '#3b82f6' },
  { name: 'Green', hex: '#16a34a', border: '#22c55e' },
  { name: 'Yellow', hex: '#eab308', border: '#facc15' },
  { name: 'Pink', hex: '#ec4899', border: '#f472b6' },
  { name: 'Maroon', hex: '#881337', border: '#9f1239' },
  { name: 'Beige', hex: '#d4b996', border: '#c4a47c' },
  { name: 'Gold', hex: '#d97706', border: '#b45309' },
]

const PRICE_PRESETS = [
  { id: 'under-500', label: 'Under ₹500' },
  { id: '500-1000', label: '₹500 - ₹1,000' },
  { id: '1000-2500', label: '₹1,000 - ₹2,500' },
  { id: 'above-2500', label: '₹2,500 & Above' },
]

const GENDER_OPTIONS = [
  { id: 'women', label: 'Women' },
  { id: 'men', label: 'Men' },
  { id: 'kids', label: 'Kids' },
  { id: 'unisex', label: 'Unisex' },
]

const OCCASION_OPTIONS = ['Festive', 'Wedding', 'Casual', 'Party', 'Formal']

export default function ExploreProductsSection({
  products = [],
  wishlistIds = [],
  onToggleWishlist,
  onAddToCart,
  onSelectProduct,
  cartItems = [],
  onOpenCart,
  onBuyNow,
}) {
  // Sidebar open state (initially closed, opens when user clicks "Filters")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Collapsible filter categories inside sidebar (initially all closed, opens only when clicked)
  const [openSections, setOpenSections] = useState({
    gender: false,
    price: false,
    fabric: false,
    size: false,
    color: false,
    occasion: false,
  })

  const toggleSection = (key) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Filter States
  const [selectedFabric, setSelectedFabric] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedPriceRange, setSelectedPriceRange] = useState('')
  const [customPriceMin, setCustomPriceMin] = useState('')
  const [customPriceMax, setCustomPriceMax] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedOccasion, setSelectedOccasion] = useState('')

  // Filtered Products Calculation (strictly active products only)
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (!isProductActive(product)) return false
      const attrs = getProductAttributes(product)

      // 1. Fabric Filter
      if (
        selectedFabric &&
        !attrs.fabrics.some((f) => f.toLowerCase() === selectedFabric.toLowerCase())
      ) {
        return false
      }

      // 2. Size Filter
      if (
        selectedSize &&
        !attrs.sizes.some((s) => s.toLowerCase() === selectedSize.toLowerCase())
      ) {
        return false
      }

      // 3. Color Filter
      if (
        selectedColor &&
        !attrs.colors.some((c) => c.toLowerCase() === selectedColor.toLowerCase())
      ) {
        return false
      }

      // 4. Gender Filter
      if (selectedGender) {
        const g = selectedGender.toLowerCase()
        if (g === 'men' && attrs.gender !== 'male' && attrs.gender !== 'men') return false
        if (g === 'women' && attrs.gender !== 'female' && attrs.gender !== 'women') return false
        if (g === 'kids' && attrs.gender !== 'kids' && attrs.gender !== 'children') return false
        if (g === 'unisex' && attrs.gender !== 'unisex') return false
      }

      // 5. Occasion Filter
      if (
        selectedOccasion &&
        !attrs.occasions.some((o) => o.toLowerCase() === selectedOccasion.toLowerCase())
      ) {
        return false
      }

      // 6. Price Filter
      if (selectedPriceRange) {
        if (selectedPriceRange === 'under-500' && attrs.price >= 500) return false
        if (selectedPriceRange === '500-1000' && (attrs.price < 500 || attrs.price > 1000))
          return false
        if (selectedPriceRange === '1000-2500' && (attrs.price < 1000 || attrs.price > 2500))
          return false
        if (selectedPriceRange === 'above-2500' && attrs.price <= 2500) return false
      }
      if (customPriceMin && attrs.price < parseFloat(customPriceMin)) return false
      if (customPriceMax && attrs.price > parseFloat(customPriceMax)) return false

      return true
    })
  }, [
    products,
    selectedFabric,
    selectedSize,
    selectedColor,
    selectedGender,
    selectedOccasion,
    selectedPriceRange,
    customPriceMin,
    customPriceMax,
  ])

  // Pagination Configuration: Exactly 15 items per page
  const ITEMS_PER_PAGE = 15
  const [currentPage, setCurrentPage] = useState(1)
  const sectionRef = useRef(null)

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [
    selectedFabric,
    selectedSize,
    selectedColor,
    selectedGender,
    selectedOccasion,
    selectedPriceRange,
    customPriceMin,
    customPriceMax,
  ])

  // Pagination calculations
  const totalItems = filteredProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems)
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, startIndex, endIndex])

  // Count active filters
  const activeFilterCount = [
    selectedFabric,
    selectedSize,
    selectedColor,
    selectedGender,
    selectedOccasion,
    selectedPriceRange || customPriceMin || customPriceMax,
  ].filter(Boolean).length

  // Clear all filters
  const handleResetFilters = () => {
    setSelectedFabric('')
    setSelectedSize('')
    setSelectedColor('')
    setSelectedPriceRange('')
    setCustomPriceMin('')
    setCustomPriceMax('')
    setSelectedGender('')
    setSelectedOccasion('')
    setCurrentPage(1)
  }

  if (!products || products.length === 0) return null

  return (
    <section ref={sectionRef} className="py-10 bg-neutral-50/70 border-b border-neutral-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header: Explore Creations on Left, Filters Toggle on Opposite Side (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
              Explore More <span className="text-theme-gradient">Creations</span>
            </h2>
            <span className="badge-theme-subtle text-[9px] uppercase tracking-wider py-0.5 px-2">
              Atelier Direct
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-medium hidden sm:inline-block">
              Showing <span className="font-bold text-neutral-900">{filteredProducts.length}</span>{' '}
              of {products.length} Styles
            </span>

            {/* Toggle Filters Button on opposite side to Explore Creations */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isSidebarOpen || activeFilterCount > 0
                  ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078]'
                  : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50'
              }`}
              aria-label="Toggle Filters Sidebar"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C00078]" />
              <span>{isSidebarOpen ? 'Hide Filters' : 'Filters'}</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C00078] text-white text-[9.5px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content Area: 15% Sidebar + 85% Product List (or 100% full width when sidebar is closed) */}
        <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 items-start">
          {/* 15% Filter Sidebar (Appears on click, categories are collapsed until user clicks) */}
          {isSidebarOpen && (
            <aside className="w-full lg:w-[19%] xl:w-[16%] min-w-[210px] shrink-0 sticky top-20 self-start max-h-[calc(100vh-95px)] overflow-y-auto no-scrollbar bg-white p-3.5 sm:p-4 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-300 z-20">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-900 uppercase tracking-wider">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C00078]" />
                  <span>Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="text-[#C00078]">({activeFilterCount})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-[11px] text-rose-600 font-semibold hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-black cursor-pointer transition-colors"
                    title="Close filter sidebar"
                    aria-label="Close sidebar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 1. GENDER FILTER (Collapsible) */}
              <div className="border-b border-neutral-100/80 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('gender')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedGender || openSections.gender
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Gender
                    </span>
                    {selectedGender && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8]">
                        {GENDER_OPTIONS.find((g) => g.id === selectedGender)?.label}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.gender ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.gender && (
                  <div className="pt-2 pb-1 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => setSelectedGender('')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        !selectedGender
                          ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078] font-bold'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      All
                    </button>
                    {GENDER_OPTIONS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGender(g.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                          selectedGender === g.id
                            ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078] font-bold'
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. PRICE FILTER (Collapsible) */}
              <div className="border-b border-neutral-100/80 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('price')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedPriceRange || customPriceMin || customPriceMax || openSections.price
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Price
                    </span>
                    {(selectedPriceRange || customPriceMin || customPriceMax) && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8]">
                        Active
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.price ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.price && (
                  <div className="pt-2 pb-1 space-y-1.5 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPriceRange('')
                          setCustomPriceMin('')
                          setCustomPriceMax('')
                        }}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedPriceRange && !customPriceMin && !customPriceMax
                            ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span>All Prices</span>
                        {!selectedPriceRange && !customPriceMin && !customPriceMax && (
                          <Check className="w-3 h-3 text-[#C00078]" />
                        )}
                      </button>
                      {PRICE_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange(p.id)
                            setCustomPriceMin('')
                            setCustomPriceMax('')
                          }}
                          className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            selectedPriceRange === p.id
                              ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                              : 'text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          <span>{p.label}</span>
                          {selectedPriceRange === p.id && (
                            <Check className="w-3 h-3 text-[#C00078]" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Custom Min / Max (₹) */}
                    <div className="pt-2 border-t border-neutral-100">
                      <div className="text-[10px] text-neutral-400 font-semibold mb-1">
                        Custom Range (₹)
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Min"
                          value={customPriceMin}
                          onChange={(e) => {
                            setCustomPriceMin(e.target.value)
                            setSelectedPriceRange('')
                          }}
                          className="w-1/2 px-2 py-1 text-xs border border-neutral-200 rounded-md outline-none focus:border-[#C00078]"
                        />
                        <span className="text-neutral-400 text-xs">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={customPriceMax}
                          onChange={(e) => {
                            setCustomPriceMax(e.target.value)
                            setSelectedPriceRange('')
                          }}
                          className="w-1/2 px-2 py-1 text-xs border border-neutral-200 rounded-md outline-none focus:border-[#C00078]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. FABRIC FILTER (Collapsible) */}
              <div className="border-b border-neutral-100/80 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('fabric')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedFabric || openSections.fabric
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Fabric
                    </span>
                    {selectedFabric && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8] truncate max-w-[70px]">
                        {selectedFabric}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.fabric ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.fabric && (
                  <div className="pt-2 pb-1 space-y-1 animate-in fade-in duration-150">
                    <div className="max-h-40 overflow-y-auto no-scrollbar space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedFabric('')}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedFabric
                            ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span>All Fabrics</span>
                        {!selectedFabric && <Check className="w-3 h-3 text-[#C00078]" />}
                      </button>
                      {FABRIC_OPTIONS.map((fabric) => {
                        const count = products.filter((p) =>
                          getProductAttributes(p).fabrics.some(
                            (f) => f.toLowerCase() === fabric.toLowerCase()
                          )
                        ).length
                        const isSelected = selectedFabric.toLowerCase() === fabric.toLowerCase()
                        return (
                          <button
                            key={fabric}
                            type="button"
                            onClick={() => setSelectedFabric(isSelected ? '' : fabric)}
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            <span className="truncate">{fabric}</span>
                            <span className="text-[10px] text-neutral-400 shrink-0">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. SIZE FILTER (Collapsible) */}
              <div className="border-b border-neutral-100/80 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('size')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedSize || openSections.size
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Size
                    </span>
                    {selectedSize && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8]">
                        {selectedSize}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.size ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.size && (
                  <div className="pt-2 pb-1 animate-in fade-in duration-150">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedSize('')}
                        className={`col-span-3 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                          !selectedSize
                            ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078]'
                            : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        All Sizes
                      </button>
                      {SIZE_OPTIONS.map((sz) => {
                        const isSelected = selectedSize.toLowerCase() === sz.toLowerCase()
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(isSelected ? '' : sz)}
                            className={`py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center truncate ${
                              isSelected
                                ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078]'
                                : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            {sz}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. COLOR FILTER (Collapsible) */}
              <div className="border-b border-neutral-100/80 pb-2.5">
                <button
                  type="button"
                  onClick={() => toggleSection('color')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedColor || openSections.color
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Color
                    </span>
                    {selectedColor && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8] truncate max-w-[70px]">
                        {selectedColor}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.color ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.color && (
                  <div className="pt-2 pb-1 animate-in fade-in duration-150">
                    <div className="max-h-40 overflow-y-auto no-scrollbar space-y-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedColor('')}
                        className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedColor
                            ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span>All Colors</span>
                        {!selectedColor && <Check className="w-3 h-3 text-[#C00078]" />}
                      </button>
                      {COLOR_OPTIONS.map((col) => {
                        const count = products.filter((p) =>
                          getProductAttributes(p).colors.some(
                            (c) => c.toLowerCase() === col.name.toLowerCase()
                          )
                        ).length
                        const isSelected = selectedColor.toLowerCase() === col.name.toLowerCase()
                        return (
                          <button
                            key={col.name}
                            type="button"
                            onClick={() => setSelectedColor(isSelected ? '' : col.name)}
                            className={`w-full text-left px-2 py-1 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-[#FFF1F8] text-[#C00078] font-bold'
                                : 'text-neutral-600 hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-3 h-3 rounded-full border shadow-2xs shrink-0"
                                style={{ backgroundColor: col.hex, borderColor: col.border }}
                              />
                              <span className="truncate">{col.name}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 shrink-0">({count})</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. OCCASION FILTER (Collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('occasion')}
                  className="w-full flex items-center justify-between py-1 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[11.5px] font-bold uppercase tracking-wider transition-colors ${
                        selectedOccasion || openSections.occasion
                          ? 'text-[#C00078]'
                          : 'text-neutral-800 group-hover:text-black'
                      }`}
                    >
                      Occasion
                    </span>
                    {selectedOccasion && (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-[#FFF1F8] text-[#C00078] border border-[#F8D4E8]">
                        {selectedOccasion}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      openSections.occasion ? 'rotate-180 text-[#C00078]' : 'group-hover:text-neutral-600'
                    }`}
                  />
                </button>

                {openSections.occasion && (
                  <div className="pt-2 pb-1 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => setSelectedOccasion('')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                        !selectedOccasion
                          ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078] font-bold'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      All
                    </button>
                    {OCCASION_OPTIONS.map((occ) => {
                      const isSelected = selectedOccasion.toLowerCase() === occ.toLowerCase()
                      return (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => setSelectedOccasion(isSelected ? '' : occ)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-[#C00078] bg-[#FFF1F8] text-[#C00078] font-bold'
                              : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {occ}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* 85% Product List Area (Expands to 100% when sidebar is closed) */}
          <div className="flex-1 min-w-0 w-full">
            {/* Active Filter Chips Row */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-4 pb-2 border-b border-neutral-200/60">
                <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider mr-1">
                  Active:
                </span>
                {selectedFabric && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Fabric: {selectedFabric}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => setSelectedFabric('')}
                    />
                  </span>
                )}
                {selectedSize && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Size: {selectedSize}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => setSelectedSize('')}
                    />
                  </span>
                )}
                {selectedColor && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Color: {selectedColor}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => setSelectedColor('')}
                    />
                  </span>
                )}
                {(selectedPriceRange || customPriceMin || customPriceMax) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Price:{' '}
                    {selectedPriceRange
                      ? PRICE_PRESETS.find((p) => p.id === selectedPriceRange)?.label
                      : `₹${customPriceMin || '0'} - ₹${customPriceMax || '∞'}`}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => {
                        setSelectedPriceRange('')
                        setCustomPriceMin('')
                        setCustomPriceMax('')
                      }}
                    />
                  </span>
                )}
                {selectedGender && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Gender: {GENDER_OPTIONS.find((g) => g.id === selectedGender)?.label}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => setSelectedGender('')}
                    />
                  </span>
                )}
                {selectedOccasion && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-[#C00078] text-[11px] font-semibold">
                    Occasion: {selectedOccasion}
                    <X
                      className="w-3 h-3 hover:text-black cursor-pointer"
                      onClick={() => setSelectedOccasion('')}
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline ml-1 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Empty State when no creations match filters */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs max-w-md mx-auto my-6">
                <div className="w-14 h-14 rounded-2xl bg-pink-50 text-[#C00078] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-1">
                  No creations match your filters
                </h3>
                <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
                  We couldn't find any atelier styles matching this exact combination. Try clearing
                  some filters to explore more luxury designs.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-full bg-[#C00078] text-white text-xs font-bold hover:bg-[#A80069] transition-colors cursor-pointer shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <>
                {/* Product Cards Grid: 4 cols when 15% sidebar is open, 5 cols when closed */}
                <div
                  className={`grid gap-3 sm:gap-4 ${
                    isSidebarOpen
                      ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5'
                  }`}
                >
                {paginatedProducts.map((product) => {
                  const isWishlisted = wishlistIds.map(Number).includes(Number(product.id))
                  const price = product.discount_price || product.actual_price || product.price
                  const originalPrice = product.actual_price || product.original_price
                  const prodId = Number(product.product_id || product.id)
                  const isInCart = cartItems.some(
                    (i) => Number(i.product_id || i.product?.id || i.id) === prodId
                  )
                  const isCustomizable = isProductCustomizable(product)

                  const discountPercent = (() => {
                    if (product.discount_percentage && Number(product.discount_percentage) > 0) {
                      return Number(product.discount_percentage)
                    }
                    const p = parseFloat(price)
                    const op = parseFloat(originalPrice)
                    if (op > p && p > 0) {
                      return Math.round(((op - p) / op) * 100)
                    }
                    return null
                  })()

                  return (
                    <div
                      key={product.unique_id || `${product.id}-${product.variant_id || product.selectedMaterialId || 0}`}
                      onClick={() => onSelectProduct && onSelectProduct(product)}
                      className="group card-luxury overflow-hidden flex flex-col cursor-pointer"
                    >
                      {/* Product Image */}
                      <div className="relative aspect-[3/4] bg-neutral-100 overflow-hidden">
                        <img
                          src={product.image || product.img_path}
                          alt={product.product_name || product.title}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106"
                          onError={(e) => {
                            e.target.src =
                              'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
                          }}
                        />

                        {/* Customizable Badge */}
                        {isCustomizable && (
                          <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/90 backdrop-blur-xs text-[#C00078] border border-pink-200/80 shadow-2xs select-none">
                              <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                              <span>Custom</span>
                            </span>
                          </div>
                        )}

                        {/* Small Offer Percentage Badge */}
                        {discountPercent > 0 && (
                          <div className="absolute top-2 right-9 z-10 pointer-events-none">
                            <span className="bg-[#C00078] text-white text-[8.5px] font-extrabold tracking-tight px-1.5 py-0.5 rounded shadow-2xs">
                              {discountPercent}% OFF
                            </span>
                          </div>
                        )}

                        {/* Wishlist Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (onToggleWishlist) onToggleWishlist(product)
                          }}
                          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                            isWishlisted
                              ? 'bg-pink-50 text-theme-primary'
                              : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                          }`}
                          aria-label="Toggle Wishlist"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isWishlisted
                                ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]'
                                : ''
                            }`}
                          />
                        </button>

                        {/* Single Elegant Line Action Row on Desktop Hover */}
                        <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hidden sm:flex items-center gap-1.5 z-10">
                          {isInCart ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onOpenCart) onOpenCart()
                              }}
                              className="flex-1 h-7 sm:h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[9px] text-[9.5px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors duration-150 ease-out cursor-pointer border-0 shadow-none"
                              title="In Bag - Go to Bag"
                            >
                              <Check className="w-3 h-3 stroke-[2.5] shrink-0 text-white" />
                              <span className="truncate">In Bag</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onAddToCart) onAddToCart(product)
                              }}
                              className="flex-1 h-7 sm:h-8 px-2 bg-[#C00078] hover:bg-[#A80069] active:bg-[#97005F] text-white rounded-[9px] text-[9.5px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors duration-150 ease-out border-0 shadow-none cursor-pointer"
                              title="Add to Bag"
                            >
                              <ShoppingBag className="w-3 h-3 shrink-0 text-white" />
                              <span className="truncate">Add to Bag</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onBuyNow) {
                                onBuyNow(product)
                              } else if (onSelectProduct) {
                                onSelectProduct(product)
                              }
                            }}
                            className="flex-1 h-7 sm:h-8 px-2 bg-[#222222] hover:bg-[#111111] active:bg-[#000000] text-white rounded-[9px] text-[9.5px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors duration-150 ease-out cursor-pointer border-0 shadow-none"
                            title="Buy Now"
                          >
                            <Zap className="w-3 h-3 text-white fill-white shrink-0" />
                            <span className="truncate">Buy Now</span>
                          </button>
                        </div>
                      </div>

                      {/* Product Info Section (Aligned with strict tokens) */}
                      <div className="p-4 flex-1 flex flex-col justify-between bg-white text-left">
                        <div className="flex-1 flex flex-col">
                          {/* Row 1: Product name on left & Custom badge on right */}
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="text-[16px] font-semibold text-[#24212A] leading-snug line-clamp-2 text-left group-hover:text-[#C00078] transition-colors break-words flex-1"
                              title={product.product_name || product.title}
                            >
                              {product.product_name || product.title}
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
                              title={product.shop_name || product.vendor?.shop_name || product.vendor_name || 'Bespoke Studio'}
                            >
                              {product.shop_name || product.vendor?.shop_name || product.vendor_name || 'Bespoke Studio'}
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
                              ₹{price}
                            </span>
                            {originalPrice && Number(originalPrice) > Number(price) && (
                              <span className="text-[13.5px] font-normal text-[#999999] line-through leading-none">
                                ₹{originalPrice}
                              </span>
                            )}
                            {discountPercent > 0 && (
                              <span className="inline-flex items-center text-[10.5px] font-bold text-[#C00078] bg-[#FFF1F8] border border-[#F8D4E8] px-1.5 py-0.5 rounded-[5px] leading-none">
                                {discountPercent}% OFF
                              </span>
                            )}
                          </div>

                          {/* Mobile Action Buttons */}
                          <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                            {isInCart ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
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
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onAddToCart) onAddToCart(product)
                                }}
                                className="px-2.5 py-1.5 bg-[#C00078] hover:bg-[#A80069] active:bg-[#97005F] text-white rounded-[9px] cursor-pointer shadow-none flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors duration-150 ease-out border-0"
                                aria-label="Add to bag"
                                title="Add to Bag"
                              >
                                <ShoppingBag className="w-3 h-3 text-white" />
                                <span>Add</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onBuyNow) {
                                  onBuyNow(product)
                                } else if (onSelectProduct) {
                                  onSelectProduct(product)
                                }
                              }}
                              className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#111111] active:bg-[#000000] text-white text-[10px] font-semibold uppercase tracking-wider rounded-[9px] cursor-pointer shadow-none flex items-center gap-1 transition-colors duration-150 ease-out border-0"
                              title="Buy Now"
                            >
                              <Zap className="w-3 h-3 text-white fill-white" />
                              <span>Buy</span>
                            </button>
                          </div>
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
                        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                            sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
                        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      </div>
    </section>
  )
}
