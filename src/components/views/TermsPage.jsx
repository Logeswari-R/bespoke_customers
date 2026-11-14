import React from 'react'
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react'

export default function TermsPage({ onBack }) {
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
          Terms & Conditions
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Bespoke Atelier Terms of Service
              </h2>
              <p className="text-xs text-neutral-400">Effective Date: November 2026</p>
            </div>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Acceptance of Terms</h3>
            <p>
              By accessing and placing orders through the Bespoke application, mobile service, or bespoke.in website, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">2. Custom & Tailored Garments</h3>
            <p>
              Bespoke specializes in made-to-order couture and tailored garments. All custom orders are handcrafted according to the measurements provided in your active measurement profile. It is the customer's responsibility to ensure measurement accuracy.
            </p>
            <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 text-xs text-[#D6007A]">
              We offer one complimentary alteration service for all custom bespoke garments within 14 days of delivery.
            </div>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">3. Pricing & Payments</h3>
            <p>
              All prices listed are in Indian Rupees (INR) and are inclusive of applicable GST unless explicitly noted. Payment must be confirmed via credit card, UPI, net banking, or approved checkout channels before tailoring commences.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">4. Intellectual Property</h3>
            <p>
              All designs, photographs, graphics, trademarks, logos, and atelier patterns appearing on Bespoke are the exclusive property of Bespoke and its designer partners.
            </p>
          </section>

          <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Last reviewed by Bespoke Legal Counsel • 2026</span>
          </div>
        </div>
      </div>
    </div>
  )
}

