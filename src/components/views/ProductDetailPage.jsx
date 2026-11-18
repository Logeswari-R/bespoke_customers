import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { getProductDetails, formatImageUrl, getMeasurementsByPrice, getStarColor, isProductActive } from '../../services/api'
import { PageLoadingAnimation } from '../animations'
import { notifyContentReady } from '../../utils/scrollRestoration'
import CustomMeasurementsModal from '../common/CustomMeasurementsModal'
import { addRecentlyViewedProduct } from '../../utils/recentlyViewedUtils'
import RecentlyViewedSection from '../common/RecentlyViewedSection'
import RecommendedProductsSection from '../common/RecommendedProductsSection'

export default function ProductDetailPage({
  productId,
  initialProduct = null,
  currentUser = null,
  onBack,
  onAddToCart,
  onSelectProduct,
  _onSelectProduct,
  wishlistIds = [],
  onToggleWishlist,
  onOpenLoginPrompt,
  onOpenAuth,
  onOpenCheckout,
  cartItems = [],
  onOpenCart,
  onOpenHistory,
}) {
  const targetPid = String(productId || initialProduct?.id || initialProduct?.product_id || '').trim()
  const lastTrackedPidRef = useRef(null)

  // Only use initialProduct if it strictly matches targetPid AND has full product details
  const hasFullDetails = Boolean(
    initialProduct &&
      String(initialProduct.id || initialProduct.product_id) === targetPid &&
      (initialProduct.product_materials || initialProduct.materials || initialProduct.category)
  )

  const [product, setProduct] = useState(() => (hasFullDetails ? initialProduct : null))
  const [selectedMaterialIdx, setSelectedMaterialIdx] = useState(() => {
    const targetMatId = initialProduct?.selectedMaterialId || initialProduct?.variant_id || initialProduct?.material_id
    const mats = initialProduct?.product_materials || initialProduct?.materials || []
    if (targetMatId && mats.length > 0) {
      const idx = mats.findIndex((m) => String(m.id || m.material_id) === String(targetMatId))
      if (idx !== -1) return idx
    }
    if (typeof initialProduct?.selectedMaterialIdx === 'number') return initialProduct.selectedMaterialIdx
    return 0
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedFabricIdx, setSelectedFabricIdx] = useState(0)
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedPriceId, setSelectedPriceId] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(!hasFullDetails)
  const [addedNotice, setAddedNotice] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [pincode, setPincode] = useState('')
  const [pincodeStatus, setPincodeStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [includeAlteration, setIncludeAlteration] = useState(false)
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false)
  const [previewReviewImage, setPreviewReviewImage] = useState(null)
  const [selectedProductType, setSelectedProductType] = useState('ready_made') // 'ready_made' | 'customizable'
  const [isCustomMeasurementsOpen, setIsCustomMeasurementsOpen] = useState(false)
  const [isBuyNowFlow, setIsBuyNowFlow] = useState(false)
  const [customMeasurementsData, setCustomMeasurementsData] = useState(null)
  const [schemaByPrice, setSchemaByPrice] = useState([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Fetch full product details from API
  useEffect(() => {
    let ignore = false
    const controller = new AbortController()
    if (!targetPid) return

    // Immediately isolate previous product state when target ID changes
    setProduct((prev) => {
      if (prev && String(prev.id || prev.product_id) === targetPid) {
        return prev
      }
      return null
    })
    setIsLoading(true)

    async function loadDetails() {
      try {
        console.log(`[Bespoke PDP] Fetching show/product?product_id=${targetPid}`)
        const data = await getProductDetails(targetPid, { signal: controller.signal })
        // Strict verification: ensure the response matches the current route's product ID
        if (!ignore && data && String(data.id || data.product_id) === targetPid) {
          setProduct(data)
          // Track recently viewed product in localStorage cache (guarded against duplicate StrictMode triggers)
          if (lastTrackedPidRef.current !== targetPid) {
            lastTrackedPidRef.current = targetPid
            addRecentlyViewedProduct(data, currentUser?.id)
          }
          const mats = data.product_materials || data.materials || []
          const targetMatId = initialProduct?.selectedMaterialId || initialProduct?.variant_id || initialProduct?.material_id
          let targetIdx = 0
          if (targetMatId && mats.length > 0) {
            const foundIdx = mats.findIndex((m) => String(m.id || m.material_id) === String(targetMatId))
            if (foundIdx !== -1) targetIdx = foundIdx
          } else if (typeof initialProduct?.selectedMaterialIdx === 'number' && mats[initialProduct.selectedMaterialIdx]) {
            targetIdx = initialProduct.selectedMaterialIdx
          }
          setSelectedMaterialIdx(targetIdx)
          setSelectedAddons([])
          setSelectedPriceId(null)
          if (data.sizes && data.sizes.length > 0) {
            setSelectedSize(String(data.sizes[0]))
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(`Failed to load product details for #${targetPid}:`, err)
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
          notifyContentReady()
        }
      }
    }

    loadDetails()
    return () => {
      ignore = true
      controller.abort()
    }
  }, [targetPid])

  // Track on initial mount if full product details were already provided
  useEffect(() => {
    if (hasFullDetails && product && lastTrackedPidRef.current !== targetPid) {
      lastTrackedPidRef.current = targetPid
      addRecentlyViewedProduct(product, currentUser?.id)
    }
  }, [hasFullDetails, product?.id, currentUser?.id, targetPid])

  // Function to reload product details & fresh review data
  const reloadProductDetails = async () => {
    if (!targetPid) return
    try {
      const data = await getProductDetails(targetPid)
      if (data && String(data.id || data.product_id) === targetPid) {
        setProduct(data)
      }
    } catch (err) {
      console.error(`Failed to reload product details for #${targetPid}:`, err)
    }
  }

  // Materials / Color Variations from API: product_materials (strictly active only: is_active = '1')
  const materials = useMemo(() => {
    if (!product) return []
    const raw =
      product.product_materials && Array.isArray(product.product_materials) && product.product_materials.length > 0
        ? product.product_materials
        : product.materials && Array.isArray(product.materials) && product.materials.length > 0
        ? product.materials
        : []
    return raw.filter((m) => {
      const activeVal = m.is_active !== undefined ? m.is_active : m.active
      const isAct =
        activeVal === undefined || activeVal === null
          ? true
          : String(activeVal) === '1' || activeVal === 1 || activeVal === true
      const isNotDeleted = m.action === undefined || m.action === null ? true : String(m.action) !== '1'
      return isAct && isNotDeleted
    })
  }, [product])

  // Nested Fabrics and Colours from API: product.fabrics
  const fabricsList = useMemo(() => {
    if (product?.fabrics && Array.isArray(product.fabrics) && product.fabrics.length > 0) {
      return product.fabrics
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

  // Ensure selectedFabricIdx is always in sync with currentMaterial's fabric
  useEffect(() => {
    if (currentMaterial && fabricsList.length > 0) {
      const fIdx = fabricsList.findIndex(fab => 
        (currentMaterial.product_fabric_id && Number(fab.id) === Number(currentMaterial.product_fabric_id)) ||
        (currentMaterial.name && fab.fabric_name && currentMaterial.name.trim().toLowerCase() === fab.fabric_name.trim().toLowerCase())
      )
      if (fIdx !== -1 && fIdx !== selectedFabricIdx) {
        setSelectedFabricIdx(fIdx)
      }
    }
  }, [currentMaterial, fabricsList])

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

  // Check API details for customizable & ready made availability
  const hasCustomizable = useMemo(() => {
    if (!product) return false
    const rootFlag =
      product.is_customizable === 1 ||
      String(product.is_customizable) === '1' ||
      product.is_customizable === true ||
      product.is_customisable === 1 ||
      String(product.is_customisable) === '1' ||
      (Array.isArray(product.product_types) && product.product_types.includes('CUSTOMIZABLE')) ||
      (typeof product.product_type === 'string' && product.product_type.toUpperCase().includes('CUSTOM'))

    const hasCustomizablePrices =
      Boolean(currentMaterial?.prices?.customizable_products && currentMaterial.prices.customizable_products.length > 0) ||
      Boolean(product.prices?.customizable_products && product.prices.customizable_products.length > 0)

    return Boolean(rootFlag || hasCustomizablePrices)
  }, [product, currentMaterial])

  const hasReadyMade = useMemo(() => {
    if (!product) return true
    const hasReadyPrices =
      Boolean(currentMaterial?.prices?.ready_made_products && currentMaterial.prices.ready_made_products.length > 0) ||
      Boolean(product.prices?.ready_made_products && product.prices.ready_made_products.length > 0)

    const typeHasReady =
      Array.isArray(product.product_types) && product.product_types.includes('READY_MADE')

    if (hasReadyPrices || typeHasReady) return true
    if (!hasCustomizable) return true

    if (
      Array.isArray(product.product_types) &&
      !product.product_types.includes('READY_MADE') &&
      currentMaterial?.prices?.ready_made_products?.length === 0
    ) {
      return false
    }
    return true
  }, [product, currentMaterial, hasCustomizable])

  // Active product type: cannot be customizable if product does not have customizable in API
  const activeProductType = hasCustomizable && selectedProductType === 'customizable' ? 'customizable' : 'ready_made'

  // Sync selectedProductType if customizable status changes
  useEffect(() => {
    if (!hasCustomizable && selectedProductType === 'customizable') {
      setSelectedProductType('ready_made')
    } else if (!hasReadyMade && hasCustomizable) {
      setSelectedProductType('customizable')
    }
  }, [hasCustomizable, hasReadyMade, selectedProductType])

  // Available sizes & price list for the current material based on active product type
  const materialPrices = useMemo(() => {
    if (!currentMaterial?.prices) return []
    const readyMade = currentMaterial.prices.ready_made_products || []
    const customizable = currentMaterial.prices.customizable_products || []

    if (activeProductType === 'customizable' && customizable.length > 0) {
      return customizable
    }
    if (activeProductType === 'ready_made' && readyMade.length > 0) {
      return readyMade
    }
    return readyMade.length > 0 ? readyMade : customizable
  }, [currentMaterial, activeProductType])

  const availableSizes = useMemo(() => {
    if (materialPrices.length > 0) {
      return materialPrices.map((p) => {
        const sizeStr = String(p.size || 'Free Size')
        const discPrice = parseFloat(p.discount_price ?? p.actual_price) || 0
        const actPrice = parseFloat(p.actual_price) || discPrice
        const quantity = parseInt(p.qty ?? 10, 10)
        // is_out_stock: "0" means available / in stock, "1" means out of stock
        const inStock = String(p.is_out_stock) !== '1'

        return {
          id: p.id || p.price_id,
          price_id: p.id || p.price_id,
          size: sizeStr,
          actualPrice: actPrice,
          discountPrice: discPrice,
          qty: quantity,
          inStock,
          rawPriceObj: p,
          productType: p.product_type,
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

  // Automatically adjust selectedPriceId & selectedSize if current selection is not in new availableSizes
  useEffect(() => {
    if (availableSizes && availableSizes.length > 0) {
      const currentPriceExists =
        selectedPriceId &&
        availableSizes.some(
          (s) => String(s.price_id || s.id) === String(selectedPriceId) && s.inStock
        )
      if (!currentPriceExists) {
        // Try to find matching by size if possible, or pick first in stock
        const matchingSize = selectedSize
          ? availableSizes.find((s) => s.size === selectedSize && s.inStock)
          : null
        const target =
          matchingSize || availableSizes.find((s) => s.inStock) || availableSizes[0]
        if (target) {
          setSelectedPriceId(target.price_id || target.id)
          setSelectedSize(target.size)
        }
      }
    }
  }, [availableSizes, selectedPriceId, selectedSize])

  // Active size object
  const activeSizeObj = useMemo(() => {
    if (selectedPriceId) {
      const foundById = availableSizes.find(
        (s) => String(s.price_id || s.id) === String(selectedPriceId)
      )
      if (foundById) return foundById
    }
    if (selectedSize) {
      const foundBySize =
        availableSizes.find((s) => s.size === selectedSize && s.inStock) ||
        availableSizes.find((s) => s.size === selectedSize)
      if (foundBySize) return foundBySize
    }
    return availableSizes.find((s) => s.inStock) || availableSizes[0]
  }, [availableSizes, selectedPriceId, selectedSize])

  // Fetch product measurement schema by price_id for customizable fit
  useEffect(() => {
    let cancelled = false
    const rawPriceId = activeSizeObj?.price_id || activeSizeObj?.id
    const numericPriceId = Number(rawPriceId)
    if (!rawPriceId || isNaN(numericPriceId) || numericPriceId <= 0) {
      setSchemaByPrice([])
      return
    }

    setIsLoadingSchema(true)
    getMeasurementsByPrice(numericPriceId)
      .then((res) => {
        if (!cancelled && res?.status && Array.isArray(res.data)) {
          setSchemaByPrice(res.data)
        }
      })
      .catch((err) => console.warn('Failed to fetch schema by price:', err))
      .finally(() => {
        if (!cancelled) setIsLoadingSchema(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeSizeObj?.id, activeSizeObj?.price_id])

  // Unified garment measurement table data combining API 1 by-price and show/product table
  const unifiedMeasurementTable = useMemo(() => {
    if (product?.measurements_table && product.measurements_table.length > 0) {
      return product.measurements_table.map((m) => {
        const matchingSchema = schemaByPrice.find(
          (s) =>
            s.measurement_id === m.measurement_id ||
            (s.name || '').toLowerCase() === (m.measurement_name || '').toLowerCase()
        )
        const curSize = activeSizeObj?.size || 'XS'
        const curVal = m.values?.[curSize] ?? matchingSchema?.standard_value ?? 20
        return {
          id: m.measurement_id,
          name: m.measurement_name || matchingSchema?.name || 'Garment Point',
          image: formatImageUrl(
            m.measurement_image || matchingSchema?.img_path || matchingSchema?.image
          ),
          unit: matchingSchema?.unit || 'inches',
          standardValue: curVal,
          minValue:
            matchingSchema?.min_value ?? Math.max(1, Math.round(parseFloat(curVal) - 6)),
          maxValue: matchingSchema?.max_value ?? Math.round(parseFloat(curVal) + 8),
          values: m.values || {},
        }
      })
    }

    if (schemaByPrice && schemaByPrice.length > 0) {
      return schemaByPrice.map((s) => ({
        id: s.measurement_id,
        name: s.name || s.measurment_name || 'Garment Point',
        image: formatImageUrl(s.img_path || s.image),
        unit: s.unit || 'inches',
        standardValue: s.standard_value ?? 20,
        minValue: s.min_value ?? Math.max(1, Math.round((s.standard_value || 20) - 6)),
        maxValue: s.max_value ?? Math.round((s.standard_value || 20) + 8),
        values: { [activeSizeObj?.size || 'XS']: s.standard_value },
      }))
    }

    return []
  }, [product?.measurements_table, schemaByPrice, activeSizeObj?.size])

  // Extract specifications directly from product_info table (details_name and details_value)
  const productInfoItems = useMemo(() => {
    const raw =
      product?.product_info ||
      product?.productInfo ||
      product?.specifications ||
      product?.raw_info ||
      []
    if (!Array.isArray(raw)) return []

    return raw
      .filter((item) => {
        if (!item || typeof item !== 'object') return false
        const name = item.details_name ?? item.key ?? item.label
        const val = item.details_value ?? item.value
        return Boolean(
          name &&
            String(name).trim() &&
            val !== undefined &&
            val !== null &&
            String(val).trim() !== ''
        )
      })
      .map((item, idx) => ({
        id: item.id || idx,
        details_name: String(item.details_name ?? item.key ?? item.label).trim(),
        details_value: String(item.details_value ?? item.value).trim(),
      }))
  }, [product])

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
    setSelectedPriceId(null)
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
        message: 'Delivery available in 2 - 3 business days! Express courier & Doorstep alterations active.',
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

  // Cart check hook unconditionally before any early returns (Rules of Hooks)
  const isInCart = useMemo(() => {
    if (!cartItems || cartItems.length === 0 || !product) return false
    const currentId = Number(product.id || product.product_id)
    const activeMatId = currentMaterial?.id || currentMaterial?.material_id || null
    return cartItems.some((item) => {
      const itemProdId = Number(item.product_id || item.product?.id || item.id)
      if (itemProdId !== currentId) return false
      if (activeMatId) {
        const itemMatId = item.material_id || item.materialId || null
        if (itemMatId && String(itemMatId) !== String(activeMatId)) return false
      }
      return true
    })
  }, [cartItems, product, currentMaterial])

  const isLoadedCorrectProduct =
    product &&
    targetPid &&
    String(product.id || product.product_id) === targetPid

  const isInactive =
    product &&
    (!isProductActive(product) ||
      (Array.isArray(product.product_materials || product.materials) &&
        (product.product_materials || product.materials).length > 0 &&
        materials.length === 0))

  if (isLoading || !isLoadedCorrectProduct || isInactive) {
    if (!isLoading && (!product || isInactive)) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white">
          <h3 className="text-lg font-bold text-neutral-800">
            {isInactive ? 'Product Currently Unavailable' : 'Product Not Found'}
          </h3>
          <p className="mt-2 text-xs text-neutral-500 max-w-sm text-center">
            {isInactive
              ? 'This product is currently inactive or out of stock.'
              : `Product #${targetPid} could not be retrieved from the API.`}
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

    return (
      <PageLoadingAnimation
        message={`Loading Product #${targetPid}...`}
        subMessage="Retrieving atelier craftsmanship details & variants"
        minHeight="min-h-[70vh]"
      />
    )
  }

  // Structured fields from API
  const title = product.product_name || product.name || product.title || 'Bespoke Item'
  const brand =
    product.vendor?.shop_name ||
    product.shop_name ||
    product.vendor_name ||
    product.vendor?.seller_name ||
    product.vendor?.brand_business_name ||
    'Bespoke Atelier'
  const categoryName = product.category?.name || product.category_name || 'Traditional'
  const subcategoryName = product.subcategory?.name || product.subcategory_name || ''
  const gender = product.gender || ''
  const description =
    product.description ||
    currentMaterial?.description ||
    'Artisanally crafted with premium textiles and precise attention to silhouette. Designed for timeless elegance and effortless comfort.'
  const rating = parseFloat(product.ratings?.total_average || product.total_average || product.rating || 5)
  const ratingCount =
    (Array.isArray(product.reviews) ? product.reviews.length : null) ??
    product.ratings?.total_reviews ??
    product.total_reviews ??
    0
  const isCustomizable = Boolean(
    product.is_customizable ||
      (product.product_types && product.product_types.includes('CUSTOMIZABLE'))
  )
  const isAlter = Boolean(product.is_alter)
  const isWishlisted = wishlistIds.map(Number).includes(Number(product.id))

  const handleAdd = () => {
    const isChosenCustomizable = activeProductType === 'customizable'
    const itemData = {
      ...product,
      id: product.id,
      productId: product.id,
      price_id: activeSizeObj?.id || activeSizeObj?.price_id || null,
      title,
      product_name: title,
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
      is_customizable: isChosenCustomizable ? 1 : 0,
      is_customisable: isChosenCustomizable ? '1' : '0',
      product_type: isChosenCustomizable ? 0 : 1,
      order_type: isChosenCustomizable ? 'Customizable' : 'Ready Made',
      measurements: isChosenCustomizable && customMeasurementsData?.measurements ? customMeasurementsData.measurements : [],
      custom_measurements: isChosenCustomizable && customMeasurementsData?.measurements ? customMeasurementsData.measurements : null,
      measurement_summary: isChosenCustomizable && customMeasurementsData?.summaryText ? customMeasurementsData.summaryText : null,
      gst_id: activeSizeObj?.gst_id || product.gst_id || null,
      gst_name: activeSizeObj?.gst_name || product.gst_name || null,
      gst_rate: activeSizeObj?.gst_rate || product.gst_rate || null,
      gst_percentage: activeSizeObj?.gst_percentage !== undefined ? Number(activeSizeObj.gst_percentage) : (Number(product.gst_percentage) || 0),
    }

    if (!currentUser) {
      if (onOpenLoginPrompt) {
        onOpenLoginPrompt({
          title: 'Sign In Required',
          message: 'Please login to continue.',
          actionDescription: 'add items to your bag',
          pendingAction: {
            type: 'ADD_TO_CART',
            productId: product.id,
            productName: title,
            materialId: currentMaterial?.id || null,
            material: currentMaterial?.name || null,
            priceId: activeSizeObj?.id || activeSizeObj?.price_id || null,
            size: activeSizeObj?.size || 'Standard',
            quantity,
            addons: selectedAddons,
            alteration: includeAlteration,
            product: itemData,
            pageUrl: window.location.href,
          },
        })
      }
      return
    }
    if (onAddToCart) {
      onAddToCart(itemData, quantity, activeSizeObj?.size || 'Standard')
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
            <div className="relative flex-1 aspect-[3/4] bg-neutral-100 rounded-3xl overflow-hidden border border-neutral-200/80 shadow-md group">
              <img
                src={displayImage}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-104"
              />

              {/* Prev / Next Image Floating Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-neutral-800 hover:text-black flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg hover:scale-105 active:scale-95 z-10 border border-white/60"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-neutral-800 hover:text-black flex items-center justify-center backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg hover:scale-105 active:scale-95 z-10 border border-white/60"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Top Glassmorphic Badges (Compact, Discreet & Non-Intrusive) */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10 pointer-events-none">
                {discountPercent > 0 && (
                  <span className="bg-[#C00078] text-white text-[9px] font-extrabold tracking-tight px-2 py-0.5 rounded-md shadow-2xs">
                    {discountPercent}% OFF
                  </span>
                )}
                {hasCustomizable ? (
                  <span className="bg-white/95 text-[#C00078] text-[8px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-0.5 shadow-2xs border border-pink-200/80 uppercase tracking-wider">
                    <Scissors className="w-2.5 h-2.5 text-[#C00078]" />
                    <span>Custom</span>
                  </span>
                ) : (
                  <span className="bg-white/90 text-neutral-700 text-[8px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-0.5 shadow-2xs border border-neutral-200 uppercase tracking-wider">
                    <ShoppingBag className="w-2.5 h-2.5" />
                    <span>Ready Made</span>
                  </span>
                )}
                {gender && (
                  <span className="bg-white/90 text-neutral-800 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md backdrop-blur-xs shadow-2xs border border-neutral-200">
                    {gender}
                  </span>
                )}
              </div>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={() => {
                  if (!currentUser) {
                    if (onOpenLoginPrompt) {
                      onOpenLoginPrompt({
                        title: 'Sign In Required',
                        message: 'Please login to continue.',
                        actionDescription: 'save this item to your wishlist',
                        pendingAction: {
                          type: 'TOGGLE_WISHLIST',
                          productId: product.id,
                          product,
                          pageUrl: window.location.href,
                        },
                      })
                    }
                    return
                  }
                  if (onToggleWishlist) onToggleWishlist(product.id)
                }}
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
            <div className="border-b border-[#F0E5EC] pb-5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#C00078] flex items-center gap-1.5 tracking-normal">
                  <span>{brand}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-neutral-100/90 text-[#77717C] font-mono font-medium px-2.5 py-0.5 rounded-full border border-[#F0E5EC]">
                    Product #{productId || product.id}
                  </span>
                  {product.hsn_code && (
                    <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                      HSN: {product.hsn_code}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#24212A] mt-2 tracking-normal leading-snug">
                {title}
              </h1>

              <p className="text-[13px] sm:text-[14px] text-[#77717C] font-normal mt-2 line-clamp-2 leading-relaxed">
                {description}
              </p>

              {/* Pricing Display */}
              <div className="mt-4 flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl sm:text-[28px] font-bold text-[#24212A] tabular-nums tracking-normal">
                  ₹{finalUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>

                {finalOriginalUnitPrice > finalUnitPrice && (
                  <>
                    <span className="text-[14px] sm:text-[15px] text-[#77717C] line-through font-normal tabular-nums">
                      ₹{finalOriginalUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF5FA] text-[#C00078] border border-[#F0E5EC] tracking-normal">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Inclusive of all taxes • Doorstep Tailoring & Delivery Included</span>
              </p>
            </div>

            {/* Material & Color Variants (from product_materials) */}
            {fabricsList.length > 0 ? (
              <div className="space-y-4">
                {/* 1. Fabric Selector (if multiple fabrics available) */}
                {fabricsList.length > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
                        <span>Fabric Option</span>
                      </span>
                      <span className="text-xs font-bold text-neutral-600">
                        {fabricsList[selectedFabricIdx]?.fabric_name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {fabricsList.map((fab, fIdx) => (
                        <button
                          key={fab.id || fIdx}
                          type="button"
                          onClick={() => {
                            setSelectedFabricIdx(fIdx);
                            const firstCol = fab.colours?.[0];
                            if (firstCol) {
                              const mIdx = materials.findIndex(m => String(m.id) === String(firstCol.id));
                              if (mIdx !== -1) handleSelectMaterial(mIdx);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                            selectedFabricIdx === fIdx
                              ? 'border-[var(--theme-primary)] bg-pink-50 text-[var(--theme-primary)] shadow-xs ring-1 ring-[var(--theme-primary)]'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400'
                          }`}
                        >
                          <span>{fab.fabric_name}</span>
                          {fab.colours?.length > 0 && (
                            <span className="text-[10px] opacity-70">
                              ({fab.colours.length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Colour Swatches under Selected Fabric */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-theme-primary" />
                      <span>
                        Colors in {fabricsList[selectedFabricIdx]?.fabric_name || 'Fabric'}
                      </span>
                    </span>
                    {currentMaterial && (
                      <span className="text-xs text-theme-primary font-bold">
                        {currentMaterial.material_name || currentMaterial.name}
                        {fabricsList[selectedFabricIdx]?.fabric_name && (
                          <span className="text-neutral-400 font-normal ml-1">
                            • {fabricsList[selectedFabricIdx].fabric_name}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {(fabricsList[selectedFabricIdx]?.colours || []).length > 0 ? (
                      fabricsList[selectedFabricIdx].colours.map((mat, idx) => {
                        const actualMatIdx = materials.findIndex(m => String(m.id) === String(mat.id));
                        const effectiveIdx = actualMatIdx !== -1 ? actualMatIdx : idx;
                        const isSelected = selectedMaterialIdx === effectiveIdx;
                        const previewImg =
                          mat.images?.[0]?.img_path ||
                          mat.main_img_path ||
                          product.lowest_price_main_image;
                        const pricePreview =
                          mat.prices?.ready_made_products?.[0]?.discount_price ||
                          mat.prices?.customizable_products?.[0]?.discount_price ||
                          (Array.isArray(mat.prices) ? mat.prices[0]?.discount_price || mat.prices[0]?.actual_price : null);
                        const hexCode = mat.color_code || '#C00078';
                        const colourTitle = mat.colour_name || mat.material_name || mat.name;
                        const parentFabricName = fabricsList[selectedFabricIdx]?.fabric_name || mat.name;

                        return (
                          <button
                            key={mat.id || idx}
                            type="button"
                            onClick={() => handleSelectMaterial(effectiveIdx)}
                            className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? 'border-[var(--theme-primary)] bg-pink-50/50 shadow-sm ring-1 ring-[var(--theme-primary)]'
                                : 'border-neutral-200 bg-white hover:border-neutral-400'
                            }`}
                          >
                            <span
                              className="w-5 h-5 rounded-full border border-white shadow-xs shrink-0 ring-1 ring-neutral-200"
                              style={{ backgroundColor: hexCode }}
                              title={hexCode}
                            />

                            {previewImg && (
                              <img
                                src={formatImageUrl(previewImg)}
                                alt={colourTitle}
                                className="w-9 h-11 rounded-lg object-cover shrink-0 border border-neutral-200"
                              />
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {colourTitle}
                              </p>
                              {parentFabricName && (
                                <span className="inline-block text-[9px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded mt-0.5 truncate">
                                  {parentFabricName}
                                </span>
                              )}
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
                        );
                      })
                    ) : (
                      <div className="col-span-2 py-4 px-3 text-center text-xs text-neutral-400 bg-neutral-50 rounded-xl border border-neutral-100">
                        No color options configured under {fabricsList[selectedFabricIdx]?.fabric_name || 'this fabric'}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : materials.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Select Variant / Color</span>
                  </span>
                  {currentMaterial && (
                    <span className="text-xs text-theme-primary font-bold">
                      {currentMaterial.material_name || currentMaterial.name}
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
                    const hexCode = mat.color_code || '#C00078'
                    const colourTitle = mat.material_name || mat.name

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
                        <span
                          className="w-5 h-5 rounded-full border border-white shadow-xs shrink-0 ring-1 ring-neutral-200"
                          style={{ backgroundColor: hexCode }}
                          title={hexCode}
                        />
                        {previewImg && (
                          <img
                            src={formatImageUrl(previewImg)}
                            alt={colourTitle}
                            className="w-10 h-12 rounded-lg object-cover shrink-0 border border-neutral-200"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {colourTitle}
                          </p>
                          {mat.name && mat.name !== colourTitle && (
                            <span className="inline-block text-[9px] font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded mt-0.5 truncate">
                              {mat.name}
                            </span>
                          )}
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
            ) : null}

            {/* Garment Order Type: Ready Made vs Customizable */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-semibold text-[#24212A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C00078]" />
                  <span>Choose Fit & Tailoring</span>
                </label>
                {activeProductType === 'customizable' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#C00078] bg-[#FFF5FA] px-2 py-0.5 rounded-full border border-[#F0E5EC] shadow-2xs">
                    <Scissors className="w-2.5 h-2.5" />
                    <span>Made-To-Measure</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-normal text-[#77717C]">
                    Select standard or bespoke
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 1. Ready Made Button */}
                <button
                  type="button"
                  disabled={!hasReadyMade}
                  onClick={() => {
                    setSelectedPriceId(null)
                    setSelectedProductType('ready_made')
                  }}
                  className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${
                    activeProductType === 'ready_made'
                      ? 'border-[var(--theme-primary)] bg-gradient-to-br from-pink-50/70 via-white to-pink-50/30 shadow-sm ring-2 ring-[var(--theme-primary)]/20 cursor-pointer'
                      : hasReadyMade
                      ? 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/80 cursor-pointer'
                      : 'border-neutral-200 bg-neutral-100/70 text-neutral-400 cursor-not-allowed opacity-50 select-none'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          activeProductType === 'ready_made'
                            ? 'bg-[var(--theme-primary)] text-white shadow-xs scale-105'
                            : 'bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200'
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[13px] font-semibold text-[#24212A] block">
                          Ready Made
                        </span>
                        <span className="text-[11px] text-[#77717C] font-normal block">
                          Standard Sizing
                        </span>
                      </div>
                    </div>
                    {activeProductType === 'ready_made' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C00078] ring-4 ring-pink-100 animate-pulse" />
                    )}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F0E5EC] text-[11px] text-[#77717C] flex items-center justify-between">
                    <span>Dispatched in 24h</span>
                    {hasReadyMade && (
                      <span className="text-[10px] font-semibold text-emerald-700">In Stock</span>
                    )}
                  </div>
                </button>

                {/* 2. Customizable Button */}
                <button
                  type="button"
                  disabled={!hasCustomizable}
                  onClick={() => {
                    if (!hasCustomizable) return
                    setSelectedPriceId(null)
                    setSelectedProductType('customizable')
                  }}
                  className={`group relative p-3.5 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${
                    !hasCustomizable
                      ? 'border-neutral-200 bg-neutral-100/70 text-neutral-400 cursor-not-allowed opacity-50 select-none pointer-events-none'
                      : activeProductType === 'customizable'
                      ? 'border-[#C00078] bg-[#FFF5FA] shadow-xs ring-2 ring-[#C00078]/20 cursor-pointer'
                      : 'border-[#F0E5EC] bg-white hover:border-[#C00078]/40 hover:bg-[#FFF5FA]/50 cursor-pointer'
                  }`}
                  title={
                    hasCustomizable
                      ? 'Bespoke custom tailoring according to your measurements'
                      : 'Custom tailoring is not available for this product'
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          !hasCustomizable
                            ? 'bg-neutral-200 text-neutral-400'
                            : activeProductType === 'customizable'
                            ? 'bg-[#C00078] text-white shadow-xs scale-105'
                            : 'bg-pink-100 text-[#C00078] group-hover:bg-pink-200'
                        }`}
                      >
                        <Scissors className="w-4 h-4" />
                      </div>
                      <div>
                        <span
                          className={`text-[13px] font-semibold block ${
                            !hasCustomizable ? 'text-neutral-400' : 'text-[#24212A]'
                          }`}
                        >
                          Customizable
                        </span>
                        <span className="text-[11px] text-[#77717C] font-normal block">
                          Atelier Fitted
                        </span>
                      </div>
                    </div>
                    {!hasCustomizable ? (
                      <span className="text-[9px] font-semibold text-neutral-400 uppercase bg-neutral-200 px-1.5 py-0.5 rounded">
                        Unavailable
                      </span>
                    ) : activeProductType === 'customizable' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C00078] ring-4 ring-pink-100 animate-pulse" />
                    ) : null}
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-[#F0E5EC] text-[11px] text-[#77717C] flex items-center justify-between">
                    <span>Tailored to You</span>
                    {hasCustomizable && (
                      <span className="text-[10px] font-semibold text-[#C00078]">Made to Measure</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Sleek banner when Customizable is selected */}
              {activeProductType === 'customizable' && (
                <div className="bg-[#FFF5FA] border border-[#F0E5EC] rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs transition-all duration-300">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-xs border border-[#F0E5EC] flex items-center justify-center shrink-0 text-[#C00078]">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#24212A]">
                        Bespoke Atelier Tailoring Active
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBuyNowFlow(false)
                          setIsCustomMeasurementsOpen(true)
                        }}
                        className="text-[11px] font-semibold text-[#C00078] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>{customMeasurementsData ? 'Edit Measurements' : 'Customize Fit'}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#77717C] mt-0.5 leading-relaxed">
                      {customMeasurementsData?.summaryText ? (
                        <span className="text-emerald-700 font-semibold">
                          ✓ {customMeasurementsData.summaryText}
                        </span>
                      ) : (
                        'This garment will be hand-tailored to your measurements. Click Buy Now to enter or choose your measurements.'
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Size Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#24212A]">
                  Select Size
                </span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-bold text-theme-primary hover:text-theme-secondary flex items-center gap-1.5 transition-colors cursor-pointer group"
                >
                  <Ruler className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                  <span className="group-hover:underline">Size & Measurement Guide</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5">
                {availableSizes.map((sizeObj, idx) => {
                  const isSelected = activeSizeObj
                    ? String(activeSizeObj.price_id || activeSizeObj.id) === String(sizeObj.price_id || sizeObj.id)
                    : false
                  const inStock = sizeObj.inStock

                  // Check if multiple size options share identical size labels or have different prices
                  const hasDuplicateLabels = availableSizes.some(
                    (s, i) => i !== idx && s.size.toLowerCase() === sizeObj.size.toLowerCase()
                  )
                  const hasMultiplePrices = availableSizes.some(
                    (s) => s.discountPrice !== availableSizes[0]?.discountPrice
                  )
                  const showPriceBadge = isSelected || hasDuplicateLabels || hasMultiplePrices

                  return (
                    <button
                      key={sizeObj.price_id || sizeObj.id || `${sizeObj.size}-${idx}`}
                      type="button"
                      disabled={!inStock}
                      onClick={() => {
                        setSelectedPriceId(sizeObj.price_id || sizeObj.id)
                        setSelectedSize(sizeObj.size)
                      }}
                      className={`min-w-[58px] h-12 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'border-[var(--theme-primary)] bg-theme-gradient text-white shadow-md shadow-pink-500/20 scale-102 ring-2 ring-pink-200/80'
                          : inStock
                          ? 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50/70 hover:scale-102'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-400 line-through cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="tracking-tight">{sizeObj.size}</span>
                      {sizeObj.discountPrice > 0 && showPriceBadge && (
                        <span
                          className={`text-[9px] font-semibold leading-none mt-0.5 ${
                            isSelected ? 'text-white/90' : 'text-neutral-500'
                          }`}
                        >
                          ₹{sizeObj.discountPrice % 1 === 0 ? sizeObj.discountPrice.toFixed(0) : sizeObj.discountPrice.toFixed(2)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Stock Indicator */}
              <div className="pt-0.5">
                {activeSizeObj && activeSizeObj.inStock ? (
                  activeProductType === 'customizable' || activeSizeObj.productType === 0 ? (
                    <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      In Stock • Ready for Atelier Tailoring
                    </p>
                  ) : activeSizeObj.qty > 0 && activeSizeObj.qty < 5 ? (
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Hurry, only {activeSizeObj.qty} left in stock for size {activeSizeObj.size}!
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      In Stock • Dispatches in 24 - 48 Hours
                    </p>
                  )
                ) : (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
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

            {isAlter && (
              <div className="bg-neutral-50/80 border border-neutral-200/80 rounded-2xl p-4">
                <label className="flex items-center gap-2.5 text-xs text-neutral-800 cursor-pointer select-none">
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
              </div>
            )}

            {/* Primary Action Panel: Perfectly Aligned Quantity + Add to Bag + Buy Now */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3">
                {/* Compact Elegant Quantity Pill */}
                <div className="flex items-center border border-neutral-300 rounded-xl bg-white shadow-2xs h-12 px-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-black font-bold transition-all cursor-pointer active:scale-95"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-9 text-center text-[13px] font-semibold text-[#24212A] select-none tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(activeSizeObj?.qty || 10, q + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:bg-neutral-100 hover:text-black font-bold transition-all cursor-pointer active:scale-95"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                {/* ADD TO BAG (or GO TO BAG) */}
                {isInCart ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenCart) {
                        onOpenCart()
                      } else if (onOpenCheckout) {
                        onOpenCheckout()
                      }
                    }}
                    className="flex-1 h-12 px-6 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[13px] sm:text-[14px] font-semibold tracking-normal rounded-[9px] transition-colors duration-150 ease-out border-0 shadow-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-white stroke-[2.5]" />
                    <span>Go to Bag</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex-1 h-12 px-6 bg-[#C00078] hover:bg-[#A80069] active:bg-[#97005F] text-white text-[13px] sm:text-[14px] font-semibold tracking-normal rounded-[9px] transition-colors duration-150 ease-out border-0 shadow-none flex items-center justify-center gap-2 cursor-pointer outline-none tabular-nums"
                  >
                    <ShoppingBag className="w-4 h-4 text-white stroke-[2]" />
                    <span>Add to Bag • ₹{(finalUnitPrice * quantity).toFixed(2)}</span>
                  </button>
                )}
              </div>

              {/* Full Width High-Contrast BUY NOW Button */}
              <button
                type="button"
                onClick={() => {
                  if (isInCart) {
                    if (onOpenCheckout) onOpenCheckout()
                    return
                  }

                  const itemData = {
                    id: product.id,
                    productId: product.id,
                    price_id: activeSizeObj?.id || activeSizeObj?.price_id || null,
                    title,
                    product_name: title,
                    price: finalUnitPrice,
                    originalPrice: finalOriginalUnitPrice,
                    image: displayImage,
                    vendor: brand,
                    size: activeSizeObj?.size || 'Standard',
                    material: currentMaterial?.name || null,
                    materialId: currentMaterial?.id || null,
                    material_id: currentMaterial?.id || null,
                    color: currentMaterial?.material_name || null,
                    addons: selectedAddons,
                    quantity,
                    alteration: includeAlteration,
                    is_customizable: activeProductType === 'customizable' ? 1 : 0,
                    is_customisable: activeProductType === 'customizable' ? '1' : '0',
                    product_type: activeProductType === 'customizable' ? 0 : 1,
                    order_type: activeProductType === 'customizable' ? 'Customizable' : 'Ready Made',
                    measurements: activeProductType === 'customizable' && customMeasurementsData?.measurements ? customMeasurementsData.measurements : [],
                    custom_measurements: activeProductType === 'customizable' && customMeasurementsData?.measurements ? customMeasurementsData.measurements : null,
                    measurement_summary: activeProductType === 'customizable' && customMeasurementsData?.summaryText ? customMeasurementsData.summaryText : null,
                  }

                  if (!currentUser) {
                    if (onOpenLoginPrompt) {
                      onOpenLoginPrompt({
                        title: 'Sign In Required',
                        message: 'Please login to continue.',
                        actionDescription: 'proceed to Buy Now with this item',
                        pendingAction: {
                          type: 'BUY_NOW',
                          productId: product.id,
                          productName: title,
                          materialId: currentMaterial?.id || null,
                          material: currentMaterial?.name || null,
                          priceId: activeSizeObj?.id || activeSizeObj?.price_id || null,
                          size: activeSizeObj?.size || 'Standard',
                          quantity,
                          addons: selectedAddons,
                          alteration: includeAlteration,
                          product: itemData,
                          pageUrl: window.location.href,
                        },
                      })
                    }
                    return
                  }

                  // If customizable garment, pop up the Customizable Measurement Table modal first!
                  if (activeProductType === 'customizable') {
                    setIsBuyNowFlow(true)
                    setIsCustomMeasurementsOpen(true)
                    return
                  }

                  handleAdd()
                  if (onOpenCheckout) onOpenCheckout()
                }}
                className="w-full h-12 px-6 bg-[#24212A] hover:bg-[#111111] active:bg-[#000000] text-white text-[13px] sm:text-[14px] font-semibold tracking-normal rounded-[9px] transition-colors duration-150 ease-out border-0 shadow-none flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Zap className="w-4 h-4 text-white fill-white" />
                <span>Buy Now</span>
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
                    <div className="w-12 h-12 rounded-xl bg-[#FFF5FA] text-[#C00078] font-semibold flex items-center justify-center text-sm border border-[#F0E5EC]">
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
          <div className="flex gap-6 border-b border-neutral-200 pb-3 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2 text-sm font-semibold tracking-tight transition-all cursor-pointer relative shrink-0 ${
                activeTab === 'details'
                  ? 'text-[#C00078] border-b-2 border-[#C00078]'
                  : 'text-[#77717C] hover:text-[#24212A]'
              }`}
            >
              Product Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`pb-2 text-sm font-semibold tracking-tight transition-all cursor-pointer relative shrink-0 ${
                activeTab === 'reviews'
                  ? 'text-[#C00078] border-b-2 border-[#C00078]'
                  : 'text-[#77717C] hover:text-[#24212A]'
              }`}
            >
              Ratings & Reviews ({ratingCount})
            </button>
          </div>

          <div className="py-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[13px] font-semibold text-[#24212A] mb-2">
                    Description & Atelier Craft
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl">
                    {description}
                  </p>
                </div>

                {/* Specifications from product_info table */}
                {productInfoItems.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[13px] font-semibold text-[#24212A]">
                      Product Specifications
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                      {productInfoItems.map((spec) => (
                        <div
                          key={spec.id}
                          className="bg-[#FFF5FA]/70 border border-[#F0E5EC] rounded-xl p-3.5 flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#77717C]">
                            {spec.details_name}
                          </span>
                          <span className="text-[13.5px] font-medium text-[#24212A] mt-1 break-words">
                            {spec.details_value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      {hasCustomizable && hasReadyMade
                        ? 'Customizable & Ready Made'
                        : hasCustomizable
                        ? 'Customizable (Made-to-Measure)'
                        : 'Ready Made'}
                    </span>
                  </div>
                  <div className="bg-neutral-50 border border-neutral-200/70 rounded-xl p-3">
                    <span className="text-[10px] uppercase font-bold text-neutral-400">Boutique</span>
                    <span className="text-xs font-semibold text-neutral-800 block mt-0.5">{brand}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-6 p-5 bg-neutral-50 rounded-2xl border border-neutral-200">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-[#24212A] block tabular-nums">
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
                      <h4 className="text-[13px] font-semibold text-[#24212A]">
                        Customer Photos ({allReviewPhotos.length})
                      </h4>
                      <span className="text-[11px] text-[#77717C] font-normal">Authentic buyer submissions</span>
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

                {/* Verified Buyer Note */}
                <div className="p-3.5 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 flex items-center justify-between text-xs text-neutral-600">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verified customer reviews can be submitted directly from your <strong>Delivered Orders</strong> in My Orders.</span>
                  </div>
                </div>

                {/* Customer Reviews Feed */}
                <div id="customer-reviews-section" className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-semibold text-[#24212A]">
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
                                <div className="w-9 h-9 rounded-full bg-[#24212A] text-white font-semibold text-xs flex items-center justify-center">
                                  {reviewerName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-xs font-semibold text-[#24212A]">{reviewerName}</h5>
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified Buyer
                                  </span>
                                </div>
                                {dateStr && (
                                  <p className="text-[10px] text-[#77717C] mt-0.5">
                                    {new Date(dateStr).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(() => {
                              const starInfo = getStarColor(ratingScore)
                              return (
                                <div className={`flex items-center gap-0.5 ${starInfo.bgClass} px-2.5 py-1 rounded-xl border ${starInfo.borderClass}`}>
                                  <span className={`text-xs font-semibold ${starInfo.textClass} mr-1 tabular-nums`}>{ratingScore}</span>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`w-3 h-3 ${
                                        s <= ratingScore ? starInfo.starClass : 'fill-neutral-200 text-neutral-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              )
                            })()}
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

      {/* Recommended Products: You May Also Like */}
      <RecommendedProductsSection
        productId={targetPid || product?.id}
        currentProductId={targetPid || product?.id}
        onSelectProduct={onSelectProduct || _onSelectProduct}
        onAddToCart={onAddToCart}
        wishlistIds={wishlistIds}
        onToggleWishlist={onToggleWishlist}
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onBuyNow={(prod) => {
          if (onSelectProduct) onSelectProduct(prod)
          else if (_onSelectProduct) _onSelectProduct(prod)
        }}
        className="mt-8 border-t border-[#F0E5EC]"
      />

      {/* Recently Viewed Products Horizontal Carousel */}
      <RecentlyViewedSection
        userId={currentUser?.id}
        currentProductId={targetPid}
        onSelectProduct={onSelectProduct || _onSelectProduct}
        onAddToCart={onAddToCart}
        wishlistIds={wishlistIds}
        onToggleWishlist={onToggleWishlist}
        cartItems={cartItems}
        onOpenCart={onOpenCart}
        onOpenHistory={onOpenHistory}
        onBuyNow={(prod) => {
          if (onSelectProduct) onSelectProduct(prod)
          else if (_onSelectProduct) _onSelectProduct(prod)
        }}
        className="mt-6 border-t border-[#F0E5EC]"
      />

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

      {/* Custom Body Measurements Modal */}
      <CustomMeasurementsModal
        isOpen={isCustomMeasurementsOpen}
        onClose={() => {
          setIsCustomMeasurementsOpen(false)
          setIsBuyNowFlow(false)
        }}
        product={product}
        productId={targetPid || product?.id}
        selectedPriceId={activeSizeObj?.id || activeSizeObj?.price_id}
        currentSize={activeSizeObj?.size || 'XS'}
        availableSizes={
          availableSizes.length > 0
            ? availableSizes.map((s) => s.size)
            : product?.sizes || ['XS', 'S', 'M', 'L', 'XL', 'FREE SIZE']
        }
        currentUser={currentUser}
        initialMeasurements={customMeasurementsData?.measurements}
        isBuyNowFlow={isBuyNowFlow}
        onApplyMeasurements={async (result) => {
          setCustomMeasurementsData(result)
          if (result.priceId) {
            setSelectedPriceId(result.priceId)
          }
          if (result.size && result.size !== activeSizeObj?.size) {
            setSelectedSize(result.size)
          }

          if (result.proceedToCheckout || isBuyNowFlow) {
            // Build itemData with complete measurements and customizable flags
            const itemDataWithMeasurements = {
              ...product,
              id: product.id,
              productId: product.id,
              price_id: result.priceId || activeSizeObj?.id || activeSizeObj?.price_id || null,
              title,
              product_name: title,
              price: finalUnitPrice,
              originalPrice: finalOriginalUnitPrice,
              image: displayImage,
              vendor: brand,
              selectedMaterial: currentMaterial,
              material: currentMaterial?.name || null,
              materialId: currentMaterial?.id || null,
              size: result.size || activeSizeObj?.size || 'Standard',
              selectedSize: result.size || activeSizeObj?.size || 'Standard',
              selectedPrice: finalUnitPrice,
              selectedAddons,
              addons: selectedAddons,
              quantity,
              alteration: includeAlteration,
              is_customizable: 1,
              is_customisable: '1',
              product_type: 0,
              order_type: 'Customizable',
              measurements: result.measurements || [],
              custom_measurements: result.measurements || null,
              measurement_summary: result.summaryText || null,
              measurment_details: result.measurements || [],
              gst_id: activeSizeObj?.gst_id || product.gst_id || null,
              gst_name: activeSizeObj?.gst_name || product.gst_name || null,
              gst_rate: activeSizeObj?.gst_rate || product.gst_rate || null,
              gst_percentage: activeSizeObj?.gst_percentage !== undefined ? Number(activeSizeObj.gst_percentage) : (Number(product.gst_percentage) || 0),
            }

            if (onAddToCart) {
              await onAddToCart(
                itemDataWithMeasurements,
                quantity,
                result.size || activeSizeObj?.size || 'Standard',
                null,
                false // Do not open cart drawer during checkout transition
              )
            }
            setIsBuyNowFlow(false)
            setIsCustomMeasurementsOpen(false)
            if (onOpenCheckout) {
              onOpenCheckout()
            }
          }
        }}
      />
    </div>
  )
}
