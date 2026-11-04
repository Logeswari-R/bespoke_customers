import React from 'react'
import { X, Phone, Mail, MessageSquare, ShieldCheck } from 'lucide-react'

export default function CustomerSupportModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Bespoke Concierge & Support</h3>
            <p className="text-xs text-neutral-500">24/7 dedicated assistance for your shopping journey</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="p-2 bg-white rounded-lg shadow-xs text-neutral-900">
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-neutral-900">Toll-Free Priority Line</h4>
              <p className="text-xs text-neutral-600 mt-0.5">+1 (800) 237-7653</p>
              <span className="text-[10px] text-neutral-400">Mon-Sun: 8:00 AM – 11:00 PM EST</span>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="p-2 bg-white rounded-lg shadow-xs text-neutral-900">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-neutral-900">Instant Concierge Chat</h4>
              <p className="text-xs text-neutral-600 mt-0.5">Average reply time under 2 minutes</p>
              <button
                type="button"
                onClick={() => alert('Starting Live Chat Concierge...')}
                className="mt-2 text-xs font-semibold text-neutral-900 underline hover:text-black cursor-pointer"
              >
                Start Chat Now &rarr;
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-100">
            <div className="p-2 bg-white rounded-lg shadow-xs text-neutral-900">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-neutral-900">Email Care</h4>
              <p className="text-xs text-neutral-600 mt-0.5">concierge@bespoke-customers.com</p>
              <span className="text-[10px] text-neutral-400">Guaranteed response within 4 hours</span>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Buyer Protection Guarantee</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-900 font-semibold hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
