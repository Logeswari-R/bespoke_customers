import React, { useState } from 'react'
import { X, Package, Search } from 'lucide-react'

export default function TrackOrderModal({ isOpen, onClose }) {
  const [orderId, setOrderId] = useState('')
  const [tracked, setTracked] = useState(false)

  if (!isOpen) return null

  const handleTrack = (e) => {
    e.preventDefault()
    if (!orderId.trim()) return
    setTracked(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-neutral-900" />
            <h3 className="text-base font-bold text-neutral-900">Track Your Shipment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTrack} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Order or Tracking Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. BES-982314 or 1Z9999999"
                className="w-full text-sm border border-neutral-300 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-neutral-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Track Status</span>
          </button>
        </form>

        {tracked && (
          <div className="mt-6 pt-5 border-t border-neutral-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  In Transit
                </span>
                <p className="text-sm font-bold text-neutral-900 mt-1">Order #{orderId || 'BES-89104'}</p>
              </div>
              <span className="text-xs text-neutral-500">Exp. Arrival: Tomorrow</span>
            </div>

            <div className="space-y-3 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]">
                  ✓
                </span>
                <p className="text-xs font-bold text-neutral-900">Order Confirmed</p>
                <p className="text-[11px] text-neutral-500">Tailoring & quality checked at atelier</p>
              </div>
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]">
                  ✓
                </span>
                <p className="text-xs font-bold text-neutral-900">Dispatched from Hub</p>
                <p className="text-[11px] text-neutral-500">Handed to Express Courier partner</p>
              </div>
              <div className="relative">
                <span className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
                <p className="text-xs font-bold text-blue-600">Out for Delivery</p>
                <p className="text-[11px] text-neutral-500">Courier agent assigned to destination</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
