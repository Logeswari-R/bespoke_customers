import React from 'react'
import { ChevronRight, Sparkles } from 'lucide-react'

export default function CategoriesSection({
  categories = [],
  onSelectCategory,
  onViewAll,
}) {
  if (!categories || categories.length === 0) return null

  return (
    <section className="py-8 bg-white border-b border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--theme-primary)] bg-pink-50 px-2.5 py-0.5 rounded-full mb-1 border border-pink-200/60 shadow-2xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Atelier Curations</span>
            </div>
            <h2 className="text-[22px] sm:text-[24px] font-semibold tracking-normal text-[#24212A]">
              Handcrafted <span className="text-theme-gradient">Categories</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer group"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Responsive Desktop Web & Mobile Grid with Smooth Micro-Lifts */}
        <div className="grid grid-cols-5 sm:grid-cols-5 md:grid-cols-10 gap-3 sm:gap-4 lg:gap-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="group flex flex-col items-center text-center cursor-pointer transition-all duration-300 hover:-translate-y-1.5 active:scale-95"
            >
              {/* Category Image Box with Luxury Ring & Glow */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-22 lg:h-22 rounded-2xl overflow-hidden bg-gradient-to-b from-neutral-50 to-neutral-100 border border-neutral-200/90 p-1 shadow-xs group-hover:shadow-lg group-hover:shadow-pink-500/15 group-hover:border-[var(--theme-primary)] group-hover:ring-2 group-hover:ring-pink-200/70 transition-all duration-300">
                <img
                  src={
                    cat.image_url ||
                    cat.cover_image ||
                    cat.img_path ||
                    cat.image
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover rounded-xl group-hover:scale-108 transition-transform duration-500 ease-out"
                  onError={(e) => {
                    e.target.src =
                      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80'
                  }}
                />
              </div>

              {/* Category Name */}
              <span className="mt-2 text-[11px] sm:text-xs font-bold text-neutral-800 group-hover:text-theme-primary transition-colors line-clamp-1 capitalize tracking-tight">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
