import React, { useState, useEffect, useMemo } from 'react'
import {
  Ruler,
  Scissors,
  X,
  Check,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  User,
  Plus,
} from 'lucide-react'
import {
  getProductMeasurementsSizeWise,
  getMeasurementsByPrice,
  getSavedMeasurementProfiles,
  saveMeasurementProfile,
  formatImageUrl,
} from '../../services/api'

export default function CustomMeasurementsModal({
  isOpen,
  onClose,
  product,
  productId,
  selectedPriceId,
  currentSize = 'XS',
  availableSizes = [],
  onApplyMeasurements,
  currentUser = null,
  initialMeasurements = null,
  isBuyNowFlow = false,
}) {
  const [activeSize, setActiveSize] = useState(currentSize || 'XS')
  const [activePriceId, setActivePriceId] = useState(selectedPriceId)
  const [sizewiseData, setSizewiseData] = useState([])
  const [sizesList, setSizesList] = useState([])
  const [measurementSchema, setMeasurementSchema] = useState([])
  const [inputValues, setInputValues] = useState({})
  const [clearedFields, setClearedFields] = useState({})
  const [errors, setErrors] = useState({})
  const [savedProfiles, setSavedProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [newProfileName, setNewProfileName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Target product ID
  const targetProductId = productId || product?.id || product?.product_id

  // Sync size & priceId on open or props change
  useEffect(() => {
    if (isOpen) {
      setActiveSize(currentSize || 'XS')
      setActivePriceId(selectedPriceId)
      setErrors({})
      setClearedFields({})
      setSelectedProfileId('')
      setNewProfileName('')
      setSaveSuccessMsg('')
    }
  }, [isOpen, currentSize, selectedPriceId])

  // Load saved profiles for authenticated user
  const fetchProfiles = async () => {
    const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.cust_id
    if (!currentUserId) return
    try {
      const res = await getSavedMeasurementProfiles(currentUserId)
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.profiles)
        ? res.data.profiles
        : []
      setSavedProfiles(list)
    } catch (e) {
      console.warn('Failed loading profiles:', e)
    }
  }

  useEffect(() => {
    if (isOpen && currentUser?.id) {
      fetchProfiles()
    }
  }, [isOpen, currentUser?.id])

  // Helper to compute ±2 range from base standard value
  const calculateRange = (baseVal) => {
    const num = parseFloat(baseVal)
    if (isNaN(num) || num <= 0) {
      return { base: 0, min: 1, max: 99 }
    }
    const min = num > 2 ? Number((num - 2).toFixed(1)) : Math.max(0.5, Number((num - 2).toFixed(1)))
    const max = Number((num + 2).toFixed(1))
    return { base: num, min, max }
  }

  // Build schema and apply values for a given size based on sizewise data
  const applySizeData = (targetSize, sourceList) => {
    const sizewise = sourceList || sizewiseData
    let foundSizeObj = null

    if (Array.isArray(sizewise) && sizewise.length > 0) {
      foundSizeObj = sizewise.find(
        (item) => String(item.size || item.size_name).toUpperCase() === String(targetSize).toUpperCase()
      )
      if (!foundSizeObj) {
        foundSizeObj = sizewise[0]
      }
    }

    if (foundSizeObj && Array.isArray(foundSizeObj.measurements) && foundSizeObj.measurements.length > 0) {
      const schema = foundSizeObj.measurements.map((m) => {
        const { base, min, max } = calculateRange(m.value)
        return {
          measurement_id: m.id || m.measurement_id,
          name: m.name || m.measurment_name || `Point #${m.id}`,
          measurment_name: m.name || m.measurment_name,
          standard_value: base > 0 ? base : null,
          min_value: min,
          max_value: max,
          unit: 'inches',
          img_path: m.img_path || m.image || null,
        }
      })

      setMeasurementSchema(schema)

      const initialVals = {}
      schema.forEach((item) => {
        const existing =
          initialMeasurements?.[item.measurement_id] ??
          initialMeasurements?.[item.name]
        initialVals[item.measurement_id] =
          existing !== undefined && existing !== null && existing !== ''
            ? String(existing)
            : item.standard_value
            ? String(item.standard_value)
            : ''
      })

      setInputValues(initialVals)
      setErrors({})
      return true
    }

    // Fallback: check product.measurements_table from product show API
    if (product?.measurements_table && product.measurements_table.length > 0) {
      const schema = product.measurements_table.map((m) => {
        const valFromSize =
          m.values?.[targetSize] ??
          m.values?.[targetSize.toUpperCase()] ??
          Object.values(m.values || {})[0]
        const { base, min, max } = calculateRange(valFromSize)
        return {
          measurement_id: m.measurement_id,
          name: m.measurement_name,
          measurment_name: m.measurement_name,
          standard_value: base > 0 ? base : null,
          min_value: min,
          max_value: max,
          unit: 'inches',
          img_path: m.measurement_image,
          values: m.values,
        }
      })

      setMeasurementSchema(schema)
      const initialVals = {}
      schema.forEach((item) => {
        initialVals[item.measurement_id] = item.standard_value ? String(item.standard_value) : ''
      })
      setInputValues(initialVals)
      setErrors({})
      return true
    }

    return false
  }

  // Fetch product sizewise measurements matrix directly from DB via API
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setIsLoading(true)

    async function loadSizewiseFromApi() {
      let resolvedSizewise = []
      let resolvedSizes = []

      // 1. Fetch sizewise measurements from API (/api/product-measurements/sizewise/:product_id)
      if (targetProductId) {
        try {
          const res = await getProductMeasurementsSizeWise(targetProductId)
          if (!cancelled && res?.status && res.data) {
            if (Array.isArray(res.data.sizewise_measurements) && res.data.sizewise_measurements.length > 0) {
              resolvedSizewise = res.data.sizewise_measurements
              setSizewiseData(res.data.sizewise_measurements)
            }
            if (Array.isArray(res.data.distinct_size_names) && res.data.distinct_size_names.length > 0) {
              resolvedSizes = res.data.distinct_size_names
            } else if (Array.isArray(res.data.sizes) && res.data.sizes.length > 0) {
              resolvedSizes = res.data.sizes.map((s) => (typeof s === 'object' ? s.size : String(s)))
            }
          }
        } catch (err) {
          console.warn('[CustomMeasurementsModal] getProductMeasurementsSizeWise error:', err)
        }
      }

      // Fallback size list
      if (resolvedSizes.length === 0) {
        if (availableSizes.length > 0) {
          resolvedSizes = availableSizes
        } else if (product?.sizes && product.sizes.length > 0) {
          resolvedSizes = product.sizes
        } else {
          resolvedSizes = ['XS', 'S', 'M', 'L', 'XL', 'FREE SIZE']
        }
      }
      setSizesList(resolvedSizes)

      // Apply initial size schema
      const initialSize = activeSize || currentSize || resolvedSizes[0] || 'XS'
      const applied = applySizeData(initialSize, resolvedSizewise)

      // 2. If sizewise had 0 measurements, try by-price API as secondary database fallback
      if (!applied && activePriceId) {
        try {
          const priceRes = await getMeasurementsByPrice(activePriceId)
          if (!cancelled && priceRes?.status && Array.isArray(priceRes.data) && priceRes.data.length > 0) {
            const schema = priceRes.data.map((item) => {
              const { base, min, max } = calculateRange(item.standard_value ?? item.value)
              return {
                measurement_id: item.measurement_id,
                name: item.name || item.measurment_name,
                measurment_name: item.name || item.measurment_name,
                standard_value: base > 0 ? base : null,
                min_value: min,
                max_value: max,
                unit: item.unit || 'inches',
                img_path: item.img_path || item.image,
              }
            })
            setMeasurementSchema(schema)
            const initialVals = {}
            schema.forEach((item) => {
              initialVals[item.measurement_id] = item.standard_value ? String(item.standard_value) : ''
            })
            setInputValues(initialVals)
            setErrors({})
          }
        } catch (priceErr) {
          console.warn('[CustomMeasurementsModal] getMeasurementsByPrice error:', priceErr)
        }
      }

      setIsLoading(false)
    }

    loadSizewiseFromApi()

    return () => {
      cancelled = true
    }
  }, [isOpen, targetProductId])

  // Handle switching size tabs (XS, S, M, L, XL, etc.)
  const handleSelectSize = (sz) => {
    setActiveSize(sz)
    setClearedFields({})
    applySizeData(sz, sizewiseData)

    // Sync matching price_id if materials/prices exist
    if (product?.product_materials || product?.materials) {
      const mats = product.product_materials || product.materials
      for (const m of mats) {
        const prices = [
          ...(m.prices?.customizable_products || []),
          ...(m.prices?.ready_made_products || []),
        ]
        const matched = prices.find((p) => String(p.size).toUpperCase() === String(sz).toUpperCase())
        if (matched?.id) {
          setActivePriceId(matched.id)
          break
        }
      }
    }
  }

  // Handle user focus on input box: if it's the auto-populated default, clear it so the box is empty for direct typing!
  const handleInputFocus = (mid) => {
    if (!clearedFields[mid]) {
      setInputValues((prev) => ({
        ...prev,
        [mid]: '',
      }))
      setClearedFields((prev) => ({
        ...prev,
        [mid]: true,
      }))
    }
  }

  // Value change & strict ±2 validation from size base
  const handleValueChange = (mid, val, min, max) => {
    setInputValues((prev) => ({ ...prev, [mid]: val }))
    setClearedFields((prev) => ({ ...prev, [mid]: true }))

    if (val === '' || val === null || val === undefined) {
      setErrors((prev) => ({
        ...prev,
        [mid]: `Please enter value between ${min}" and ${max}"`,
      }))
      return
    }

    const num = parseFloat(val)
    if (isNaN(num)) {
      setErrors((prev) => ({ ...prev, [mid]: 'Please enter a valid number' }))
    } else if (num < min || num > max) {
      setErrors((prev) => ({
        ...prev,
        [mid]: `Must be between ${min}" and ${max}" (±2" of standard ${activeSize})`,
      }))
    } else {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[mid]
        return copy
      })
    }
  }

  // Quick action: Restore exact standard value for this size
  const handleResetToStandard = (mid, stdVal, min, max) => {
    if (stdVal === null || stdVal === undefined) return
    const strVal = String(stdVal)
    setInputValues((prev) => ({ ...prev, [mid]: strVal }))
    setClearedFields((prev) => ({ ...prev, [mid]: true }))
    setErrors((prev) => {
      const copy = { ...prev }
      delete copy[mid]
      return copy
    })
  }

  // Handle profile selection from saved profiles
  const handleSelectProfile = (profileId) => {
    setSelectedProfileId(profileId)
    if (!profileId) {
      // Revert to current size base measurements
      applySizeData(activeSize, sizewiseData)
      return
    }
    const prof = savedProfiles.find((p) => String(p.id) === String(profileId))
    if (!prof) return

    const newVals = { ...inputValues }
    const details = prof.measurements || prof.customer_measurement || prof.details || []
    const updatedCleared = { ...clearedFields }

    details.forEach((d) => {
      const mid = d.measurement_id || d.measurment_id
      if (mid !== undefined && mid !== null) {
        newVals[mid] = String(d.value)
        updatedCleared[mid] = true
      }
    })

    setInputValues(newVals)
    setClearedFields(updatedCleared)

    // Validate newly applied values against current size limits
    const newErr = {}
    measurementSchema.forEach((item) => {
      const rawVal = newVals[item.measurement_id]
      if (rawVal !== undefined && rawVal !== '') {
        const val = parseFloat(rawVal)
        if (isNaN(val)) {
          newErr[item.measurement_id] = `Must be between ${item.min_value}" and ${item.max_value}"`
        } else if (val < item.min_value || val > item.max_value) {
          newErr[item.measurement_id] = `Must be between ${item.min_value}" and ${item.max_value}" (±2" of standard ${activeSize})`
        }
      }
    })
    setErrors(newErr)
  }

  // Submit measurements (proceedToCheckout = true redirects to /checkout, false saves to product)
  const handleApply = async (proceedToCheckout = false) => {
    // Validate all fields strictly against ±2 range
    const newErr = {}
    measurementSchema.forEach((item) => {
      const raw = inputValues[item.measurement_id]
      if (raw === '' || raw === null || raw === undefined) {
        newErr[item.measurement_id] = `Required (between ${item.min_value}" and ${item.max_value}")`
        return
      }
      const val = parseFloat(raw)
      if (isNaN(val) || val <= 0) {
        newErr[item.measurement_id] = 'Valid measurement required'
      } else if (val < item.min_value || val > item.max_value) {
        newErr[item.measurement_id] = `Must be between ${item.min_value}" and ${item.max_value}" (±2" of standard ${activeSize})`
      }
    })

    if (Object.keys(newErr).length > 0) {
      setErrors(newErr)
      return
    }

    const formattedPayload = measurementSchema.map((item) => ({
      measurement_id: item.measurement_id,
      name: item.name || item.measurment_name,
      value: String(inputValues[item.measurement_id]),
      unit: item.unit || 'inches',
    }))

    // Save as new measurement profile if user did NOT select an existing profile
    const currentUserId = currentUser?.id || currentUser?.user_id || currentUser?.cust_id
    if (!selectedProfileId && currentUserId) {
      setIsSaving(true)
      const profileNameToSave =
        newProfileName.trim() ||
        `${product?.product_name || product?.title || 'Bespoke Garment'} Fit`

      try {
        await saveMeasurementProfile({
          user_id: currentUserId,
          cust_id: currentUserId,
          name: profileNameToSave,
          profile_name: profileNameToSave,
          gender: product?.gender || 'MALE',
          measurements: formattedPayload.map((m) => ({
            measurement_id: Number(m.measurement_id),
            value: String(m.value),
          })),
        })
        setSaveSuccessMsg(`Saved as profile: "${profileNameToSave}"`)
        // Refresh saved profiles in background
        fetchProfiles()
      } catch (err) {
        console.warn('Failed saving profile:', err)
      } finally {
        setIsSaving(false)
      }
    }

    if (onApplyMeasurements) {
      await onApplyMeasurements({
        size: activeSize,
        priceId: activePriceId,
        measurements: formattedPayload,
        summaryText: formattedPayload.map((m) => `${m.name}: ${m.value}"`).join(', '),
        proceedToCheckout: Boolean(proceedToCheckout || isBuyNowFlow),
        selectedProfileId: selectedProfileId || null,
      })
    }

    onClose()
  }

  if (!isOpen) return null

  const hasErrors = Object.keys(errors).length > 0
  const selectedProfileObj = savedProfiles.find((p) => String(p.id) === String(selectedProfileId))

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-pink-50/80 via-white to-pink-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-theme-gradient text-white flex items-center justify-center shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span>Customizable Measurement Table</span>
                <span className="text-[10px] bg-pink-100 text-[var(--theme-primary)] font-extrabold px-2 py-0.5 rounded-full">
                  Database Verified
                </span>
              </h3>
              <p className="text-xs text-neutral-500 truncate max-w-md mt-0.5">
                {product?.product_name || product?.title || 'Bespoke Atelier Garment'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Choose from Saved Profiles */}
          <div className="p-4 bg-neutral-50/80 border border-neutral-200/90 rounded-2xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-theme-primary" />
                <span>1. Choose Saved Measurements Profile</span>
              </span>
              {selectedProfileId ? (
                <button
                  type="button"
                  onClick={() => handleSelectProfile('')}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear & Enter New Custom Measurements</span>
                </button>
              ) : (
                <span className="text-[10px] text-neutral-400 font-medium">
                  {savedProfiles.length} profile{savedProfiles.length !== 1 ? 's' : ''} saved
                </span>
              )}
            </div>

            {savedProfiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {savedProfiles.map((prof) => {
                  const isSelected = String(prof.id) === String(selectedProfileId)
                  const count = (prof.measurements || prof.customer_measurement || []).length
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => handleSelectProfile(isSelected ? '' : prof.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[var(--theme-primary)] bg-pink-50 shadow-xs ring-2 ring-pink-200'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs font-bold text-neutral-900 truncate">
                            {prof.name || prof.profile_name || `Profile #${prof.id}`}
                          </strong>
                          {prof.gender && (
                            <span className="text-[9px] font-semibold text-neutral-500 uppercase px-1.5 py-0.2 bg-neutral-100 rounded">
                              {prof.gender}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          {count > 0 ? `${count} measurement points` : 'Saved fitting profile'}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white'
                            : 'border-neutral-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : currentUser ? (
              <p className="text-xs text-neutral-500">
                You haven't saved any measurement profiles yet. Enter your measurements below and they will be automatically saved under your account for future orders!
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Please log in to load your saved measurement profiles.
              </p>
            )}

            {/* Active Profile Banner */}
            {selectedProfileObj && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Using saved profile: <strong>{selectedProfileObj.name || selectedProfileObj.profile_name}</strong>
                  </span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                  Values Loaded
                </span>
              </div>
            )}
          </div>

          {/* New Profile Name Input (Visible if NO existing profile is selected) */}
          {!selectedProfileId && currentUser && (
            <div className="p-4 bg-gradient-to-r from-pink-50/70 via-rose-50/40 to-pink-50/70 border border-pink-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-theme-primary" />
                <span className="text-xs font-bold text-neutral-900">
                  Save as New Body Measurement Profile
                </span>
                <span className="text-[10px] bg-pink-100 text-[var(--theme-primary)] font-bold px-2 py-0.5 rounded-full">
                  Auto-saved to Profile
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                Give this fit a name to save it under your profile so you can reuse these measurements for future orders:
              </p>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={`e.g. ${product?.product_name ? `${product.product_name} Fit` : 'My Custom Fit'}`}
                className="w-full py-2.5 px-3.5 bg-white border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-theme-primary"
              />
            </div>
          )}

          {/* 2. Base Size Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-theme-primary" />
                <span>2. Select Standard Size Baseline</span>
              </span>
              <span className="text-xs font-bold text-[var(--theme-primary)]">
                Selected: {activeSize}
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mb-2.5">
              Each size has standard atelier measurements from the database. Custom tailoring allows ±2" adjustment per point.
            </p>
            <div className="flex flex-wrap gap-2">
              {sizesList.map((sz) => {
                const isSelected = String(sz).toUpperCase() === String(activeSize).toUpperCase()
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleSelectSize(sz)}
                    className={`min-w-12 h-10 px-3.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-[var(--theme-primary)] bg-theme-gradient text-white shadow-xs scale-102 ring-2 ring-pink-200'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50'
                    }`}
                  >
                    {sz}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Customizable Measurement Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-theme-primary" />
                <span>3. Customize Points for Size {activeSize} (Inches)</span>
              </span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                Range: ±2" allowed
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-neutral-500 font-medium">
                  Loading size-wise tailoring specifications from database...
                </p>
              </div>
            ) : measurementSchema.length > 0 ? (
              <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {measurementSchema.map((item) => {
                  const mid = item.measurement_id
                  const val = inputValues[mid] ?? ''
                  const err = errors[mid]
                  const imgUrl = formatImageUrl(item.img_path || item.image)
                  const hasValidNumber = val !== '' && !err

                  return (
                    <div
                      key={mid}
                      className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        err
                          ? 'bg-rose-50/50'
                          : hasValidNumber
                          ? 'bg-white hover:bg-neutral-50/70'
                          : 'bg-neutral-50/30'
                      }`}
                    >
                      {/* Left: Point details & Diagram */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover border border-neutral-200 shrink-0 bg-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-pink-100 text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                            <Ruler className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-neutral-900 capitalize truncate">
                            {item.name || item.measurment_name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-neutral-500">
                            <span>
                              Standard: <strong className="text-neutral-800">{item.standard_value ?? '-'}</strong>"
                            </span>
                            <span className="text-neutral-300">•</span>
                            <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded">
                              Allowed: {item.min_value}" - {item.max_value}"
                            </span>
                          </div>
                          {err && (
                            <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{err}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Input box & Helper Button */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {item.standard_value && (
                          <button
                            type="button"
                            onClick={() =>
                              handleResetToStandard(
                                mid,
                                item.standard_value,
                                item.min_value,
                                item.max_value
                              )
                            }
                            className="px-2 py-1 text-[10px] font-bold text-neutral-500 hover:text-[var(--theme-primary)] bg-neutral-100 hover:bg-pink-50 rounded-lg transition-colors cursor-pointer"
                            title="Reset to standard measurement for this size"
                          >
                            Use Std ({item.standard_value}")
                          </button>
                        )}

                        <div className="w-28 relative">
                          <input
                            type="number"
                            step="0.5"
                            min={item.min_value}
                            max={item.max_value}
                            value={val}
                            onFocus={() => handleInputFocus(mid)}
                            onChange={(e) =>
                              handleValueChange(
                                mid,
                                e.target.value,
                                item.min_value,
                                item.max_value
                              )
                            }
                            placeholder={item.standard_value ? `${item.standard_value}` : '0.0'}
                            className={`w-full py-2 px-3 text-right pr-7 rounded-xl text-xs font-semibold tabular-nums border transition-all focus:outline-none ${
                              err
                                ? 'border-rose-400 bg-white text-rose-700 ring-2 ring-rose-100'
                                : hasValidNumber
                                ? 'border-emerald-300 bg-white text-neutral-900 focus:border-theme-primary'
                                : 'border-neutral-300 bg-white text-neutral-900 focus:border-theme-primary'
                            }`}
                          />
                          <span className="absolute right-2.5 top-2.5 text-xs font-extrabold text-neutral-400 pointer-events-none">
                            "
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 bg-neutral-50 rounded-2xl text-center text-xs text-neutral-500">
                No custom measurement points defined in database for this garment.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-neutral-200 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 ml-auto">
            {/* Action 1: Save Fit for Garment */}
            <button
              type="button"
              disabled={isSaving || hasErrors || isLoading}
              onClick={() => handleApply(false)}
              className="px-4 py-2.5 bg-white border border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-pink-50 rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Fit'}
            </button>

            {/* Action 2: Save & Proceed to Checkout */}
            <button
              type="button"
              disabled={isSaving || hasErrors || isLoading}
              onClick={() => handleApply(true)}
              className={`px-5 sm:px-6 py-2.5 sm:py-3 btn-theme text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all ${
                hasErrors || isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'
              }`}
            >
              {isSaving ? (
                <span>Saving Fit...</span>
              ) : (
                <>
                  <span>Save & Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
