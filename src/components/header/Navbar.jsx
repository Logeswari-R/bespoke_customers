import React from 'react'
import { NAVIGATION_CATEGORIES } from '../../data/navigationData'

export default function Navbar({
  categories = NAVIGATION_CATEGORIES,
  activeCategory,
  selectedCategory,
  onCategoryHover,
  onCategoryClick,
  onNavMouseLeave,
}) {
  const items = categories && categories.length > 0 ? categories : NAVIGATION_CATEGORIES

  return (
    <nav
      className="hidden md:flex items-center justify-center border-t border-neutral-100 relative bg-white"
      aria-label="Main Navigation"
      onMouseLeave={onNavMouseLeave}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-center">
        <ul className="flex items-center space-x-1 lg:space-x-8" role="menubar">
          {items.map((cat) => {
            const isHovered = activeCategory?.id === cat.id
            const isSelected = selectedCategory === cat.name

            return (
              <li
                key={cat.id}
                role="none"
                className="relative py-3.5"
                onMouseEnter={() => onCategoryHover(cat)}
              >
                <button
                  type="button"
                  role="menuitem"
                  aria-haspopup="true"
                  aria-expanded={isHovered}
                  onClick={() => onCategoryClick(cat)}
                  className={`relative px-3 py-1 text-[13.5px] font-medium transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5 ${
                    isHovered
                      ? 'text-[#C00078]'
                      : isSelected
                      ? 'text-[#C00078] font-semibold'
                      : 'text-[#24212A] hover:text-[#C00078]'
                  }`}
                >
                  <span>{cat.name}</span>

                  {/* Promotional mini-badge with Bespoke brand styling */}
                  {cat.badge && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-none tracking-normal bg-theme-gradient text-white shadow-xs">
                      {cat.badge}
                    </span>
                  )}

                  {/* Active bottom border indicator on hover or selected */}
                  <span
                    className={`absolute bottom-[-14px] left-0 right-0 h-[3px] rounded-full transition-all duration-200 ${
                      isHovered
                        ? 'opacity-100 scale-x-100'
                        : isSelected
                        ? 'opacity-100 scale-x-75'
                        : 'opacity-0 scale-x-0'
                    }`}
                    style={{
                      background: 'var(--theme-gradient)',
                    }}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
