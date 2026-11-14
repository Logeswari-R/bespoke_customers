import React from 'react'
import { ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react'

export default function RefundPolicyPage({ onBack }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
          Returns & Refunds Policy
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Returns, Alterations & Refunds
              </h2>
              <p className="text-xs text-neutral-400">Clear, transparent customer guarantee</p>
            </div>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Complimentary Fit Guarantee</h3>
            <p>
              Every bespoke garment is crafted specifically for you. If your garment doesn't fit exactly as intended, we provide <strong>100% free doorstep alteration</strong> within 14 days of delivery.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">2. Standard Ready-to-Wear Returns</h3>
            <p>
              Standard boutique products (unaltered, non-customized pieces) may be returned within <strong>7 days</strong> of delivery, provided they remain unworn, unwashed, and with all original tags attached.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">3. Refund Processing</h3>
            <p>
              Approved refunds are credited directly to the original payment method (Bank account, Credit Card, or UPI) within <strong>5 to 7 business days</strong> of return package inspection at our atelier.
            </p>
          </section>

          <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-[#D6007A] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Dedicated customer support: bespoke@gmail.com</span>
          </div>
        </div>
      </div>
    </div>
  )
}

