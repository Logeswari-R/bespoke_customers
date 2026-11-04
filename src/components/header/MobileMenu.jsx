import React, { useState, useEffect } from 'react'
import {
  X,
  ChevronDown,
  ChevronRight,
  User,
  Heart,
  ShoppingBag,
  Package,
  HelpCircle,
} from 'lucide-react'
import { NAVIGATION_CATEGORIES } from '../../data/navigationData'
import BrandLogo from './BrandLogo'

export default function MobileMenu({
  categories = NAVIGATION_CATEGORIES,
  isOpen,
  onClose,
  onSelectCategory,
  onSelectSubcategory,
  onOpenCart,
  wishlistCount = 0,
  cartCount = 0,
  onOpenTrackOrder,
  onOpenSupport,
}) {
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const items = categories && categories.length > 0 ? categories : NAVIGATION_CATEGORIES

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = () => {
    setExpandedCategory(null)
    setExpandedSections({})
    onClose()
  }

  const toggleCategory = (catId) => {
    setExpandedCategory((prev) => (prev === catId ? null : catId))
  }

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  const handleSubcategoryClick = (cat, sectionTitle, item) => {
    onSelectSubcategory({
      category: cat.name,
      categoryId: cat.id,
      section: sectionTitle,
      subcategory: item,
    })
    handleClose()
  }

  const handleCategoryHeaderClick = (cat) => {
    onSelectCategory(cat)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs sm:max-w-sm h-full bg-white shadow-2xl flex flex-col z-10 overflow-hidden transform transition-transform duration-300 ease-out">
        {/* Drawer Header with Brand Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-white">
          <BrandLogo onClick={handleClose} />
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-500 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick action bar */}
        <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100 bg-neutral-50/70 text-xs py-3 text-neutral-700">
          <button
            onClick={() => {
              handleClose()
              alert('Opening Account / Profile')
            }}
            className="flex flex-col items-center gap-1 hover:text-black transition-colors cursor-pointer"
          >
            <User className="w-4 h-4 text-neutral-600" />
            <span className="text-[11px] font-medium">Account</span>
          </button>

          <button
            onClick={() => {
              handleClose()
              alert(`Wishlist contains ${wishlistCount} items`)
            }}
            className="flex flex-col items-center gap-1 hover:text-black transition-colors relative cursor-pointer"
          >
            <Heart className="w-4 h-4 text-neutral-600" />
            <span className="text-[11px] font-medium">Wishlist</span>
            {wishlistCount > 0 && (
              <span className="absolute top-0 right-5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              handleClose()
              onOpenCart()
            }}
            className="flex flex-col items-center gap-1 hover:text-black transition-colors relative cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-neutral-600" />
            <span className="text-[11px] font-medium">Bag</span>
            {cartCount > 0 && (
              <span className="absolute top-0 right-5 w-4 h-4 bg-black text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Categories Accordion */}
        <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-neutral-100">
          <div className="pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2">
            Categories
          </div>

          {items.map((cat) => {
            const isCatExpanded = expandedCategory === cat.id

            return (
              <div key={cat.id} className="py-1">
                {/* Main Category Header Row */}
                <div className="flex items-center justify-between w-full py-3 px-2 rounded-lg hover:bg-neutral-50 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleCategoryHeaderClick(cat)}
                    className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.themeColor || '#111827' }}
                    />
                    <span className="text-sm font-bold uppercase tracking-wide text-neutral-900">
                      {cat.name}
                    </span>
                    {cat.badge && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {cat.badge}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="p-1.5 text-neutral-400 hover:text-black transition-transform cursor-pointer"
                    aria-label={`Toggle ${cat.name} subcategories`}
                    aria-expanded={isCatExpanded}
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isCatExpanded ? 'rotate-180 text-black' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Expanded Sections Accordion */}
                {isCatExpanded && (
                  <div className="pl-4 pr-1 pb-3 pt-1 space-y-2 bg-neutral-50/50 rounded-xl my-1 border border-neutral-100">
                    {/* View all button for this category */}
                    <button
                      type="button"
                      onClick={() => handleCategoryHeaderClick(cat)}
                      className="w-full text-left py-2 px-3 text-xs font-bold text-neutral-900 hover:text-black flex items-center justify-between border-b border-neutral-200/60 cursor-pointer"
                    >
                      <span>Explore All {cat.name}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {cat.sections.map((section, sIdx) => {
                      const sectionKey = `${cat.id}-${sIdx}`
                      const isSecExpanded = expandedSections[sectionKey] ?? true // default open for ease

                      return (
                        <div key={sectionKey} className="pt-1">
                          <button
                            type="button"
                            onClick={() => toggleSection(sectionKey)}
                            className="w-full flex items-center justify-between py-1.5 px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:text-black cursor-pointer"
                          >
                            <span>{section.title}</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                                isSecExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isSecExpanded && (
                            <ul className="pl-3 pr-2 py-1 space-y-1">
                              {section.items.map((item) => (
                                <li key={item}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSubcategoryClick(
                                        cat,
                                        section.title,
                                        item
                                      )
                                    }
                                    className="w-full text-left py-1.5 px-3 text-xs text-neutral-600 hover:text-black hover:font-medium transition-colors rounded-md hover:bg-white cursor-pointer"
                                  >
                                    {item}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer info & support */}
        <div className="border-t border-neutral-100 p-4 bg-neutral-50 text-xs text-neutral-600 space-y-2.5">
          <button
            onClick={() => {
              handleClose()
              if (onOpenTrackOrder) onOpenTrackOrder()
            }}
            className="flex items-center gap-2 hover:text-black w-full text-left cursor-pointer"
          >
            <Package className="w-4 h-4 text-neutral-500" />
            <span>Track My Order</span>
          </button>
          <button
            onClick={() => {
              handleClose()
              if (onOpenSupport) onOpenSupport()
            }}
            className="flex items-center gap-2 hover:text-black w-full text-left cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-neutral-500" />
            <span>Help & Customer Support</span>
          </button>
        </div>
      </div>
    </div>
  )
}
