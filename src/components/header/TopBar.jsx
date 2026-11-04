import React, { useState, useEffect } from 'react'
import { HelpCircle, Package, ChevronRight, ChevronLeft, Globe } from 'lucide-react'

const BESPOKE_ANNOUNCEMENTS = [
  '✨ FREE EXPRESS SHIPPING on all orders over ₹499 — Fast Delivery Across India',
  '🔥 Grand Opening Special Offer: Up to 70% Off + Extra 15% Off with code BESPOKE15',
  '🎁 Artisanal & Handcrafted Designer Wear with Doorstep Alteration & 30-Day Returns',
]

export default function TopBar({ onOpenTrackOrder, onOpenSupport }) {
  const [announcementIdx, setAnnouncementIdx] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % BESPOKE_ANNOUNCEMENTS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  const nextAnnouncement = () => {
    setAnnouncementIdx((prev) => (prev + 1) % BESPOKE_ANNOUNCEMENTS.length)
  }

  const prevAnnouncement = () => {
    setAnnouncementIdx((prev) => (prev - 1 + BESPOKE_ANNOUNCEMENTS.length) % BESPOKE_ANNOUNCEMENTS.length)
  }

  return (
    <div className="bg-[#121212] text-gray-200 text-xs py-2 px-4 sm:px-6 lg:px-8 border-b border-neutral-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Store locator / country */}
        <div className="hidden md:flex items-center gap-4 text-gray-400">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
            <Globe className="w-3.5 h-3.5 text-pink-400" />
            <span>IN | INR (₹)</span>
          </div>
          <span className="text-neutral-700">|</span>
          <span className="hover:text-white transition-colors cursor-pointer">
            Boutique Locations
          </span>
        </div>

        {/* Center: Promotional announcement ticker */}
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="inline-flex items-center gap-2 max-w-full">
            <button
              onClick={prevAnnouncement}
              className="p-0.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
              aria-label="Previous announcement"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-medium tracking-wide truncate text-[11px] sm:text-xs select-none">
              {BESPOKE_ANNOUNCEMENTS[announcementIdx]}
            </span>
            <button
              onClick={nextAnnouncement}
              className="p-0.5 text-gray-500 hover:text-white transition-colors cursor-pointer"
              aria-label="Next announcement"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Customer support & Track order */}
        <div className="flex items-center gap-4 shrink-0 text-gray-300">
          <button
            onClick={onOpenTrackOrder}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            aria-label="Track your order"
          >
            <Package className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Track Order</span>
          </button>
          <span className="text-neutral-700">|</span>
          <button
            onClick={onOpenSupport}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            aria-label="Customer support"
          >
            <HelpCircle className="w-3.5 h-3.5 text-pink-400" />
            <span>24/7 Support</span>
          </button>
        </div>
      </div>
    </div>
  )
}
