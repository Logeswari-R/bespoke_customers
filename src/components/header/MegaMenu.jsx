import React, { useMemo } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { NAVIGATION_CATEGORIES } from '../../data/navigationData'

export default function MegaMenu({
  category,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onSelectSubcategory,
  onSelectCategory,
}) {
  // Safely normalize sections whether category has .sections or direct .subcategories
  const rawSections = useMemo(() => {
    if (!category) return []

    // 1. Check if category already has populated sections with real subcategories
    const hasValidSections =
      Array.isArray(category.sections) &&
      category.sections.length > 0 &&
      category.sections.some(
        (sec) =>
          Array.isArray(sec.items) &&
          sec.items.length > 0 &&
          sec.items.some((it) => {
            const name = typeof it === 'object' ? it?.name : it
            return name && !String(name).toLowerCase().startsWith('all ')
          })
      )

    if (hasValidSections) {
      return category.sections
    }

    // 2. Fallback: Check NAVIGATION_CATEGORIES for rich pre-populated sections
    const fallbackDept = NAVIGATION_CATEGORIES.find(
      (d) =>
        (d.name || '').toLowerCase().trim() === (category.name || '').toLowerCase().trim() ||
        (d.slug || '').toLowerCase().trim() === (category.slug || category.id || '').toLowerCase().trim() ||
        String(d.type || '') === String(category.type || '')
    )
    if (fallbackDept && Array.isArray(fallbackDept.sections) && fallbackDept.sections.length > 0) {
      return fallbackDept.sections
    }

    // 3. Fallback: Direct category subcategories if present
    if (Array.isArray(category.subcategories) && category.subcategories.length > 0) {
      return [
        {
          title: `${category.name} Collections`,
          items: category.subcategories.map((s) => (typeof s === 'object' ? s.name || s.title : s)),
        },
      ]
    }

    return []
  }, [category])

  if (!isOpen || !category || rawSections.length === 0) return null

  return (
    <div
      role="region"
      aria-label={`${category.name} Category Menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-1/2 -translate-x-1/2 w-[92vw] max-w-4xl z-50 pt-1 pointer-events-auto transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1"
    >
      {/* Invisible hover bridge to maintain hover between navbar item and card */}
      <div className="absolute -top-2 left-0 right-0 h-3 bg-transparent" />

      {/* Floating Luxury Glassmorphism Card */}
      <div className="bg-white/98 backdrop-blur-xl rounded-2xl border border-neutral-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] p-4 sm:p-5 overflow-hidden">
        {/* Dropdown Top Bar */}
        <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#24212A]">
              {category.name}
            </span>
            {category.badge && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-theme-gradient text-white shadow-2xs">
                {category.badge}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (onSelectCategory) {
                onSelectCategory(category)
              } else if (onSelectSubcategory) {
                onSelectSubcategory({
                  category: category.name,
                  categoryId: category.id,
                  section: 'All',
                  subcategory: 'All',
                })
              }
            }}
            className="text-[11px] font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1 transition-colors cursor-pointer group"
          >
            <span>Explore All {category.name}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Content Columns & Editorial Preview */}
        <div className="flex items-start gap-6">
          {/* Subcategory Sections Grid - Balanced 2 or 3 columns */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-5">
            {rawSections.map((section, sIdx) => {
              const items = section.items || []
              const isLongList = items.length > 6

              return (
                <div key={section.title + sIdx} className="space-y-1.5">
                  {/* Section Title */}
                  <div className="relative pb-1 border-b border-neutral-100 flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900 truncate">
                      {section.title}
                    </h4>
                    <div className="h-[2px] w-4 bg-theme-gradient rounded-full shrink-0" />
                  </div>

                  {/* Subcategory Items */}
                  <ul
                    className={
                      isLongList
                        ? 'grid grid-cols-2 gap-x-2 gap-y-0.5'
                        : 'space-y-0.5'
                    }
                    role="menu"
                  >
                    {items.map((rawItem, iIdx) => {
                      const itemTitle =
                        typeof rawItem === 'object'
                          ? rawItem?.name || rawItem?.title || ''
                          : String(rawItem)
                      if (!itemTitle) return null

                      return (
                        <li key={itemTitle + iIdx} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() =>
                              onSelectSubcategory({
                                category: category.name,
                                categoryId: section.categoryId || category.id,
                                section: section.title,
                                subcategory: itemTitle,
                              })
                            }
                            className="group flex items-center text-[12px] text-neutral-600 hover:text-theme-primary py-0.5 transition-all text-left w-full cursor-pointer truncate"
                          >
                            <span className="w-1 h-1 rounded-full bg-transparent group-hover:bg-theme-primary mr-1.5 shrink-0 transition-colors" />
                            <span className="truncate group-hover:font-medium group-hover:translate-x-0.5 transition-transform">
                              {itemTitle}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>

          {/* Compact Right Editorial Card (if available) */}
          {category.featured && (
            <div
              onClick={() =>
                onSelectSubcategory({
                  category: category.name,
                  categoryId: category.id,
                  section: category.sections?.[0]?.title || 'Featured',
                  subcategory: category.sections?.[0]?.items?.[0] || 'All',
                })
              }
              className="hidden lg:flex flex-col justify-between w-48 shrink-0 rounded-xl bg-neutral-100 overflow-hidden relative group cursor-pointer shadow-xs hover:shadow-md transition-shadow border border-neutral-200/60 aspect-[4/3] p-3 text-white"
            >
              <img
                src={category.featured.image}
                alt={category.featured.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

              <div className="relative z-10">
                <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 backdrop-blur-xs">
                  {category.featured.tag || 'Trending'}
                </span>
              </div>

              <div className="relative z-10">
                <h5 className="text-xs font-bold leading-tight line-clamp-1 mb-0.5">
                  {category.featured.title}
                </h5>
                <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-200 group-hover:text-white">
                  <span>{category.featured.cta || 'Explore'}</span>
                  <ArrowRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
