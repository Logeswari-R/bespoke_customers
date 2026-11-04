import React, { useState, useEffect, useMemo } from 'react'
import {
  Heart,
  ShoppingBag,
  ArrowLeft,
  Truck,
  RotateCcw,
  ShieldCheck,
  Scissors,
  Check,
  Star,
  MapPin,
  Sparkles,
  Share2,
  CheckCircle2,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Plus,
  Tag,
} from 'lucide-react'
import { getProductDetails, formatImageUrl } from '../../services/api'
import WriteReviewModal from '../common/WriteReviewModal'

export default function ProductDetailPage({
  productId,
  initialProduct = null,
  currentUser = null,
  onBack,
  onAddToCart,
  _onSelectProduct,
  wishlistIds = [],
  onToggleWishlist,
}) {
  const [product, setProduct] = useState(initialProduct)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(0)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(!initialProduct)
  const [addedNotice, setAddedNotice] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [pincode, setPincode] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [includeAlteration, setIncludeAlteration] = useState(false)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const [previewReviewImage, setPreviewReviewImage] = useState(null)

  // Fetch full product details from API: http://43.204.68.67/bespoke/public/api/show/product?product_id=...
  useEffect(() => {
    let ignore = false
    const targetId = productId || initialProduct?.id || initialProduct?.product_id
    if (!targetId) return

    async function loadDetails() {
      setIsLoading(true)
      try {
        console.log(`[Bespoke PDP] Fetching show/product?product_id=${targetId}`)
        const data = await getProductDetails(targetId)
        if (!ignore && data) {
          setProduct(data)
          setSelectedMaterialIdx(0)
          setSelectedAddons([])

          // Set initial size if available
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(String(data.sizes[0]))
          }
        }
      } catch (err) {
        console.error(`Failed to load product details for #${targetId}:`, err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadDetails()
    return () => {
      ignore = true
    }
  }, [productId, initialProduct?.id, initialProduct?.product_id])

  // Scroll to top when product ID changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [productId])

  // Materials / Color Variations from API: product_materials
  const materials = useMemo(() => {
    if (!product) return []
    if (product.product_materials && Array.isArray(product.product_materials) && product.product_materials.length > 0) {
      return product.product_materials
    }
    if (product.materials && Array.isArray(product.materials) && product.materials.length > 0) {
      return product.materials
    }
    return []
  }, [product])

  // Collect all customer review photos across all reviews
  const allReviewPhotos = useMemo(() => {
    const photos = []
    if (product && Array.isArray(product.reviews)) {
      product.reviews.forEach((r) => {
        const imgs = r.review_images || r.images || r.reviewImages || []
        imgs.forEach((imgObj) => {
          const raw = typeof imgObj === 'string'
            ? imgObj
            : (imgObj.image_url || imgObj.image || imgObj.img_path || imgObj.image_path || imgObj.url)
          const url = formatImageUrl(raw)
          if (url && !photos.includes(url)) photos.push(url)
        })
      })
    }
    return photos
  }, [product])

  const currentMaterial = materials[selectedMaterialIdx] || materials[0] || null

  // Gallery images for the active material
  const galleryImages = useMemo(() => {
    const list = []
    const seen = new Set()
    const pushImg = (raw) => {
      const url = formatImageUrl(raw)
      if (url && !seen.has(url)) {
        seen.add(url)
        list.push(url)
      }
    }

    // 1. Current material images
    if (currentMaterial?.images && Array.isArray(currentMaterial.images)) {
      currentMaterial.images.forEach((imgObj) => {
        pushImg(imgObj.img_path || imgObj.image || imgObj.url || imgObj)
      })
    }
    if (currentMaterial?.main_img_path) pushImg(currentMaterial.main_img_path)

    // 2. Product lowest price main image or main_image
    if (product?.lowest_price_main_image) pushImg(product.lowest_price_main_image)
    if (product?.main_image) pushImg(product.main_image)
    if (product?.images && Array.isArray(product.images)) {
      product.images.forEach((imgObj) => {
        pushImg(imgObj.img_path || imgObj.image || imgObj)
      })
    }

    if (list.length === 0) {
      list.push(
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80'
      )
    }
    return list
  }, [currentMaterial, product])

  // Active display image
  const displayImage = selectedImage && galleryImages.includes(selectedImage)
    ? selectedImage
    : galleryImages[0]

  // Available sizes & price list for the current material
  const materialPrices = useMemo(() => {
    if (!currentMaterial?.prices) return []
    const readyMade = currentMaterial.prices.ready_made_products || []
    const customizable = currentMaterial.prices.customizable_products || []
    return [...readyMade, ...customizable]
  }, [currentMaterial])

  const availableSizes = useMemo(() => {
    if (materialPrices.length > 0) {
      return materialPrices.map((p) => {
        const sizeStr = String(p.size || 'Free Size')
        const discPrice = parseFloat(p.discount_price ?? p.actual_price) || 0
        const actPrice = parseFloat(p.actual_price) || discPrice
        const quantity = parseInt(p.qty ?? 10, 10)
        const inStock = p.is_out_stock !== '1' && p.is_out_stock !== 1 && (p.qty === undefined || quantity > 0)

        return {
          id: p.id || p.price_id,
          size: sizeStr,
          actualPrice: actPrice,
          discountPrice: discPrice,
          qty: quantity,
          inStock,
        }
      })
    }

    if (product?.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) {
      const baseOffer = parseFloat(product.offer_price ?? product.price) || 113
      const baseActual = parseFloat(product.actual_price ?? product.original_price) || baseOffer
      return product.sizes.map((s) => ({
        id: s,
        size: String(s),
        actualPrice: baseActual,
        discountPrice: baseOffer,
        qty: 10,
        inStock: true,
      }))
    }

    const defOffer = parseFloat(product?.offer_price ?? product?.price) || 113
    const defActual = parseFloat(product?.actual_price ?? product?.original_price) || defOffer
    return [
      {
        id: 'standard',
        size: product?.is_free_size ? 'Free Size' : 'Standard',
        actualPrice: defActual,
        discountPrice: defOffer,
        qty: 10,
        inStock: true,
      },
    ]
  }, [materialPrices, product])

  // Active size object
  const activeSizeObj = useMemo(() => {
    if (selectedSize) {
      const found = availableSizes.find((s) => s.size === selectedSize)
      if (found) return found
    }
    return availableSizes.find((s) => s.inStock) || availableSizes[0]
  }, [availableSizes, selectedSize])

  // Pricing calculations
  const baseDiscountPrice =
    activeSizeObj?.discountPrice ||
    parseFloat(product?.offer_price ?? product?.price) ||
    0
  const baseActualPrice =
    activeSizeObj?.actualPrice ||
    parseFloat(product?.actual_price ?? product?.original_price) ||
    baseDiscountPrice

  // Addons calculations
  const availableAddons = currentMaterial?.addons || []
  const addonsTotal = selectedAddons.reduce(
    (sum, a) => sum + (parseFloat(a.price ?? a.amount) || 0),
    0
  )

  // Alteration charge
  const alterCharge = parseFloat(product?.alter_charge) || 0
  const alterationTotal = includeAlteration ? alterCharge : 0

  const finalUnitPrice = baseDiscountPrice + addonsTotal + alterationTotal
  const finalOriginalUnitPrice = baseActualPrice + addonsTotal + alterationTotal

  const discountPercent =
    baseActualPrice > baseDiscountPrice && baseActualPrice > 0
      ? Math.round(((baseActualPrice - baseDiscountPrice) / baseActualPrice) * 100)
      : 0

  // Switching material handler
  const handleSelectMaterial = (idx) => {
    setSelectedMaterialIdx(idx)
    setSelectedAddons([])
    const newMat = materials[idx]
    if (newMat?.images && newMat.images.length > 0) {
      const first = newMat.images[0]
      setSelectedImage(formatImageUrl(first.img_path || first.image || first))
    }
  }

  // Toggling add-ons
  const handleToggleAddon = (addon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id)
      if (exists) {
        return prev.filter((a) => a.id !== addon.id)
      }
      return [...prev, addon]
    })
  }

  // Gallery next/prev
  const handleNextImage = () => {
    const currIdx = galleryImages.indexOf(displayImage)
    const nextIdx = (currIdx + 1) % galleryImages.length
    setSelectedImage(galleryImages[nextIdx])
  }

  const handlePrevImage = () => {
    const currIdx = galleryImages.indexOf(displayImage)
    const prevIdx = (currIdx - 1 + galleryImages.length) % galleryImages.length
    setSelectedImage(galleryImages[prevIdx])
  }

  // Pincode validation helper
  const handleCheckPincode = (e) => {
    e.preventDefault()
    if (pincode.trim().length === 6 && /^\d+$/.test(pincode.trim())) {
      setPincodeStatus({
        valid: true,
        message: 'Delivery available in 2 - 3 business days! Cash on delivery & Express courier active.',
      })
    } else {
      setPincodeStatus({
        valid: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      })
    }
  }

  // Handle Share link
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  if (isLoading && !product) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 bg-white">
        <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin" />
        <h3 className="mt-5 text-sm font-bold text-neutral-800 tracking-wide uppercase">
          Loading Product #{productId}...
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Connecting to Bespoke live API
        </p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white">
        <h3 className="text-lg font-bold text-neutral-800">Product Not Found</h3>
        <p className="mt-2 text-xs text-neutral-500 max-w-sm text-center">
          Product #{productId} could not be retrieved from the API.
        </p>
        <button
          onClick={onBack}
          className="mt-6 px-6 py-2.5 btn-theme text-xs"
        >
          &larr; Back to Catalog
        </button>
      </div>
    )
  }

  // Structured fields from API
  const title = product.product_name || product.name || product.title || 'Bespoke Item'
  const brand =
    product.vendor?.shop_name ||
    product.vendor?.brand_business_name ||
    product.vendor_name ||
    'Bespoke Atelier'
  const categoryName = product.category?.name || product.category_name || 'Traditional'
  const subcategoryName = product.subcategory?.name || product.subcategory_name || ''
  const gender = product.gender || ''
  const description =
    product.description ||
    currentMaterial?.description ||
    'Artisanally crafted with premium textiles and precise attention to silhouette. Designed for timeless elegance and effortless comfort.'
  const rating = parseFloat(product.rating || product.ratings?.total_average || 5)
  const ratingCount =
    product.ratings?.total_reviews || product.total_reviews || 1
  const isCustomizable = Boolean(
    product.is_customizable ||
      (product.product_types && product.product_types.includes('CUSTOMIZABLE'))
  )
  const isAlter = Boolean(product.is_alter)
  const isWishlisted = wishlistIds.map(Number).includes(Number(product.id))

  const handleAdd = () => {
    if (onAddToCart) {
      onAddToCart({
        id: product.id,
        productId: product.id,
        price_id: activeSizeObj?.id || activeSizeObj?.price_id || null,
        title,
        price: finalUnitPrice,
        originalPrice: finalOriginalUnitPrice,
        image: displayImage,
        vendor: brand,
        size: activeSizeObj?.size || 'Standard',
        material: currentMaterial?.name || null,
        materialId: currentMaterial?.id || null,
        addons: selectedAddons,
        quantity,
        alteration: includeAlteration,
      })
    }
    setAddedNotice(
      `Added "${title}" (${currentMaterial?.name ? currentMaterial.name + ', ' : ''}${activeSizeObj?.size || ''} x ${quantity}) to your bag!`
    )
    setTimeout(() => setAddedNotice(null), 3500)
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Toast Notification */}
      {addedNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 border border-neutral-700">
          <div className="w-5 h-5 rounded-full bg-theme-gradient flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-white stroke-[3]" />
          </div>
          <span>{addedNotice}</span>
        </div>
      )}

      {/* Top Breadcrumb Navigation */}
      <div className="border-b border-neutral-200/80 bg-neutral-50/80 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-neutral-500 truncate">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 font-bold text-theme-primary hover:text-theme-secondary transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-neutral-300">/</span>
            <span
              className="hover:text-neutral-900 transition-colors cursor-pointer"
              onClick={onBack}
            >
              Home
            </span>
            <span className="text-neutral-300">/</span>
            <span className="capitalize">{categoryName}</span>
            {subcategoryName && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="capitalize">{subcategoryName}</span>
              </>
            )}
            <span className="text-neutral-300">/</span>
            <span className="font-semibold text-neutral-800 truncate max-w-[180px] sm:max-w-xs">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="text-neutral-500 hover:text-neutral-900 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              title="Share Product"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {copiedLink ? 'Link Copied!' : 'Share'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main PDP Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Image Gallery (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
            {/* Thumbnails Sidebar */}
            {galleryImages.length > 1 && (
              <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto sm:max-h-[580px] no-scrollbar shrink-0 py-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      displayImage === img
                        ? 'border-[var(--theme-primary)] shadow-sm scale-102 ring-2 ring-[var(--theme-primary)]/20'
                        : 'border-neutral-200 hover:border-neutral-400 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Featured Image Box */}
            <div className="relative flex-1 aspect-[3/4] bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/90 shadow-sm group">
              <img
                src={displayImage}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
              />

              {/* Prev / Next Image Floating Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer shadow-md z-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer shadow-md z-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Top Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {discountPercent > 0 && (
                  <span className="badge-theme text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">
                    {discountPercent}% OFF
                  </span>
                )}
                {isCustomizable && (
                  <span className="bg-neutral-900/90 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-xs flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" />
                    Customizable
                  </span>
                )}
                {gender && (
                  <span className="bg-white/90 text-neutral-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-xs shadow-sm">
                    {gender}
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                className={`absolute top-4 right-4 p-3 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer z-10 ${
                  isWishlisted
                    ? 'bg-pink-50 text-theme-primary'
                    : 'bg-white/95 text-neutral-700 hover:text-black'
                }`}
                aria-label="Wishlist toggle"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isWishlisted ? 'fill-[var(--theme-primary)] stroke-[var(--theme-primary)]' : ''
                  }`}
                />
              </button>

              {/* Rating Pill on Bottom-Left */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-xs font-bold text-neutral-800 border border-neutral-200/70">
                <span className="flex items-center gap-0.5 text-emerald-700 font-extrabold">
                  {rating.toFixed(1)}{' '}
                  <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                </span>
                <span className="text-neutral-300">|</span>
                <span className="text-neutral-500 font-medium text-[11px]">
                  {ratingCount} verified review{ratingCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Actions & Specs (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            {/* Brand & Title */}
            <div className="border-b border-neutral-200/70 pb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest font-black text-theme-primary flex items-center gap-1">
                  {brand}
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-neutral-100 text-neutral-700 font-mono font-bold px-2 py-0.5 rounded border border-neutral-200">
                    Product #{productId || product.id}
                  </span>
                  {product.hsn_code && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      HSN: {product.hsn_code}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 mt-1.5 tracking-tight leading-snug">
                {title}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-600 mt-2 line-clamp-2 leading-relaxed">
                {description}
              </p>

              {/* Pricing Display */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                  ₹{finalUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>

                {finalOriginalUnitPrice > finalUnitPrice && (
                  <>
                    <span className="text-sm sm:text-base text-neutral-400 line-through font-medium">
                      ₹{finalOriginalUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-theme-primary">
                      ({discountPercent}% OFF)
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Inclusive of all taxes & doorstep delivery
              </p>
            </div>

            {/* Material & Color Variants (from product_materials) */}
            {materials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Select Variant / Color</span>
                  </span>
                  {currentMaterial && (
                    <span className="text-xs text-theme-primary font-bold">
                      {currentMaterial.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {materials.map((mat, idx) => {
                    const isSelected = selectedMaterialIdx === idx
                    const previewImg =
                      mat.images?.[0]?.img_path ||
                      mat.main_img_path ||
                      product.lowest_price_main_image
                    const pricePreview =
                      mat.prices?.ready_made_products?.[0]?.discount_price ||
                      mat.prices?.customizable_products?.[0]?.discount_price

                    return (
                      <button
                        key={mat.id || idx}
                        type="button"
                        onClick={() => handleSelectMaterial(idx)}
                        className={`p-2 rounded-xl text-left transition-all border cursor-pointer flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-[var(--theme-primary)] bg-pink-50/50 shadow-sm ring-1 ring-[var(--theme-primary)]'
                            : 'border-neutral-200 bg-white hover:border-neutral-400'
                        }`}
                      >
                        {previewImg && (
                          <img
                            src={formatImageUrl(previewImg)}
                            alt={mat.name}
                            className="w-10 h-12 rounded-lg object-cover shrink-0 border border-neutral-200"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {mat.name}
                          </p>
                          {pricePreview && (
                            <p className="text-[11px] font-extrabold text-theme-primary mt-0.5">
                              ₹{parseFloat(pricePreview).toFixed(2)}
                            </p>
                          )}
                          <p className="text-[10px] text-neutral-400">
                            {mat.images?.length || 1} photo{mat.images?.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  <span>Size & Measurement Guide</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {availableSizes.map((sizeObj) => {
                  const isSelected = activeSizeObj?.size === sizeObj.size
                  const inStock = sizeObj.inStock

                  return (
                    <button
                      key={sizeObj.id || sizeObj.size}
                      type="button"
                      disabled={!inStock}
                      onClick={() => setSelectedSize(sizeObj.size)}
                      className={`min-w-12 h-11 px-3.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'border-[var(--theme-primary)] bg-theme-gradient text-white shadow-sm scale-102'
                          : inStock
                          ? 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-400 line-through cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span>{sizeObj.size}</span>
                      {sizeObj.discountPrice > 0 && isSelected && (
                        <span className="text-[9px] opacity-90 font-medium">
                          ₹{sizeObj.discountPrice.toFixed(0)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Stock Indicator */}
              <div className="mt-2.5">
                {activeSizeObj && activeSizeObj.inStock ? (
                  activeSizeObj.qty < 5 ? (
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Hurry, only {activeSizeObj.qty} left in stock for size {activeSizeObj.size}!
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      In Stock ({activeSizeObj.qty} units ready to ship)
                    </p>
                  )
                ) : (
                  <p className="text-xs font-bold text-rose-600">
                    Currently Out of Stock in size {activeSizeObj?.size}
                  </p>
                )}
              </div>
            </div>

            {/* Addons Selector (from material.addons) */}
            {availableAddons.length > 0 && (
              <div className="border border-neutral-200/90 rounded-2xl p-4 bg-pink-50/30">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Matching Accessories & Add-ons</span>
                  </span>
                  <span className="text-[11px] text-neutral-500">Optional</span>
                </div>

                <div className="space-y-2">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddons.some((a) => a.id === addon.id)
                    const addonImg = addon.addon_image || addon.image_url || addon.image

                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? 'border-[var(--theme-primary)] bg-white shadow-xs'
                            : 'border-neutral-200 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAddon(addon)}
                            className="w-4 h-4 accent-[var(--theme-primary)] rounded cursor-pointer"
                          />
                          {addonImg && (
                            <img
                              src={formatImageUrl(addonImg)}
                              alt={addon.name}
                              className="w-9 h-9 rounded-lg object-cover border border-neutral-200"
                            />
                          )}
                          <span className="text-xs font-semibold text-neutral-800">
                            {addon.name}
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-theme-primary">
                          + ₹{parseFloat(addon.price ?? addon.amount).toFixed(2)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Customization & Alteration Banner */}
            {(isCustomizable || isAlter) && (
              <div className="bg-gradient-to-r from-pink-50/70 via-rose-50/40 to-amber-50/40 border border-pink-200/60 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-theme-primary">
                  <Scissors className="w-4 h-4" />
                  <span>Bespoke Atelier Services</span>
                </div>

                {isCustomizable && (
                  <p className="text-xs text-neutral-700 leading-relaxed">
                    ✨ <strong>Bespoke Tailoring Available:</strong> This garment can be made-to-measure according to your personal body measurements.
                  </p>
                )}

                {isAlter && (
                  <label className="flex items-center gap-2.5 pt-1 text-xs text-neutral-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeAlteration}
                      onChange={(e) => setIncludeAlteration(e.target.checked)}
                      className="w-4 h-4 accent-[var(--theme-primary)] rounded cursor-pointer"
                    />
                    <span>
                      Add Doorstep Alteration ({alterCharge > 0 ? `+ ₹${alterCharge.toFixed(2)}` : 'Complimentary'})
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Quantity
              </span>
              <div className="inline-flex items-center border border-neutral-300 rounded-xl overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 font-bold transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-extrabold text-neutral-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(activeSizeObj?.qty || 10, q + 1))}
                  className="w-9 h-9 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 font-bold transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 py-3.5 px-6 btn-theme text-xs sm:text-sm font-extrabold gap-2 cursor-pointer active:scale-98 shadow-md"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                <span>ADD TO BAG • ₹{(finalUnitPrice * quantity).toFixed(2)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAdd()
                }}
                className="flex-1 py-3.5 px-6 bg-neutral-900 hover:bg-black text-white text-xs sm:text-sm font-extrabold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4 stroke-[2.5] text-amber-400" />
                <span>BUY NOW</span>
              </button>
            </div>

            {/* Pincode & Delivery Checker */}
            <div className="border border-neutral-200/90 rounded-2xl p-4 bg-neutral-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-2">
                <Truck className="w-4 h-4 text-theme-primary" />
                <span>Delivery Options & Pincode Check</span>
              </div>

              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter 6-digit Pincode"
                    maxLength={6}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors cursor-pointer"
                >
                  Check
                </button>
              </form>

              {pincodeStatus && (
                <p
                  className={`mt-2 text-xs font-medium leading-relaxed ${
                    pincodeStatus.valid ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {pincodeStatus.message}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-neutral-600">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  100% Authentic Atelier
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Easy 7 Days Return
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Express Free Delivery
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Secure Checkout
                </span>
              </div>
            </div>

            {/* Vendor / Boutique Card */}
            {product.vendor && (
              <div className="border border-neutral-200/90 rounded-2xl p-4 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {product.vendor.img_path ? (
                    <img
                      src={formatImageUrl(product.vendor.img_path)}
                      alt={product.vendor.shop_name}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-pink-50 text-theme-primary font-black flex items-center justify-center text-sm border border-[var(--theme-primary)]/20">
                      {brand.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-extrabold text-neutral-900 flex items-center gap-1.5">
                      <span>Sold by: {product.vendor.shop_name || brand}</span>
                    </h4>
                    <p className="text-[11px] text-neutral-500">
                      Verified Bespoke Designer Atelier
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold border border-emerald-200">
                  <span>{rating.toFixed(1)}</span>
                  <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details & Specifications Tabs */}
        <div className="mt-14 border-t border-neutral-200/80 pt-8">
          <div className="flex gap-4 border-b border-neutral-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2 text-sm font-bold tracking-tight transition-all cursor-pointer relative ${
                activeTab === 'details'
                  ? 'text-theme-primary border-b-2 border-[var(--theme-primary)]'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Product Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`pb-2 text-sm font-bold tracking-tight transition-all cursor-pointer relative ${
                activeTab === 'materials'
                  ? 'text-theme-primary border-b-2 border-[var(--theme-primary)]'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Fabrics & Variants ({materials.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 text-sm font-bold tracking-tight transition-all cursor-pointer relative ${
                activeTab === 'reviews'
                  ? 'text-theme-primary border-b-2 border-[var(--theme-primary)]'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Ratings & Reviews ({ratingCount})
            </button>
          </div>

          <div className="py-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900 mb-2">
                    Description & Atelier Craft
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl">
                    {description}
                  </p>
                </div>

                {/* Structured Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl">
                  <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Category</span>
                    <span className="text-xs font-semibold text-neutral-800 block mt-0.5">{categoryName}</span>
                  </div>
                  {subcategoryName && (
                    <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">Subcategory</span>
                      <span className="text-xs font-semibold text-neutral-800 block mt-0.5">{subcategoryName}</span>
                    </div>
                  )}
                  {gender && (
                    <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">Gender</span>
                      <span className="text-xs font-semibold text-neutral-800 block mt-0.5 capitalize">{gender}</span>
                    </div>
                  )}
                  {product.hsn_code && (
                    <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                      <span className="text-[10px] uppercase font-bold text-neutral-400">HSN Code</span>
                      <span className="text-xs font-semibold text-neutral-800 block mt-0.5">{product.hsn_code}</span>
                    </div>
                  )}
                  <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Product Type</span>
                    <span className="text-xs font-semibold text-neutral-800 block mt-0.5">
                      {product.product_types?.join(', ') || (isCustomizable ? 'Customizable' : 'Ready Made')}
                    </span>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Boutique</span>
                    <span className="text-xs font-semibold text-neutral-800 block mt-0.5">{brand}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-4">
                {materials.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {materials.map((m, idx) => {
                      const matImg =
                        m.images?.[0]?.img_path ||
                        m.main_img_path ||
                        product.lowest_price_main_image
                      const matPrice =
                        m.prices?.ready_made_products?.[0]?.discount_price ||
                        m.prices?.customizable_products?.[0]?.discount_price

                      return (
                        <div
                          key={m.id || idx}
                          onClick={() => handleSelectMaterial(idx)}
                          className={`border rounded-2xl p-4 bg-white flex items-start gap-4 cursor-pointer transition-all ${
                            selectedMaterialIdx === idx
                              ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          {matImg && (
                            <img
                              src={formatImageUrl(matImg)}
                              alt={m.name}
                              className="w-16 h-20 rounded-xl object-cover shrink-0 border border-neutral-200"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-neutral-900">
                                {m.name}
                              </h4>
                              {matPrice && (
                                <span className="text-xs font-extrabold text-theme-primary">
                                  ₹{parseFloat(matPrice).toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                              {m.description || 'Premium bespoke fabric.'}
                            </p>
                            <span className="text-[11px] text-neutral-400 mt-2 block">
                              {m.images?.length || 0} photo{m.images?.length === 1 ? '' : 's'} •{' '}
                              {m.addons?.length ? `${m.addons.length} add-on available` : 'Standard edition'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Standard high-grade fabrics sourced ethically from certified artisan mills.
                  </p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-6 p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="text-center">
                    <span className="text-4xl font-black text-neutral-900 block">
                      {rating.toFixed(1)}
                    </span>
                    <div className="flex items-center justify-center gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= Math.round(rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-neutral-200 text-neutral-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-neutral-500 mt-1 block">
                      {ratingCount} Rating{ratingCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5 border-l border-neutral-200 pl-6 text-xs">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const countKey = `${['one', 'two', 'three', 'four', 'five'][stars - 1]}_star_count`
                      const count = product.ratings?.[countKey] || (stars === 5 ? ratingCount : 0)
                      const pct = ratingCount > 0 ? (count / ratingCount) * 100 : 0

                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="w-4 font-semibold text-neutral-600">{stars}★</span>
                          <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-400 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-neutral-400 font-mono text-[10px]">
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Customer Photos Gallery */}
                {allReviewPhotos.length > 0 && (
                  <div className="p-5 bg-white rounded-2xl border border-neutral-200 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                        Customer Photos ({allReviewPhotos.length})
                      </h4>
                      <span className="text-[11px] text-neutral-400 font-medium">Authentic buyer submissions</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {allReviewPhotos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewReviewImage(url)}
                          className="w-16 h-16 rounded-xl border border-neutral-200 overflow-hidden cursor-zoom-in hover:border-[var(--theme-primary)] hover:scale-105 transition-all shrink-0 bg-neutral-100"
                        >
                          <img src={url} alt={`Customer review photo ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Write Review CTA Card */}
                <div className="p-4 bg-white rounded-2xl border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Have you purchased this creation?</h4>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Share your bespoke fitting and fabric experience with the atelier.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        alert('Please sign in to write an authentic review.')
                        return
                      }
                      setIsReviewModalOpen(true)
                    }}
                    className="btn-theme text-xs py-2 px-4 shadow-xs self-start sm:self-auto shrink-0"
                  >
                    Write a Review
                  </button>
                </div>

                {/* Customer Reviews Feed */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                      Customer Reviews ({product.reviews?.length || 0})
                    </h4>
                    {product.reviews && product.reviews.length > 0 && (
                      <span className="text-[11px] text-neutral-400">
                        Sorted by most recent
                      </span>
                    )}
                  </div>

                  {(!product.reviews || product.reviews.length === 0) ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-neutral-200 text-neutral-400 text-xs">
                      <p className="font-semibold text-neutral-600">No written reviews yet</p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Be the first to share your experience with this bespoke garment.
                      </p>
                    </div>
                  ) : (
                    product.reviews.map((rev, idx) => {
                      const reviewerName = rev.user_name || rev.user?.username || rev.user?.name || `Customer #${rev.user_id}`
                      const userAvatar = rev.user_avatar ? formatImageUrl(rev.user_avatar) : null
                      const ratingScore = Number(rev.ratings || rev.rating || 5)
                      const reviewText = rev.review || rev.comments || ''
                      const reviewImgs = rev.review_images || rev.images || rev.reviewImages || []
                      const dateStr = rev.created_at

                      return (
                        <div
                          key={rev.id || idx}
                          className="p-5 rounded-2xl bg-white border border-neutral-200 space-y-3 shadow-2xs hover:border-neutral-300 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {userAvatar ? (
                                <img
                                  src={userAvatar}
                                  alt={reviewerName}
                                  className="w-9 h-9 rounded-full object-cover border border-neutral-200"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
                                  {reviewerName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-bold text-neutral-900">{reviewerName}</h5>
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified Buyer
                                  </span>
                                </div>
                                {dateStr && (
                                  <p className="text-[10px] text-neutral-400 mt-0.5">
                                    {new Date(dateStr).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                              <span className="text-xs font-black text-amber-700 mr-1">{ratingScore}</span>
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={`w-3 h-3 ${
                                    s <= ratingScore ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {reviewText && (
                            <p className="text-xs text-neutral-700 leading-relaxed font-normal whitespace-pre-line">
                              {reviewText}
                            </p>
                          )}

                          {/* Attached Review Photos */}
                          {reviewImgs.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">
                                Attached Photos ({reviewImgs.length})
                              </span>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {reviewImgs.map((imgObj, iIdx) => {
                                  const rawUrl = typeof imgObj === 'string'
                                    ? imgObj
                                    : (imgObj.image_url || imgObj.image || imgObj.img_path || imgObj.image_path || imgObj.url)
                                  const fullUrl = formatImageUrl(rawUrl)
                                  if (!fullUrl) return null

                                  return (
                                    <button
                                      key={imgObj.id || iIdx}
                                      type="button"
                                      onClick={() => setPreviewReviewImage(fullUrl)}
                                      className="w-14 h-14 rounded-xl border border-neutral-200 overflow-hidden cursor-zoom-in bg-neutral-50 hover:opacity-80 transition-opacity shrink-0"
                                    >
                                      <img
                                        src={fullUrl}
                                        alt="Review attachment"
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Size Guide & Measurements Modal */}
      {isSizeGuideOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-neutral-200 p-6 sm:p-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-theme-primary" />
                <h3 className="text-base font-extrabold text-neutral-900">
                  Size & Measurement Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              {product.measurements_table && product.measurements_table.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-xs text-neutral-600">
                    Below are the exact garment measurements from our bespoke tailor specifications.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-100/80 text-neutral-800 font-bold border-b border-neutral-200">
                          <th className="p-3">Measurement</th>
                          {product.sizes && product.sizes.map((s) => (
                            <th key={s} className="p-3 text-center">{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {product.measurements_table.map((m) => (
                          <tr key={m.measurement_id} className="hover:bg-neutral-50/60">
                            <td className="p-3 font-semibold text-neutral-900 flex items-center gap-2">
                              {m.measurement_image && (
                                <img
                                  src={m.measurement_image}
                                  alt={m.measurement_name}
                                  className="w-7 h-7 rounded object-cover border border-neutral-200 shrink-0"
                                />
                              )}
                              <span>{m.measurement_name}</span>
                            </td>
                            {product.sizes && product.sizes.map((s) => (
                              <td key={s} className="p-3 text-center font-mono text-neutral-700">
                                {m.values?.[s] !== undefined ? `${m.values[s]}"` : '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-600">
                    Standard garment size conversions in inches (in) and centimeters (cm).
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-100/80 text-neutral-800 font-bold border-b border-neutral-200">
                          <th className="p-3">Size</th>
                          <th className="p-3">Bust / Chest</th>
                          <th className="p-3">Waist</th>
                          <th className="p-3">Length</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        <tr>
                          <td className="p-3 font-bold">Free Size / Standard</td>
                          <td className="p-3">34 - 40 in</td>
                          <td className="p-3">28 - 36 in</td>
                          <td className="p-3">Full length / 5.5m saree</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold">Size 8</td>
                          <td className="p-3">36 in</td>
                          <td className="p-3">30 in</td>
                          <td className="p-3">Tailored fit</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="px-5 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Image Zoom Modal */}
      {previewReviewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewReviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-2xl max-h-[90vh] bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl p-2 border border-neutral-800 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewReviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 text-white hover:bg-black/90 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewReviewImage}
              alt="Customer Review Photo Preview"
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Interactive Write Review Modal */}
      <WriteReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        productId={productId}
        productName={product?.product_name || product?.title || 'Bespoke Garment'}
        currentUser={currentUser}
        onSuccess={() => {
          alert('Thank you! Your verified review has been submitted to the atelier.')
        }}
      />
    </div>
  )
}
