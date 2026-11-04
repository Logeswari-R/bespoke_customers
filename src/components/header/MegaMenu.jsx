import React, { useMemo } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function MegaMenu({
  category,
  isOpen,
  onMouseEnter,
  onMouseLeave,
  onSelectSubcategory,
}) {
  // Safely normalize sections whether category has .sections or direct .subcategories
  const rawSections = useMemo(() => {
    if (!category) return []
    if (category.sections && category.sections.length > 0) {
      return category.sections
    }
    return [
      {
        title: `${category.name} Subcategories`,
        items:
          category.subcategories && category.subcategories.length > 0
            ? category.subcategories.map((s) => s.name || s)
            : [`All ${category.name}`],
      },
    ]
  }, [category])

  // Sort sections by item count / length descending so primary sections anchor top
  const sortedSections = useMemo(() => {
    return [...rawSections].sort((a, b) => {
      const lenA = a.items?.length || 0
      const lenB = b.items?.length || 0
      if (lenB !== lenA) return lenB - lenA
      return (a.title || '').localeCompare(b.title || '')
    })
  }, [rawSections])

  // Distribute sections across balanced vertical columns based on total item length & height
  const columns = useMemo(() => {
    if (!sortedSections || sortedSections.length === 0) return []

    // Calculate total items across all sections
    const totalItems = sortedSections.reduce((sum, s) => sum + (s.items?.length || 0), 0)

    // Intelligently determine column count based on density and length
    // Avoids sparse 1-item columns with huge empty vertical gaps
    let numCols = 1
    if (totalItems >= 28 && sortedSections.length >= 4) {
      numCols = 4
    } else if (totalItems >= 14 && sortedSections.length >= 3) {
      numCols = 3
    } else if (sortedSections.length >= 2) {
      numCols = 2
    } else {
      numCols = 1
    }

    const cols = Array.from({ length: numCols }, () => [])
    const heights = Array.from({ length: numCols }, () => 0)

    for (const section of sortedSections) {
      // Find column with the lowest cumulative height
      let minIdx = 0
      for (let i = 1; i < numCols; i++) {
        if (heights[i] < heights[minIdx]) {
          minIdx = i
        }
      }
      cols[minIdx].push(section)
      // Weight accounts for item count plus section header and padding
      const weight = (section.items?.length || 1) + 2.5
      heights[minIdx] += weight
    }

    // Filter out any accidentally empty columns
    return cols.filter((col) => col.length > 0)
  }, [sortedSections])

  if (!isOpen || !category) return null

  return (
    <div
      role="region"
      aria-label={`${category.name} Mega Menu`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute top-full left-0 right-0 w-full bg-white border-t border-b border-neutral-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-40 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
        <div className="grid grid-cols-12 gap-8 items-start">
          {/* Subcategory Columns - Balanced vertical distribution based on length */}
          <div
            className={`${
              category.featured ? 'col-span-8 md:col-span-9' : 'col-span-12'
            } grid gap-8 ${
              columns.length === 1
                ? 'grid-cols-1 max-w-xs'
                : columns.length === 2
                ? 'grid-cols-2 max-w-xl'
                : columns.length === 3
                ? 'grid-cols-3'
                : 'grid-cols-4'
            }`}
          >
            {columns.map((columnSections, colIdx) => (
              <div key={colIdx} className="flex flex-col space-y-6">
                {columnSections.map((section, sIdx) => (
                  <div key={section.title + sIdx} className="space-y-3">
                    {/* Column Section Title */}
                    <div className="relative pb-2 border-b border-neutral-100">
                      <h3
                        className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center justify-between"
                        style={{ letterSpacing: '0.08em' }}
                      >
                        <span>{section.title}</span>
                      </h3>
                      {/* Subtle color accent indicator */}
                      <div
                        className="absolute bottom-[-1px] left-0 h-[2.5px] w-10 rounded-full"
                        style={{
                          background: 'var(--theme-gradient)',
                        }}
                      />
                    </div>

                    {/* Subcategory Item Links */}
                    <ul className="space-y-1.5" role="menu">
                      {section.items.map((item) => (
                        <li key={item} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() =>
                              onSelectSubcategory({
                                category: category.name,
                                categoryId: section.categoryId || category.id,
                                section: section.title,
                                subcategory: item,
                              })
                            }
                            className="group flex items-center text-[13px] text-neutral-600 hover:text-theme-primary py-0.5 transition-all duration-150 text-left w-full cursor-pointer"
                          >
                            <span className="relative font-normal group-hover:font-semibold group-hover:translate-x-1 transition-transform duration-150 inline-block">
                              {item}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right Editorial / Featured Card */}
          {category.featured && (
            <div className="col-span-4 md:col-span-3 border-l border-neutral-100 pl-8 flex flex-col justify-between">
              <div
                onClick={() =>
                  onSelectSubcategory({
                    category: category.name,
                    categoryId: category.id,
                    section: category.sections[0]?.title || 'Featured',
                    subcategory: category.sections[0]?.items[0] || 'All',
                  })
                }
                className="group relative block overflow-hidden rounded-xl bg-neutral-100 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={category.featured.image}
                    alt={category.featured.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest bg-white/90 backdrop-blur-sm text-neutral-900 px-2.5 py-1 rounded-full shadow-sm">
                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                      {category.featured.tag}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h4 className="text-base font-bold tracking-tight mb-1">
                      {category.featured.title}
                    </h4>
                    <p className="text-xs text-neutral-200 line-clamp-2 mb-3 font-light">
                      {category.featured.subtitle}
                    </p>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-white group-hover:underline">
                      <span>{category.featured.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick perks footer */}
              <div className="mt-4 pt-3 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
                <span>Free 30-Day Returns</span>
                <span className="font-semibold text-neutral-900">100% Authentic</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

