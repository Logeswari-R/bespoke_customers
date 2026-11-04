// Authentic Bespoke Navigation Taxonomy strictly matching Active API Categories & Subcategories
// Filtered to active categories: http://43.204.68.67/bespoke/public/api/categories

export const NAVIGATION_CATEGORIES = [
  {
    id: 'womens',
    name: 'WOMENS',
    slug: 'womens',
    type: '2',
    badge: 'Trending',
    themeColor: 'var(--theme-primary)', // Bespoke signature magenta
    accentClass: 'hover:text-theme-primary focus:text-theme-primary',
    activeBorderClass: 'border-[var(--theme-primary)] text-theme-primary',
    sections: [
      {
        title: 'Indian & Fusion Wear',
        categoryId: 48,
        items: ['Saree', 'Innerwear & Thermals'],
      },
      {
        title: 'Coord',
        categoryId: 53,
        items: ['Top and skirt'],
      },
      {
        title: 'Traditional',
        categoryId: 49,
        items: ['Saree'],
      },
    ],
    featured: {
      tag: 'WOMENS LUXURY',
      title: 'Artisanal Weaves & Silhouettes',
      subtitle: 'Sarees, fusion coords, and traditional cuts direct from atelier.',
      cta: 'Explore Womens',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80',
    },
  },
  {
    id: 'mens',
    name: 'MENS',
    slug: 'mens',
    type: '1',
    badge: 'Popular',
    themeColor: 'var(--theme-secondary)', // Bespoke royal purple
    accentClass: 'hover:text-theme-secondary focus:text-theme-secondary',
    activeBorderClass: 'border-[var(--theme-secondary)] text-theme-secondary',
    sections: [
      {
        title: 'mens',
        categoryId: 44,
        items: ['T Shirt'],
      },
    ],
    featured: {
      tag: 'MENS LUXURY',
      title: 'Modern Classic Fits',
      subtitle: 'T-Shirts, casuals & modern cuts tailored to perfection.',
      cta: 'Shop Mens',
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
    },
  },
  {
    id: 'kids',
    name: 'KIDS',
    slug: 'kids',
    type: '3',
    badge: 'Kids Fest',
    themeColor: '#e91e63',
    accentClass: 'hover:text-[#e91e63] focus:text-[#e91e63]',
    activeBorderClass: 'border-[#e91e63] text-[#e91e63]',
    sections: [
      {
        title: 'Girls Clothing',
        categoryId: 46,
        items: [
          'uniform',
          'dress',
          'Saree',
          'Jacket, Sweater & Sweatshirts',
          'Nightwear & Loungewear',
        ],
      },
    ],
    featured: {
      tag: 'LITTLE ATELIER',
      title: 'Girls & Kids Collections',
      subtitle: 'Breathable, gentle ethnic wear, dresses & uniforms.',
      cta: 'Shop Kids',
      image: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80',
    },
  },
  {
    id: 'non-clothing',
    name: 'NON-CLOTHING',
    slug: 'non-clothing',
    type: '0',
    badge: null,
    themeColor: 'var(--theme-primary)',
    accentClass: 'hover:text-theme-primary focus:text-theme-primary',
    activeBorderClass: 'border-[var(--theme-primary)] text-theme-primary',
    sections: [
      {
        title: 'Cup',
        categoryId: 50,
        items: ['CupWithBottle'],
      },
    ],
    featured: {
      tag: 'LIFESTYLE & LIVING',
      title: 'Accessories & Drinkware',
      subtitle: 'Curated cups, bottles, lifestyle goods & accessories.',
      cta: 'Discover Lifestyle',
      image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80&q=80',
    },
  },
  {
    id: 'unisex-wear',
    name: 'UNISEX WEAR',
    slug: 'unisex-wear',
    type: '4',
    badge: 'New Drop',
    themeColor: '#9c27b0',
    accentClass: 'hover:text-[#9c27b0] focus:text-[#9c27b0]',
    activeBorderClass: 'border-[#9c27b0] text-[#9c27b0]',
    sections: [
      {
        title: 'Test',
        categoryId: 51,
        items: ['Test'],
      },
    ],
    featured: {
      tag: 'UNISEX EDITS',
      title: 'Streetwear & Boxy Fits',
      subtitle: 'Heavyweight graphic tees, hoodies, and signature drops.',
      cta: 'Explore Unisex',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    },
  },
]

export const TRENDING_SEARCHES = [
  'Saree',
  'T Shirt',
  'Top and skirt',
  'uniform',
  'dress',
  'CupWithBottle',
  'Innerwear & Thermals',
]

export const POPULAR_CATEGORIES = [
  { name: 'Indian & Fusion Wear', query: 'Indian & Fusion Wear', badge: 'Hot' },
  { name: 'Girls Clothing', query: 'Girls Clothing', badge: 'Kids' },
  { name: 'Coord', query: 'Coord', badge: 'Trending' },
  { name: 'mens', query: 'mens', badge: 'Popular' },
  { name: 'Traditional', query: 'Traditional', badge: 'Festive' },
  { name: 'Cup', query: 'Cup', badge: 'Lifestyle' },
]

export const SAMPLE_PRODUCTS = [
  {
    id: 446,
    product_name: 'shoes',
    vendor: 'Zudio',
    discount_price: 499,
    actual_price: 500,
    category: 'Footwear',
    image:
      'https://bespoke-2026.s3.ap-south-1.amazonaws.com/products/materials/tNiTuSh60nkNsZQFyLpQ6HxAouzXfX.webp',
  },
  {
    id: 445,
    product_name: 'Slim fit cotton shirt',
    vendor: 'Zudio',
    discount_price: 150,
    actual_price: 155,
    category: 'Top Wear',
    image:
      'https://bespoke-2026.s3.ap-south-1.amazonaws.com/products/materials/s09Xo0Qv2K81N95Qk2sFmXq6YcW7.webp',
  },
  {
    id: 444,
    product_name: 'Woolen fabric shirt',
    vendor: 'Zudio',
    discount_price: 200,
    actual_price: 250,
    category: 'Top Wear',
    image:
      'https://bespoke-2026.s3.ap-south-1.amazonaws.com/products/materials/wL98P0km12qQ91Xk2sFmXq6YcW8.webp',
  },
  {
    id: 443,
    product_name: 'T shirt Oversized',
    vendor: 'Zudio',
    discount_price: 200,
    actual_price: 250,
    category: 'Top Wear',
    image:
      'https://bespoke-2026.s3.ap-south-1.amazonaws.com/products/materials/oP29L0km12qQ91Xk2sFmXq6YcW9.webp',
  },
]
