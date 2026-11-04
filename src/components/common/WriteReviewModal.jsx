import React, { useState } from 'react'
import { Star, X, AlertCircle } from 'lucide-react'
import { submitProductReview } from '../../services/api'

export default function WriteReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentUser,
  onSuccess,
}) {
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!currentUser?.id) {
      setError('Please log in to leave an atelier review.')
      return
    }
    if (!comment.trim()) {
      setError('Please provide feedback comments for our master tailors.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await submitProductReview({
        userId: currentUser.id,
        productId,
        rating,
        comment: comment.trim(),
      })
      if (res?.status === true || res?.status === 'true' || res?.message?.includes('success')) {
        if (onSuccess) onSuccess()
        onClose()
      } else {
        setError(res?.message || 'Unable to submit review at this time.')
      }
    } catch (err) {
      console.error(err)
      setError('Failed to submit review. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-neutral-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Write an Atelier Review</h3>
            <p className="text-xs text-neutral-500 truncate max-w-xs mt-0.5">
              {productName || 'Bespoke Garment'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating Selector */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-2">
              Your Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-neutral-300 hover:scale-115 transition-transform cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-neutral-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-bold text-neutral-800 ml-2">
                {rating} / 5 Stars
              </span>
            </div>
          </div>

          {/* Feedback textarea */}
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              Your Experience & Fitting Review *
            </label>
            <textarea
              rows={4}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How did the silhouette, textile quality, and tailoring alteration feel?"
              className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none leading-relaxed"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Post Review'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
