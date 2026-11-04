import React from 'react'
import { ChevronRight } from 'lucide-react'

export default function CategoriesSection({
  categories = [],
  onSelectCategory,
  onViewAll,
}) {
  if (!categories || categories.length === 0) return null

  return (
    <section className="py-7 bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
              Handcrafted <span className="text-theme-gradient">Categories</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 hidden sm:block">
              Browse tailored collections and handcrafted apparel direct from master artisans
            </p>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer group"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Responsive Desktop Web & Mobile Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3 sm:gap-4 lg:gap-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="group flex flex-col items-center text-center cursor-pointer transition-transform hover:-translate-y-1.5 duration-200"
            >
              {/* Category Image Box */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 rounded-2xl overflow-hidden bg-gradient-to-b from-neutral-50 to-neutral-100 border border-neutral-200/90 p-1 shadow-xs group-hover:shadow-lg group-hover:border-[var(--theme-primary)] transition-all">
                <img
                  src={
                    cat.image_url ||
                    cat.cover_image ||
                    cat.img_path ||
                    cat.image
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-108 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80'
                  }}
                />
              </div>

              {/* Category Name */}
              <span className="mt-2 text-[11px] sm:text-xs font-bold text-neutral-800 group-hover:text-theme-primary transition-colors line-clamp-1 capitalize">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
