import React from 'react'
import { ArrowLeft, ShieldCheck, Lock } from 'lucide-react'

export default function PrivacyPolicyPage({ onBack }) {
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
          We Respect Your Privacy
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-100">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Customer Privacy & Data Protection
              </h2>
              <p className="text-xs text-neutral-400">Strict confidential handling of customer measurements</p>
            </div>
          </div>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">1. Information We Collect</h3>
            <p>
              We collect your name, contact phone number, email address, shipping destination, and bespoke body measurements solely for the purpose of tailoring garments and fulfilling orders.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">2. Measurement Confidentiality</h3>
            <p>
              Your tailored measurements and style preferences are treated with the highest confidentiality. Measurements are shared only with the master tailors assigned to your specific order and are never sold or shared with third-party advertisers.
            </p>
          </section>

          <section className="space-y-3 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            <h3 className="text-sm font-bold text-neutral-900">3. Account Deletion & Right to be Forgotten</h3>
            <p>
              You maintain complete ownership of your account data. You can edit your profile or permanently delete your account and associated records at any time directly through the Profile Dashboard.
            </p>
          </section>

          <div className="pt-4 border-t border-neutral-100 flex items-center gap-2 text-xs text-neutral-500">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>256-bit SSL encrypted sessions • Bespoke Atelier Ltd.</span>
          </div>
        </div>
      </div>
    </div>
  )
}

