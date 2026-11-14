import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingBag,
  Zap,
  Check,
  Scissors,
  SlidersHorizontal,
  X,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Star,
  Store,
  Filter,
  Layers,
  Info,
} from 'lucide-react'
import {
  getProductListingByCategory,
  getSubcategories,
  getAllProducts,
  getCategories,
  isProductCustomizable,
  isProductActive,
  formatImageUrl,
} from '../../services/api'
import { notifyContentReady } from '../../utils/scrollRestoration'

// Color map for luxury swatches
const COLOR_HEX_MAP = {
  black: '#171717',
  white: '#FFFFFF',
  red: '#EF4444',
  blue: '#3B82F6',
  green: '#10B981',
  yellow: '#F59E0B',
  pink: '#EC4899',
  purple: '#8B5CF6',
  orange: '#F97316',
  grey: '#6B7280',
  gray: '#6B7280',
  brown: '#78350F',
  beige: '#D4B996',
  gold: '#D97706',
  navy: '#1E3A8A',
  cream: '#FEF3C7',
  cotton: '#E0E7FF',
  multicolor: 'linear-gradient(135deg, #FF6B6B, #4ECDC4, #FFE66D)',
}

export default function CategoryPage({
  category,
  departments = [],
  allCategories = [],
  onNavigateCategory,
  onNavigateSubcategory,
  onBack,
  onSelectProduct,
  onAddToCart,
  wishlistIds = [],
  onToggleWishlist,
  cartItems = [],
  onOpenCart,
  onBuyNow,
}) {
  const [categoryData, setCategoryData] = useState(category)
  const [allProducts, setAllProducts] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [selectedSubId, setSelectedSubId] = useState(category?.selectedSubcategory || 'ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState('featured')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Faceted Filter States
  const [selectedTailoring, setSelectedTailoring] = useState('') // '' | 'customizable' | 'ready_made'
  const [selectedSizes, setSelectedSizes] = useState([])
  const [selectedFabrics, setSelectedFabrics] = useState([])
  const [selectedColors, setSelectedColors] = useState([])
  const [selectedBoutiques, setSelectedBoutiques] = useState([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [customPriceMin, setCustomPriceMin] = useState('')
  const [customPriceMax, setCustomPriceMax] = useState('')
  const [minRating, setMinRating] = useState('')

  // Accordion toggle states
  const [expandedSections, setExpandedSections] = useState({
    subcategories: true,
    tailoring: true,
    price: true,
    sizes: true,
    fabrics: true,
    colors: true,
    boutiques: true,
    rating: true,
    relatedCategories: true,
  })

  // Mobile Filter Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const topRef = useRef(null)

  // Toggle helper for accordions
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Toggle helper for multi-select arrays
  const toggleArrayItem = (currentArray, setFunc, item) => {
    if (currentArray.includes(item)) {
      setFunc(currentArray.filter((i) => i !== item))
    } else {
      setFunc([...currentArray, item])
    }
  }

  // Keep categoryData in sync when category prop updates
  useEffect(() => {
    if (category) {
      setCategoryData((prev) => ({
        ...prev,
        ...category,
      }))
      if (category.selectedSubcategory) {
        setSelectedSubId(category.selectedSubcategory)
      } else {
        setSelectedSubId('ALL')
      }
    }
  }, [category])

  // Load category metadata, subcategories, and products
  useEffect(() => {
    let ignore = false
    async function loadData() {
      if (!category?.id) return
      setIsLoading(true)
      try {
        // 1. Resolve category metadata if name or type is missing
        let currentCat = category
        if (!category.name || category.type === undefined) {
          try {
            const allCats = await getCategories()
            const found = (allCats || []).find(
              (c) => String(c.id) === String(category.id)
            )
            if (found) {
              currentCat = { ...category, ...found }
              if (!ignore) setCategoryData(currentCat)
            }
          } catch {}
        }

        // 2. Fetch all subcategories from backend
        try {
          const allSubs = await getSubcategories(currentCat.id)
          if (!ignore) {
            // Filter subcategories belonging specifically to this category
            const directSubs = (allSubs || []).filter(
              (s) =>
                String(s.category_id) === String(currentCat.id) ||
                String(s.categoryId) === String(currentCat.id)
            )
            if (directSubs.length > 0) {
              setSubcategories(directSubs)
            } else if (Array.isArray(currentCat.subcategories) && currentCat.subcategories.length > 0) {
              setSubcategories(currentCat.subcategories)
            } else {
              // Look up in departments taxonomy if any items match
              let deptSubs = []
              for (const dept of departments) {
                const sec = (dept.sections || []).find(
                  (s) => String(s.categoryId) === String(currentCat.id) || s.title?.toLowerCase() === currentCat.name?.toLowerCase()
                )
                if (sec && Array.isArray(sec.items)) {
                  deptSubs = sec.items.map((name, idx) => ({ id: `${currentCat.id}-${idx}`, name, categoryId: currentCat.id }))
                  break
                }
              }
              setSubcategories(deptSubs)
            }
          }
        } catch (subErr) {
          console.warn('Failed to load subcategories:', subErr)
        }

        // 3. Fetch products from store catalog
        const prods = await getAllProducts()
        if (!ignore) {
          setAllProducts(prods || [])
        }
      } catch (err) {
        console.error('Failed to load category page data:', err)
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [category?.id])

  // Department metadata based on category type
  const departmentInfo = useMemo(() => {
    const typeStr = String(categoryData?.type ?? '')
    if (typeStr === '2') {
      return { id: 'womens', title: 'Womenswear', badge: 'Women' }
    }
    if (typeStr === '1') {
      return { id: 'mens', title: 'Menswear', badge: 'Men' }
    }
    if (typeStr === '3') {
      return { id: 'kids', title: 'Kids & Teens', badge: 'Kids' }
    }
    if (typeStr === '0') {
      return { id: 'unisex', title: 'Unisex & Living', badge: 'Lifestyle' }
    }
    return { id: 'all', title: 'Atelier Collection', badge: 'Bespoke' }
  }, [categoryData?.type])

  // Related sibling categories in the same department
  const relatedCategories = useMemo(() => {
    if (!allCategories || allCategories.length === 0) return []
    const currentCatId = String(categoryData?.id || '')
    const currentType = String(categoryData?.type ?? '')

    return allCategories.filter((c) => {
      if (String(c.id) === currentCatId) return false
      if (currentType && String(c.type) === currentType) return true
      return false
    })
  }, [allCategories, categoryData?.id, categoryData?.type])

  // 1. Filter products belonging to this category
  const categoryProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return []
    const catId = String(categoryData?.id || '')
    const catName = (categoryData?.name || '').toLowerCase().trim()
    const catType = categoryData?.type !== undefined ? String(categoryData.type) : null

    return allProducts.filter((p) => {
      // Direct ID match
      if (String(p.category_id || p.category) === catId) return true
      // Category Name match
      if (catName && (p.category_name || '').toLowerCase().trim() === catName) return true
      // Category type match if specified
      if (catType && String(p.category_type || p.type || '') === catType) return true
      return false
    })
  }, [allProducts, categoryData?.id, categoryData?.name, categoryData?.type])

  // 2. Department fallback products if current category has 0 items (e.g. Category 53 'Coord')
  const departmentFallbackProducts = useMemo(() => {
    if (categoryProducts.length > 0) return []
    const catType = categoryData?.type !== undefined ? String(categoryData.type) : '2'
    return allProducts.filter((p) => {
      if (catType === '2') {
        const g = String(p.gender || '').toLowerCase()
        return g.includes('female') || g.includes('women') || String(p.category_type) === '2'
      }
      if (catType === '1') {
        const g = String(p.gender || '').toLowerCase()
        return g.includes('male') || g.includes('men') || String(p.category_type) === '1'
      }
      return true
    })
  }, [allProducts, categoryProducts.length, categoryData?.type])

  // The working pool of products (either direct category or curated department styles)
  const baseProducts = useMemo(() => {
    if (categoryProducts.length > 0) return categoryProducts
    if (departmentFallbackProducts.length > 0) return departmentFallbackProducts
    return allProducts
  }, [categoryProducts, departmentFallbackProducts, allProducts])

  const isShowingDepartmentFallback = categoryProducts.length === 0 && baseProducts.length > 0

  // 3. Subcategory matching helper
  const matchesSubcategory = useCallback((product, subIdentifier) => {
    if (!subIdentifier || subIdentifier === 'ALL') return true
    const subClean = String(subIdentifier).toLowerCase().trim()

    // Match by ID
    if (
      String(product.subcategory_id || product.subcategory || product.sub_category) === String(subIdentifier)
    ) {
      return true
    }

    // Match by subcategory name
    const pSubName = String(product.subcategory_name || product.subcategory || product.sub_category_name || '').toLowerCase()
    if (pSubName && pSubName === subClean) return true
    if (pSubName && (pSubName.includes(subClean) || subClean.includes(pSubName))) return true

    // Text token matching on product title or description
    const pTitle = String(product.product_name || product.title || '').toLowerCase()
    const pDesc = String(product.description || '').toLowerCase()
    if (pTitle.includes(subClean) || pDesc.includes(subClean)) return true

    // Split words (e.g. "Top and skirt" -> "top", "skirt")
    const words = subClean.split(/[\s,&+/_-]+/).filter((w) => w.length > 2 && w !== 'and')
    if (words.length > 0 && words.some((w) => pTitle.includes(w) || pSubName.includes(w))) {
      return true
    }

    return false
  }, [])

  // 4. Extract Dynamic Facets from the baseProducts pool
  const availableFacets = useMemo(() => {
    const sizesSet = new Set()
    const fabricsSet = new Set()
    const colorsSet = new Set()
    const boutiquesSet = new Set()

    baseProducts.forEach((p) => {
      // Sizes
      if (Array.isArray(p.sizes)) {
        p.sizes.forEach((s) => s && sizesSet.add(String(s).trim()))
      }
      // Fabrics
      if (Array.isArray(p.fabrics)) {
        p.fabrics.forEach((f) => f && fabricsSet.add(String(f).trim()))
      } else if (p.fabric) {
        fabricsSet.add(String(p.fabric).trim())
      }
      // Colors
      if (Array.isArray(p.colors)) {
        p.colors.forEach((c) => c && colorsSet.add(String(c).trim()))
      } else if (p.color) {
        colorsSet.add(String(p.color).trim())
      }
      // Boutiques
      const bName = p.vendor_name || p.shop_name || p.brand
      if (bName) boutiquesSet.add(String(bName).trim())
    })

    // Standard apparel sizes list
    const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size', 'Standard']
    const presentSizes = standardSizes.filter((s) => sizesSet.has(s))
    // Add any non-standard sizes found
    sizesSet.forEach((s) => {
      if (!presentSizes.includes(s)) presentSizes.push(s)
    })

    return {
      sizes: presentSizes,
      fabrics: Array.from(fabricsSet).sort(),
      colors: Array.from(colorsSet).sort(),
      boutiques: Array.from(boutiquesSet).sort(),
    }
  }, [baseProducts])

  // 5. Apply All Active Facets to Filter Products
  const filteredProducts = useMemo(() => {
    return baseProducts.filter((p) => {
      // 0. Active check (ensure products with inactive materials are excluded)
      if (!isProductActive(p)) return false

      // 1. Subcategory filter
      if (selectedSubId !== 'ALL') {
        const matchesSub = matchesSubcategory(p, selectedSubId)
        // If fallback mode is active and exact subcategory has 0 items in pool, let fallback pass through with banner
        if (!matchesSub && categoryProducts.length > 0) return false
      }

      // 2. Tailoring / Customization
      if (selectedTailoring === 'customizable' && !isProductCustomizable(p)) return false
      if (selectedTailoring === 'ready_made' && isProductCustomizable(p)) return false

      // 3. Price Range
      const price = Number(p.discount_price || p.actual_price || p.price || 0)
      if (priceRange.min !== '' && price < Number(priceRange.min)) return false
      if (priceRange.max !== '' && price > Number(priceRange.max)) return false

      // 4. Sizes
      if (selectedSizes.length > 0) {
        const pSizes = Array.isArray(p.sizes) ? p.sizes.map((s) => String(s).trim()) : []
        const hasSize = selectedSizes.some((s) => pSizes.includes(s))
        if (!hasSize) return false
      }

      // 5. Fabrics
      if (selectedFabrics.length > 0) {
        const pFabrics = Array.isArray(p.fabrics)
          ? p.fabrics.map((f) => String(f).toLowerCase().trim())
          : p.fabric
          ? [String(p.fabric).toLowerCase().trim()]
          : []
        const hasFabric = selectedFabrics.some((f) => pFabrics.includes(f.toLowerCase()))
        if (!hasFabric) return false
      }

      // 6. Colors
      if (selectedColors.length > 0) {
        const pColors = Array.isArray(p.colors)
          ? p.colors.map((c) => String(c).toLowerCase().trim())
          : p.color
          ? [String(p.color).toLowerCase().trim()]
          : []
        const hasColor = selectedColors.some((c) => pColors.includes(c.toLowerCase()))
        if (!hasColor) return false
      }

      // 7. Boutiques
      if (selectedBoutiques.length > 0) {
        const bName = String(p.vendor_name || p.shop_name || p.brand || '').trim()
        if (!selectedBoutiques.includes(bName)) return false
      }

      // 8. Rating
      if (minRating) {
        const pRating = Number(p.rating || 0)
        if (pRating < Number(minRating)) return false
      }

      return true
    })
  }, [
    baseProducts,
    categoryProducts.length,
    selectedSubId,
    matchesSubcategory,
    selectedTailoring,
    priceRange,
    selectedSizes,
    selectedFabrics,
    selectedColors,
    selectedBoutiques,
    minRating,
  ])

  // 6. Sort Products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const priceA = Number(a.discount_price || a.actual_price || a.price || 0)
      const priceB = Number(b.discount_price || b.actual_price || b.price || 0)
      const ratingA = Number(a.rating || 0)
      const ratingB = Number(b.rating || 0)

      if (sortBy === 'price-low') return priceA - priceB
      if (sortBy === 'price-high') return priceB - priceA
      if (sortBy === 'rating') return ratingB - ratingA
      if (sortBy === 'newest') return Number(b.id || 0) - Number(a.id || 0)
      return 0 // featured
    })
  }, [filteredProducts, sortBy])

  // Pagination Configuration
  useEffect(() => {
    setCurrentPage(1)
  }, [
    selectedSubId,
    sortBy,
    selectedTailoring,
    selectedSizes,
    selectedFabrics,
    selectedColors,
    selectedBoutiques,
    priceRange,
    minRating,
  ])

  const totalItems = sortedProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice(startIndex, endIndex)
  }, [sortedProducts, startIndex, endIndex])

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Active Filter Chips construction
  const activeChips = useMemo(() => {
    const chips = []

    if (selectedSubId && selectedSubId !== 'ALL') {
      chips.push({
        id: 'sub',
        label: `Subcategory: ${selectedSubId}`,
        remove: () => setSelectedSubId('ALL'),
      })
    }
    if (selectedTailoring) {
      chips.push({
        id: 'tailoring',
        label: selectedTailoring === 'customizable' ? 'Custom Tailored' : 'Ready Made',
        remove: () => setSelectedTailoring(''),
      })
    }
    if (priceRange.min !== '' || priceRange.max !== '') {
      chips.push({
        id: 'price',
        label: `Price: ₹${priceRange.min || 0} - ₹${priceRange.max || 'Max'}`,
        remove: () => {
          setPriceRange({ min: '', max: '' })
          setCustomPriceMin('')
          setCustomPriceMax('')
        },
      })
    }
    selectedSizes.forEach((sz) => {
      chips.push({
        id: `sz-${sz}`,
        label: `Size: ${sz}`,
        remove: () => setSelectedSizes((prev) => prev.filter((s) => s !== sz)),
      })
    })
    selectedFabrics.forEach((fb) => {
      chips.push({
        id: `fb-${fb}`,
        label: `Fabric: ${fb}`,
        remove: () => setSelectedFabrics((prev) => prev.filter((f) => f !== fb)),
      })
    })
    selectedColors.forEach((cl) => {
      chips.push({
        id: `cl-${cl}`,
        label: `Color: ${cl}`,
        remove: () => setSelectedColors((prev) => prev.filter((c) => c !== cl)),
      })
    })
    selectedBoutiques.forEach((bt) => {
      chips.push({
        id: `bt-${bt}`,
        label: `Boutique: ${bt}`,
        remove: () => setSelectedBoutiques((prev) => prev.filter((b) => b !== bt)),
      })
    })
    if (minRating) {
      chips.push({
        id: 'rating',
        label: `${minRating}★ & Above`,
        remove: () => setMinRating(''),
      })
    }

    return chips
  }, [
    selectedSubId,
    selectedTailoring,
    priceRange,
    selectedSizes,
    selectedFabrics,
    selectedColors,
    selectedBoutiques,
    minRating,
  ])

  const clearAllFilters = () => {
    setSelectedSubId('ALL')
    setSelectedTailoring('')
    setSelectedSizes([])
    setSelectedFabrics([])
    setSelectedColors([])
    setSelectedBoutiques([])
    setPriceRange({ min: '', max: '' })
    setCustomPriceMin('')
    setCustomPriceMax('')
    setMinRating('')
  }

  // Display Titles
  const catDisplayName = categoryData?.name || (categoryData?.id ? `Category #${categoryData.id}` : 'Atelier Collection')
  const pageHeading = selectedSubId && selectedSubId !== 'ALL' ? selectedSubId : catDisplayName

  // Subcategories available for filter sidebar
  const relevantSubcategoriesList = useMemo(() => {
    // If we have subcategories belonging directly to category, use them
    if (subcategories && subcategories.length > 0) return subcategories

    // Otherwise derive from category's subcategories in allCategories taxonomy
    const foundCat = (allCategories || []).find((c) => String(c.id) === String(categoryData?.id))
    if (foundCat && Array.isArray(foundCat.subcategories) && foundCat.subcategories.length > 0) {
      return foundCat.subcategories
    }

    return []
  }, [subcategories, allCategories, categoryData?.id])

  // Count items matching a specific subcategory
  const getSubcategoryCount = useCallback(
    (subNameOrId) => {
      return baseProducts.filter((p) => matchesSubcategory(p, subNameOrId)).length
    },
    [baseProducts, matchesSubcategory]
  )

  // Apply custom price input
  const handleApplyCustomPrice = (e) => {
    e?.preventDefault()
    setPriceRange({
      min: customPriceMin.trim(),
      max: customPriceMax.trim(),
    })
  }

  // RENDER FILTER OPTIONS (Shared between Desktop Sidebar and Mobile Drawer)
  const renderFilterOptions = () => (
    <div className="space-y-6 text-sm">
      {/* 1. Subcategories Accordion */}
      {relevantSubcategoriesList.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('subcategories')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
          >
            <span>Subcategories in {catDisplayName}</span>
            {expandedSections.subcategories ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {expandedSections.subcategories && (
            <div className="mt-2.5 space-y-1.5 max-h-56 overflow-y-auto pr-1">
              <label className="flex items-center justify-between text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="subcategory_filter"
                    checked={selectedSubId === 'ALL'}
                    onChange={() => setSelectedSubId('ALL')}
                    className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                  />
                  <span className={selectedSubId === 'ALL' ? 'font-bold text-[var(--theme-primary)]' : ''}>
                    All {catDisplayName}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">({baseProducts.length})</span>
              </label>

              {relevantSubcategoriesList.map((sub) => {
                const isSelected = selectedSubId === sub.name || selectedSubId === String(sub.id)
                const count = getSubcategoryCount(sub.name || sub.id)

                return (
                  <label
                    key={`sub-${sub.id || sub.name}`}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="subcategory_filter"
                        checked={isSelected}
                        onChange={() => setSelectedSubId(sub.name)}
                        className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                      />
                      <span className={isSelected ? 'font-bold text-[var(--theme-primary)]' : ''}>
                        {sub.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">({count})</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. Fit & Tailoring Accordion */}
      <div className="border-b border-[#F0E5EC] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('tailoring')}
          className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
        >
          <span>Tailoring & Fit</span>
          {expandedSections.tailoring ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {expandedSections.tailoring && (
          <div className="mt-2.5 space-y-1.5">
            {[
              { id: '', label: 'All Garments' },
              { id: 'customizable', label: 'Custom Tailored (Bespoke)' },
              { id: 'ready_made', label: 'Ready Made (Standard Size)' },
            ].map((opt) => (
              <label
                key={opt.id}
                className="flex items-center gap-2 text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none"
              >
                <input
                  type="radio"
                  name="tailoring_type"
                  checked={selectedTailoring === opt.id}
                  onChange={() => setSelectedTailoring(opt.id)}
                  className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                />
                <span className={selectedTailoring === opt.id ? 'font-bold text-[var(--theme-primary)]' : ''}>
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. Price Range Accordion */}
      <div className="border-b border-[#F0E5EC] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
        >
          <span>Price Range</span>
          {expandedSections.price ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {expandedSections.price && (
          <div className="mt-2.5 space-y-2.5">
            {/* Quick Price Buckets */}
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Under ₹500', min: '0', max: '500' },
                { label: '₹500 - ₹1,000', min: '500', max: '1000' },
                { label: '₹1,000 - ₹2,500', min: '1000', max: '2500' },
                { label: 'Above ₹2,500', min: '2500', max: '' },
              ].map((bucket, idx) => {
                const isActive = priceRange.min === bucket.min && priceRange.max === bucket.max
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setPriceRange({ min: '', max: '' })
                      } else {
                        setPriceRange({ min: bucket.min, max: bucket.max })
                        setCustomPriceMin(bucket.min)
                        setCustomPriceMax(bucket.max)
                      }
                    }}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-center border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] shadow-2xs'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {bucket.label}
                  </button>
                )
              })}
            </div>

            {/* Custom Range Inputs */}
            <form onSubmit={handleApplyCustomPrice} className="flex items-center gap-2 pt-1">
              <input
                type="number"
                placeholder="Min ₹"
                value={customPriceMin}
                onChange={(e) => setCustomPriceMin(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
              />
              <span className="text-neutral-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={customPriceMax}
                onChange={(e) => setCustomPriceMax(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-[#24212A] text-white rounded-lg text-xs font-bold hover:bg-black transition-colors cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. Sizes Accordion */}
      {availableFacets.sizes.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('sizes')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
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
              {availableFacets.sizes.map((sz) => {
                const isSelected = selectedSizes.includes(sz)
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleArrayItem(selectedSizes, setSelectedSizes, sz)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] shadow-2xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {sz}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. Fabric / Material Accordion */}
      {availableFacets.fabrics.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('fabrics')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
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
              {availableFacets.fabrics.map((fb) => {
                const isSelected = selectedFabrics.includes(fb)
                return (
                  <label
                    key={fb}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedFabrics, setSelectedFabrics, fb)}
                        className="w-3.5 h-3.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                      />
                      <span>{fb}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. Color Swatches Accordion */}
      {availableFacets.colors.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('colors')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
          >
            <span>Color</span>
            {expandedSections.colors ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {expandedSections.colors && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {availableFacets.colors.map((colorName) => {
                const isSelected = selectedColors.includes(colorName)
                const lower = colorName.toLowerCase()
                const hexColor = COLOR_HEX_MAP[lower] || '#E5E7EB'

                return (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => toggleArrayItem(selectedColors, setSelectedColors, colorName)}
                    title={colorName}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer relative shadow-2xs ${
                      isSelected
                        ? 'ring-2 ring-[var(--theme-primary)] ring-offset-2 scale-110'
                        : 'hover:scale-105 border-neutral-300'
                    }`}
                    style={{ background: hexColor }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${
                          ['white', 'yellow', 'cream', 'beige', 'cotton'].includes(lower)
                            ? 'text-neutral-900'
                            : 'text-white'
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. Boutiques / Designers Accordion */}
      {availableFacets.boutiques.length > 0 && (
        <div className="border-b border-[#F0E5EC] pb-4">
          <button
            type="button"
            onClick={() => toggleSection('boutiques')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
          >
            <span>Boutique / Atelier</span>
            {expandedSections.boutiques ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {expandedSections.boutiques && (
            <div className="mt-2.5 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableFacets.boutiques.map((bt) => {
                const isSelected = selectedBoutiques.includes(bt)
                return (
                  <label
                    key={bt}
                    className="flex items-center justify-between text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleArrayItem(selectedBoutiques, setSelectedBoutiques, bt)}
                        className="w-3.5 h-3.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                      />
                      <span>{bt}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. Customer Rating Accordion */}
      <div className="border-b border-[#F0E5EC] pb-4">
        <button
          type="button"
          onClick={() => toggleSection('rating')}
          className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
        >
          <span>Customer Rating</span>
          {expandedSections.rating ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {expandedSections.rating && (
          <div className="mt-2.5 space-y-1.5">
            {[4, 3].map((star) => (
              <label
                key={star}
                className="flex items-center gap-2 text-xs text-[#24212A] hover:text-[var(--theme-primary)] cursor-pointer py-1 select-none"
              >
                <input
                  type="radio"
                  name="rating_filter"
                  checked={minRating === String(star)}
                  onChange={() => setMinRating(minRating === String(star) ? '' : String(star))}
                  className="w-3.5 h-3.5 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] border-neutral-300"
                />
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{star}★ & Above</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 9. Explore Sibling Categories in this Department */}
      {relatedCategories.length > 0 && (
        <div className="pb-2">
          <button
            type="button"
            onClick={() => toggleSection('relatedCategories')}
            className="w-full flex items-center justify-between text-left font-bold text-[#24212A] text-xs uppercase tracking-wider py-1 hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
          >
            <span>Other {departmentInfo.title}</span>
            {expandedSections.relatedCategories ? (
              <ChevronUp className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {expandedSections.relatedCategories && (
            <div className="mt-2.5 space-y-1 max-h-48 overflow-y-auto pr-1">
              {relatedCategories.map((rc) => (
                <button
                  key={rc.id}
                  type="button"
                  onClick={() => {
                    if (onNavigateCategory) onNavigateCategory(rc)
                  }}
                  className="w-full text-left py-1 text-xs text-neutral-600 hover:text-[var(--theme-primary)] hover:font-bold transition-all truncate flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate">{rc.name}</span>
                  <span className="text-[10px] text-neutral-400 group-hover:text-[var(--theme-primary)]">
                    &rarr;
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div ref={topRef} className="bg-[#FAF8FA] min-h-screen pb-20">
      {/* 1. Luxury Ecommerce Top Breadcrumb */}
      <div className="border-b border-[#F0E5EC] bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 font-bold text-[var(--theme-primary)] hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <nav className="flex items-center gap-1.5 text-neutral-500 font-medium overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={onBack}
              className="hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
            >
              Home
            </button>
            <span>/</span>
            <span className="text-neutral-500 uppercase tracking-wider text-[11px] shrink-0">
              {departmentInfo.title}
            </span>
            <span>/</span>
            <span
              className={`uppercase tracking-wider text-[11px] shrink-0 ${
                selectedSubId === 'ALL'
                  ? 'font-bold text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 cursor-pointer'
              }`}
              onClick={() => {
                if (selectedSubId !== 'ALL') setSelectedSubId('ALL')
              }}
            >
              {catDisplayName}
            </span>
            {selectedSubId && selectedSubId !== 'ALL' && (
              <>
                <span>/</span>
                <span className="font-bold text-[var(--theme-primary)] uppercase tracking-wider text-[11px] shrink-0">
                  {selectedSubId}
                </span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* 2. Page Header: Title, Count, Active Chips & Sort Controls */}
      <div className="bg-white border-b border-[#F0E5EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-pink-50 text-[var(--theme-primary)] border border-pink-200">
                  {departmentInfo.title}
                </span>
                {categoryData?.name && selectedSubId !== 'ALL' && (
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                    in {catDisplayName}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#24212A] tracking-tight">
                {pageHeading}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Showing{' '}
                <span className="font-bold text-neutral-900">{totalItems}</span>{' '}
                curated styles
                {isShowingDepartmentFallback && (
                  <span className="text-[var(--theme-primary)] ml-1 font-medium">
                    (curated from {departmentInfo.title})
                  </span>
                )}
              </p>
            </div>

            {/* Sort Dropdown & Mobile Filter Trigger */}
            <div className="flex items-center gap-3">
              {/* Mobile Filter Button */}
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-[#24212A] shadow-2xs hover:bg-neutral-50 transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                <span>Filters</span>
                {activeChips.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)] text-white text-[9px] font-extrabold flex items-center justify-center">
                    {activeChips.length}
                  </span>
                )}
              </button>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider hidden sm:inline">
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-[#24212A] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)] cursor-pointer shadow-2xs"
                >
                  <option value="featured">Featured & Curated</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Customer Rating</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {activeChips.length > 0 && (
            <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider shrink-0 mr-1">
                Active Filters:
              </span>
              {activeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-50 text-[var(--theme-primary)] border border-pink-200 shadow-2xs"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.remove}
                    className="hover:text-rose-700 p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-bold text-neutral-500 hover:text-rose-600 underline ml-2 cursor-pointer transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Catalog Layout: Left Filter Sidebar + Right Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* DESKTOP FACETED FILTER SIDEBAR */}
          <aside className="w-64 shrink-0 hidden lg:block sticky top-20 bg-white rounded-3xl p-6 border border-[#F0E5EC] shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-[#F0E5EC] mb-5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--theme-primary)]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#24212A]">
                  Filters
                </span>
              </div>
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {renderFilterOptions()}
          </aside>

          {/* MAIN PRODUCT CATALOG CONTENT */}
          <main className="flex-1 min-w-0">
            {/* Informative Banner when Subcategory has no exact direct stock in demo DB */}
            {isShowingDepartmentFallback && (
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-pink-50/90 via-purple-50/60 to-white border border-pink-200/90 text-xs flex items-start gap-3 shadow-2xs">
                <Info className="w-5 h-5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-[#24212A] text-xs sm:text-sm">
                    Tailoring upcoming styles for &ldquo;{selectedSubId !== 'ALL' ? selectedSubId : catDisplayName}&rdquo;
                  </h4>
                  <p className="text-neutral-600 text-xs leading-relaxed">
                    While new bespoke garments for this specific cut are in production, explore our signature handcrafted styles from {departmentInfo.title} below. Use the filters on the left to refine by fabric, fit, and price.
                  </p>
                </div>
              </div>
            )}

            {/* Loading Skeletons */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl p-4 border border-neutral-200 animate-pulse space-y-3"
                  >
                    <div className="aspect-[3/4] bg-neutral-200 rounded-xl" />
                    <div className="h-4 bg-neutral-200 rounded w-3/4" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                    <div className="h-4 bg-neutral-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : totalItems === 0 ? (
              /* Empty Results Container with Clear Action */
              <div className="bg-white rounded-3xl p-12 text-center border border-[#F0E5EC] max-w-md mx-auto my-8 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-pink-50 border border-pink-200 text-[var(--theme-primary)] flex items-center justify-center mx-auto mb-4">
                  <Store className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-[#24212A]">
                  No matching garments found
                </h3>
                <p className="text-xs text-neutral-500 mt-1 mb-5">
                  We could not find any products matching your current combination of filters. Try clearing some filters or resetting to view the full collection.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-bold hover:opacity-90 transition-all cursor-pointer shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              /* MODERN ECOMMERCE PRODUCT GRID */
              <div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedProducts.map((p) => {
                    const isWishlisted = wishlistIds.map(Number).includes(Number(p.id))
                    const price = p.discount_price || p.actual_price || p.price
                    const originalPrice = p.actual_price || p.original_price
                    const isInCart = cartItems.some(
                      (c) => Number(c.product_id || c.product?.id || c.id) === Number(p.id)
                    )
                    const isCustomizable = isProductCustomizable(p)
                    const discountPercent =
                      p.discount_percentage > 0
                        ? p.discount_percentage
                        : originalPrice && Number(originalPrice) > Number(price) && Number(originalPrice) > 0
                        ? Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)
                        : 0

                    return (
                      <div
                        key={p.unique_id || `${p.id}-${p.variant_id || 0}`}
                        onClick={() => onSelectProduct(p)}
                        className="group card-luxury overflow-hidden flex flex-col cursor-pointer bg-white rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all duration-300"
                      >
                        {/* Garment Image Box */}
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

                          {/* Tailoring Badge */}
                          <div className="absolute top-2 left-2 z-10 pointer-events-none">
                            {isCustomizable ? (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[var(--theme-primary)] border border-pink-200/80 shadow-2xs select-none">
                                <Scissors className="w-2.5 h-2.5 text-[var(--theme-primary)]" />
                                <span>Bespoke Fit</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-neutral-700 border border-neutral-200 shadow-2xs select-none">
                                <span>Ready Made</span>
                              </span>
                            )}
                          </div>

                          {/* Wishlist Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onToggleWishlist) onToggleWishlist(p)
                            }}
                            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                              isWishlisted
                                ? 'bg-pink-50 text-[var(--theme-primary)]'
                                : 'bg-white/90 text-neutral-600 hover:text-black hover:bg-white'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isWishlisted
                                  ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]'
                                  : ''
                              }`}
                            />
                          </button>

                          {/* Desktop Quick Actions on Hover */}
                          <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 hidden sm:flex items-center gap-1.5 z-10">
                            {isInCart ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (onOpenCart) onOpenCart()
                                }}
                                className="flex-1 h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95"
                              >
                                <Check className="w-3 h-3 stroke-[2.5] shrink-0" />
                                <span className="truncate">In Bag</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddToCart({
                                    id: p.id,
                                    title: p.product_name || p.title,
                                    price,
                                    image: p.image || p.img_path || p.main_image,
                                    vendor: p.vendor_name || 'Bespoke Atelier',
                                  })
                                }}
                                className="flex-1 h-8 px-2 bg-[var(--theme-primary)] hover:opacity-90 text-white text-[9.5px] font-bold uppercase tracking-wider shadow-md gap-1 flex items-center justify-center active:scale-95 rounded-lg transition-all cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3 shrink-0" />
                                <span className="truncate">Add to Bag</span>
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
                              className="flex-1 h-8 px-2 bg-neutral-900/95 hover:bg-black text-white rounded-lg text-[9.5px] font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-1 backdrop-blur-md transition-all cursor-pointer active:scale-95 border border-white/10"
                            >
                              <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                              <span className="truncate">Buy Now</span>
                            </button>
                          </div>
                        </div>

                        {/* Garment Information */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between bg-white text-left">
                          <div>
                            {/* Boutique / Shop name */}
                            <p
                              className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider truncate mb-1"
                              title={p.vendor_name || p.shop_name || 'Bespoke Studio'}
                            >
                              {p.vendor_name || p.shop_name || 'Bespoke Studio'}
                            </p>

                            {/* Product Title */}
                            <h3
                              className="text-xs sm:text-sm font-bold text-[#24212A] leading-snug line-clamp-2 group-hover:text-[var(--theme-primary)] transition-colors"
                              title={p.product_name || p.title}
                            >
                              {p.product_name || p.title}
                            </h3>
                          </div>

                          {/* Price & Discount */}
                          <div className="border-t border-neutral-100 mt-3 pt-2.5 flex items-center justify-between gap-1">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-sm sm:text-base font-extrabold text-[var(--theme-primary)]">
                                ₹{price}
                              </span>
                              {originalPrice && Number(originalPrice) > Number(price) && (
                                <span className="text-[11px] text-neutral-400 line-through">
                                  ₹{originalPrice}
                                </span>
                              )}
                            </div>

                            {discountPercent > 0 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-pink-50 text-[var(--theme-primary)] border border-pink-200">
                                {discountPercent}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      disabled={safePage === 1}
                      onClick={() => handlePageChange(safePage - 1)}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        safePage === 1
                          ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                          : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                      const isCurrent = pg === safePage
                      return (
                        <button
                          key={pg}
                          type="button"
                          onClick={() => handlePageChange(pg)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[var(--theme-primary)] text-white shadow-2xs'
                              : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          {pg}
                        </button>
                      )
                    })}

                    <button
                      type="button"
                      disabled={safePage === totalPages}
                      onClick={() => handlePageChange(safePage + 1)}
                      className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        safePage === totalPages
                          ? 'border-neutral-200 text-neutral-300 cursor-not-allowed'
                          : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. MOBILE SLIDE-IN FILTER DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#F0E5EC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[var(--theme-primary)]" />
                <h3 className="font-bold text-[#24212A] text-sm uppercase tracking-wider">
                  Filters & Facets
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-full text-neutral-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {renderFilterOptions()}
            </div>

            {/* Sticky Drawer Footer */}
            <div className="p-4 border-t border-[#F0E5EC] bg-white flex items-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer text-center"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-bold hover:opacity-90 cursor-pointer text-center shadow-2xs"
              >
                Apply ({totalItems})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
