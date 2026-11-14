import React, { useState, useEffect, useRef } from 'react'
import {
  Star,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Edit3,
} from 'lucide-react'
import { submitProductReview, formatImageUrl, getStarColor } from '../../services/api'

const MAX_PHOTOS = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const RATING_LABELS = {
  1: '1 Star — Unsatisfactory Fit & Craft',
  2: '2 Stars — Below Expectations',
  3: '3 Stars — Average Quality',
  4: '4 Stars — Very Good Quality & Craftsmanship',
  5: '5 Stars — Outstanding Atelier Perfection',
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  saleOrderId = null,
  productId = null,
  productName = '',
  productImage = null,
  currentUser = null,
  onSuccess,
  isEditMode = false,
  initialRating = 5,
  initialReview = '',
  initialComment = '',
  initialImages = [],
}) {
  const [rating, setRating] = useState(initialRating || 5)
  const [hoverRating, setHoverRating] = useState(0)
  const [review, setReview] = useState(initialReview || initialComment || '')
  const [existingPhotos, setExistingPhotos] = useState([])
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [deletedImageIds, setDeletedImageIds] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Sync initial review data when opening
  useEffect(() => {
    if (isOpen) {
      setRating(Number(initialRating) || 5)
      setReview(initialReview || initialComment || '')
      setSelectedPhotos([])
      setDeletedImageIds([])
      setError('')
      setUploadStatus('')

      // Parse and format initial existing images
      const rawList = Array.isArray(initialImages) ? initialImages : []
      const formatted = rawList
        .map((img, idx) => {
          if (!img) return null
          if (typeof img === 'string') {
            return {
              id: `existing-${idx}`,
              url: formatImageUrl(img),
              originalId: null,
            }
          }
          return {
            id: img.id ? `img-${img.id}` : `existing-${idx}`,
            originalId: img.id || null,
            url: formatImageUrl(img.image_path || img.img_path || img.image_url || img.url),
          }
        })
        .filter(Boolean)

      setExistingPhotos(formatted)
    }
  }, [isOpen, initialRating, initialReview, initialComment, initialImages])

  // Clean up object URLs on unmount or close
  useEffect(() => {
    return () => {
      selectedPhotos.forEach((photo) => {
        if (photo.previewUrl && photo.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photo.previewUrl)
        }
      })
    }
  }, [selectedPhotos])

  if (!isOpen) return null

  const totalPhotosCount = existingPhotos.length + selectedPhotos.length

  // --------------------------------------------------------------------------
  // Photo Selection & Validation
  // --------------------------------------------------------------------------
  const handleFiles = (files) => {
    setError('')
    if (!files || files.length === 0) return

    const incomingList = Array.from(files)
    const currentCount = existingPhotos.length + selectedPhotos.length

    if (currentCount + incomingList.length > MAX_PHOTOS) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos. You can only add ${MAX_PHOTOS - currentCount} more.`)
      return
    }

    const newPhotos = []

    for (const file of incomingList) {
      // Validate format
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        setError(`"${file.name}" has an unsupported format. Please upload JPG, PNG, or WebP images.`)
        return
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 5MB size limit. Please choose a smaller photo.`)
        return
      }

      // Check duplicates
      const isDuplicate = selectedPhotos.some(
        (p) => p.file.name === file.name && p.file.size === file.size
      )
      if (isDuplicate) {
        continue
      }

      newPhotos.push({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        name: file.name,
        size: file.size,
        previewUrl: URL.createObjectURL(file),
      })
    }

    if (newPhotos.length > 0) {
      setSelectedPhotos((prev) => [...prev, ...newPhotos])
    }
  }

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveNewPhoto = (idToRemove) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((p) => p.id === idToRemove)
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((p) => p.id !== idToRemove)
    })
  }

  const handleRemoveExistingPhoto = (photo) => {
    if (photo.originalId) {
      setDeletedImageIds((prev) => [...prev, photo.originalId])
    }
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photo.id))
  }

  // --------------------------------------------------------------------------
  // Form Submission
  // --------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!currentUser?.id && !currentUser?.user_id) {
      setError('Please log in to leave an authentic atelier review.')
      return
    }

    const activeRating = Number(rating)
    if (!activeRating || activeRating < 1 || activeRating > 5) {
      setError('Please select a star rating from 1 to 5.')
      return
    }

    if (!review.trim()) {
      setError('Please describe your fitting, fabric quality, and silhouette experience.')
      return
    }

    setIsSubmitting(true)
    setUploadStatus(
      selectedPhotos.length > 0
        ? `Optimizing and uploading ${selectedPhotos.length} new photo${selectedPhotos.length > 1 ? 's' : ''} to AWS S3...`
        : isEditMode
        ? 'Updating review...'
        : 'Submitting review...'
    )

    try {
      const payload = {
        saleOrderId: saleOrderId || null,
        productId: productId || null,
        userId: currentUser.id || currentUser.user_id,
        ratings: activeRating,
        review: review.trim(),
        images: selectedPhotos.map((p) => p.file),
        deletedImageIds: deletedImageIds,
      }

      const res = await submitProductReview(payload)

      if (res?.status === true || res?.status === 'true' || res?.message?.includes('success')) {
        setUploadStatus(isEditMode ? 'Review updated successfully!' : 'Review submitted successfully!')
        if (onSuccess) {
          const successData = {
            ...(res.data || {}),
            sale_order_id: saleOrderId,
            ratings: activeRating,
            rating: activeRating,
            review: review.trim(),
            images:
              res.data?.images && res.data.images.length > 0
                ? res.data.images
                : [
                    ...existingPhotos.map((p) => ({
                      id: p.originalId,
                      image_path: p.url,
                      url: p.url,
                    })),
                    ...selectedPhotos.map((p) => ({
                      image_path: p.previewUrl,
                      url: p.previewUrl,
                    })),
                  ],
          }
          onSuccess(successData)
        }
        setTimeout(() => {
          onClose()
        }, 500)
      } else {
        const errorMsg =
          res?.errors?.sale_order_id?.[0] ||
          res?.errors?.images?.[0] ||
          res?.errors?.ratings?.[0] ||
          res?.errors?.review?.[0] ||
          res?.message ||
          'Unable to submit review at this time. Please ensure you have purchased this creation.'
        setError(errorMsg)
      }
    } catch (err) {
      console.error('Review submit error:', err)
      setError('Network error while saving review. Please try again.')
    } finally {
      setIsSubmitting(false)
      setUploadStatus('')
    }
  }

  const activeDisplayRating = hoverRating || rating
  const ratingColorInfo = getStarColor(activeDisplayRating)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-neutral-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            {productImage ? (
              <img
                src={formatImageUrl(productImage)}
                alt={productName}
                className="w-12 h-14 object-cover rounded-xl border border-neutral-200 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                {isEditMode ? <Edit3 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">
                  {isEditMode ? 'Edit Your Atelier Review' : 'Write an Atelier Review'}
                </h3>
                {isEditMode && (
                  <span className="badge-theme-subtle text-[9px] py-0.5 px-2 font-bold uppercase tracking-wider">
                    Editing
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                {productName || (saleOrderId ? `Order Item #${saleOrderId}` : 'Bespoke Garment')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          <form id="write-review-form" onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Star Rating Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Rating *
                </label>
                <span className={`text-xs font-black transition-colors ${ratingColorInfo.textClass}`}>
                  {rating} of 5 Stars
                </span>
              </div>

              <div className={`flex items-center gap-1.5 p-3 rounded-2xl border transition-all ${ratingColorInfo.bgClass} ${ratingColorInfo.borderClass}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-120 transition-transform cursor-pointer focus:outline-none"
                    title={`${star} Star`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        activeDisplayRating >= star
                          ? ratingColorInfo.starClass
                          : 'text-neutral-300 fill-transparent'
                      }`}
                    />
                  </button>
                ))}
                <span className={`text-xs font-bold ml-3 truncate transition-colors ${ratingColorInfo.textClass}`}>
                  {RATING_LABELS[activeDisplayRating] || `${activeDisplayRating} Stars`}
                </span>
              </div>
            </div>

            {/* 2. Review Description Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                  Your Review Description *
                </label>
                <span className="text-[10px] text-neutral-400 font-medium">
                  {review.length} characters
                </span>
              </div>
              <textarea
                rows={4}
                required
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Describe your fit, textile drape, stitching accuracy, and bespoke artisan alteration..."
                className="w-full px-3.5 py-3 text-xs border border-neutral-200 rounded-2xl focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none leading-relaxed transition-colors placeholder:text-neutral-400"
              />
            </div>

            {/* 3. Multiple Photo Upload Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                  <label className="text-[11px] font-bold text-neutral-700 uppercase tracking-wider">
                    Add Photos (Optional)
                  </label>
                </div>
                <span className="text-[11px] font-semibold text-neutral-500">
                  {totalPhotosCount} / {MAX_PHOTOS} photos
                </span>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Upload Dropzone */}
              {totalPhotosCount < MAX_PHOTOS && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[var(--theme-primary)] bg-pink-50/40'
                      : 'border-neutral-200 hover:border-neutral-300 bg-neutral-50/50 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-pink-50 text-[var(--theme-primary)] flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-neutral-800">
                    Click to browse or drag & drop photos
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    JPG, JPEG, PNG, or WebP up to 5MB each (Max {MAX_PHOTOS} photos)
                  </p>
                </div>
              )}

              {/* Photo Previews with Individual Removal */}
              {totalPhotosCount > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {/* Existing uploaded photos */}
                  {existingPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs"
                    >
                      <img
                        src={photo.url}
                        alt="Existing review upload"
                        className="w-full h-full object-cover"
                      />

                      {/* Remove Button Overlay with Proper Text / Trash Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveExistingPhoto(photo)
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                        title="Remove existing photo"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span className="text-[9px] font-bold mt-1 text-rose-200">Remove</span>
                      </button>

                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 py-0.2 rounded font-medium">
                        Uploaded
                      </span>
                    </div>
                  ))}

                  {/* Newly selected photos */}
                  {selectedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 shadow-2xs"
                    >
                      <img
                        src={photo.previewUrl}
                        alt={photo.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Remove Button Overlay with Proper Text / Trash Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveNewPhoto(photo.id)
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                        title="Remove new photo"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span className="text-[9px] font-bold mt-1 text-rose-200">Remove</span>
                      </button>

                      {/* Size tag */}
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 py-0.2 rounded font-mono">
                        {(photo.size / (1024 * 1024)).toFixed(1)}MB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2">
          {uploadStatus && (
            <div className="text-[11px] text-neutral-600 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--theme-primary)]" />
              <span>{uploadStatus}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-3 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="write-review-form"
              disabled={isSubmitting || !review.trim()}
              className="flex-1 py-3 btn-theme text-xs font-bold uppercase tracking-wider shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditMode ? 'Updating Review...' : 'Submitting Review...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isEditMode ? 'Update Review' : 'Submit Review'}{' '}
                    {totalPhotosCount > 0 ? `(${totalPhotosCount} Photos)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
