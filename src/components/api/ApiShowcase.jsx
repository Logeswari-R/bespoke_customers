import React, { useState, useMemo } from 'react'
import {
  Search,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  FolderTree,
  AlertTriangle,
} from 'lucide-react'

export default function ApiShowcase({
  categories = [],
  subcategories = [],
  isLoading = false,
  error = null,
  onRefresh,
  onSelectSubcategory,
  onSelectCategory,
}) {
  const [activeTab, setActiveTab] = useState('categories') // 'categories' | 'subcategories' | 'tree'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState('ALL')
  const [selectedCategoryModal, setSelectedCategoryModal] = useState(null)

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let result = categories
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.subcategories.some((s) => s.name.toLowerCase().includes(q))
      )
    }
    return result
  }, [categories, searchQuery])

  // Filtered subcategories
  const filteredSubcategories = useMemo(() => {
    let result = subcategories
    if (selectedCatFilter !== 'ALL') {
      result = result.filter(
        (s) =>
          s.categoryId === Number(selectedCatFilter) ||
          s.categoryName === selectedCatFilter
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.categoryName?.toLowerCase().includes(q)
      )
    }
    return result
  }, [subcategories, selectedCatFilter, searchQuery])

  const getTypeName = (type) => {
    switch (String(type)) {
      case '1':
        return 'Mens (Type 1)'
      case '2':
        return 'Womens (Type 2)'
      case '3':
        return 'Kids (Type 3)'
      case '0':
        return 'Non-Clothing (Type 0)'
      case '4':
        return 'Unisex / Special (Type 4)'
      default:
        return `Type ${type}`
    }
  }

  const getTypeBadgeColor = (type) => {
    switch (String(type)) {
      case '1':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case '2':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case '3':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case '0':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      default:
        return 'bg-purple-50 text-purple-700 border-purple-200'
    }
  }

  return (
    <section className="bg-neutral-50/70 border-b border-neutral-200/80 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* API Header & Endpoints Info Bar */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-neutral-100">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live API Connected
                </span>
                <span className="text-xs text-neutral-400">|</span>
                <span className="text-xs font-bold text-neutral-600">
                  {categories.length} Categories &bull; {subcategories.length} Subcategories
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-normal">
                API Categories & Subcategories
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl">
                Real-time data fetched from Bespoke's public API endpoints, powering the navigation system, mega menus, and product filtering.
              </p>
              {error && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Refresh Button & Endpoints Links */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
                />
                <span>{isLoading ? 'Fetching API...' : 'Sync API Data'}</span>
              </button>
            </div>
          </div>

          {/* Endpoints Pill Links */}
          <div className="mt-4 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-400 font-semibold uppercase text-[10px] tracking-wider">
                Sources:
              </span>
              <a
                href="http://43.204.68.67/bespoke/public/api/categories"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md font-mono text-[11px] transition-colors"
              >
                <span>/api/categories</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </a>
              <a
                href="http://43.204.68.67/bespoke/public/api/subcategories"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-md font-mono text-[11px] transition-colors"
              >
                <span>/api/subcategories</span>
                <ExternalLink className="w-3 h-3 text-neutral-400" />
              </a>
            </div>

            {/* View Switcher Tabs */}
            <div className="inline-flex p-1 bg-neutral-100 rounded-xl">
              <button
                onClick={() => setActiveTab('categories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setActiveTab('subcategories')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'subcategories'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Subcategories ({subcategories.length})
              </button>
              <button
                onClick={() => setActiveTab('tree')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'tree'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-black'
                }`}
              >
                Taxonomy Tree
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          {/* Search bar inside showcase */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${
                activeTab === 'categories'
                  ? 'categories (e.g. Traditional, Coord, Suits)...'
                  : 'subcategories (e.g. Saree, T-Shirts, Kurtas)...'
              }`}
              className="w-full pl-10 pr-4 py-2 bg-white text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
            />
          </div>

          {/* Subcategory Category Filter Pills */}
          {activeTab === 'subcategories' && (
            <div className="w-full sm:w-auto flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 shrink-0">
                Filter:
              </span>
              <button
                onClick={() => setSelectedCatFilter('ALL')}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
                  selectedCatFilter === 'ALL'
                    ? 'bg-neutral-900 text-white'
                    : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                All ({subcategories.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatFilter(String(cat.id))}
                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold shrink-0 cursor-pointer transition-all ${
                    selectedCatFilter === String(cat.id)
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {cat.name} ({cat.subcategories.length})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: Categories Cards Grid */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCategories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setSelectedCategoryModal(cat)}
                className="group bg-white rounded-2xl overflow-hidden border border-neutral-200/80 hover:border-neutral-400 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Category Image */}
                <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback placeholder if image load fails
                      e.target.src =
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80'
                    }}
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeBadgeColor(
                        cat.type
                      )} bg-white/90 backdrop-blur-xs shadow-xs`}
                    >
                      {getTypeName(cat.type)}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="text-[10px] font-bold bg-black/75 backdrop-blur-xs text-white px-2 py-0.5 rounded-full">
                      ID: {cat.id}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-black uppercase">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {cat.subcategories.length}{' '}
                      {cat.subcategories.length === 1
                        ? 'Subcategory'
                        : 'Subcategories'}
                    </p>
                  </div>

                  {/* Subcategory Preview Chips */}
                  <div className="mt-3 pt-3 border-t border-neutral-100">
                    <div className="flex flex-wrap gap-1">
                      {cat.subcategories.slice(0, 4).map((sub) => (
                        <span
                          key={sub.id}
                          className="text-[11px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          {sub.name}
                        </span>
                      ))}
                      {cat.subcategories.length > 4 && (
                        <span className="text-[11px] text-neutral-400 px-1 py-0.5 font-bold">
                          +{cat.subcategories.length - 4} more
                        </span>
                      )}
                      {cat.subcategories.length === 0 && (
                        <span className="text-[11px] text-neutral-400 italic">
                          No subcategories attached
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between text-xs font-bold text-neutral-900">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onSelectCategory) onSelectCategory(cat)
                      }}
                      className="text-neutral-500 hover:text-black hover:underline cursor-pointer"
                    >
                      Filter Catalog
                    </button>
                    <span className="flex items-center gap-1 group-hover:underline">
                      <span>Subcategories</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: Subcategories Grid */}
        {activeTab === 'subcategories' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredSubcategories.map((sub) => (
              <div
                key={sub.id}
                onClick={() =>
                  onSelectSubcategory({
                    category: sub.categoryName,
                    categoryId: sub.categoryId,
                    subcategory: sub.name,
                  })
                }
                className="group bg-white rounded-xl overflow-hidden border border-neutral-200/80 hover:border-neutral-400 hover:shadow-lg transition-all duration-200 flex flex-col cursor-pointer"
              >
                {/* Subcategory Image */}
                <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                  <img
                    src={sub.image}
                    alt={sub.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=400&q=80'
                    }}
                  />
                  <div className="absolute top-1.5 right-1.5">
                    <span className="text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.2 rounded">
                      #{sub.id}
                    </span>
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                      {sub.categoryName}
                    </p>
                    <h4 className="text-xs font-bold text-neutral-900 group-hover:text-black truncate mt-0.5">
                      {sub.name}
                    </h4>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="group-hover:text-neutral-900 font-medium">
                      View items
                    </span>
                    <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: Taxonomy Tree View */}
        {activeTab === 'tree' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-neutral-100">
              <FolderTree className="w-5 h-5 text-neutral-700" />
              <h3 className="text-base font-bold text-neutral-900">
                Complete Category & Subcategory Hierarchy
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-neutral-900" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                        {cat.name}
                      </h4>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getTypeBadgeColor(
                        cat.type
                      )}`}
                    >
                      {getTypeName(cat.type)}
                    </span>
                  </div>

                  {/* Subcategories list */}
                  <ul className="pl-4 space-y-1.5 border-l-2 border-neutral-200 text-xs">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <button
                          onClick={() =>
                            onSelectSubcategory({
                              category: cat.name,
                              categoryId: cat.id,
                              subcategory: sub.name,
                            })
                          }
                          className="text-neutral-600 hover:text-black hover:font-bold transition-all text-left flex items-center justify-between w-full py-0.5 cursor-pointer"
                        >
                          <span>{sub.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ID: {sub.id}
                          </span>
                        </button>
                      </li>
                    ))}
                    {cat.subcategories.length === 0 && (
                      <li className="text-neutral-400 italic text-[11px]">
                        No subcategories attached
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal for Selected Category */}
      {selectedCategoryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={() => setSelectedCategoryModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <img
                  src={selectedCategoryModal.image}
                  alt={selectedCategoryModal.name}
                  className="w-12 h-12 object-cover rounded-xl bg-neutral-100"
                />
                <div>
                  <h3 className="text-base font-bold text-neutral-900 uppercase">
                    {selectedCategoryModal.name}
                  </h3>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mt-1 ${getTypeBadgeColor(
                      selectedCategoryModal.type
                    )}`}
                  >
                    {getTypeName(selectedCategoryModal.type)} &bull; ID:{' '}
                    {selectedCategoryModal.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="py-4 flex-1 overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                Subcategories ({selectedCategoryModal.subcategories.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {selectedCategoryModal.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onSelectSubcategory({
                        category: selectedCategoryModal.name,
                        categoryId: selectedCategoryModal.id,
                        subcategory: sub.name,
                      })
                      setSelectedCategoryModal(null)
                    }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/70 text-left transition-colors cursor-pointer group"
                  >
                    {sub.image && (
                      <img
                        src={sub.image}
                        alt={sub.name}
                        className="w-8 h-8 rounded object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 truncate group-hover:text-black">
                        {sub.name}
                      </p>
                      <p className="text-[10px] text-neutral-400">ID: {sub.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
