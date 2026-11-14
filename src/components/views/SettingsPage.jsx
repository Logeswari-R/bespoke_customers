import React, { useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  CreditCard,
  CheckCircle2,
} from 'lucide-react'

export default function SettingsPage({ onBack }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_notifications')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  const [orderSmsEnabled, setOrderSmsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_sms_alerts')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  const [marketingEmailEnabled, setMarketingEmailEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_marketing_email')
      return saved !== null ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  const [savedFeedback, setSavedFeedback] = useState(false)

  const handleToggleNotifications = (val) => {
    setNotificationsEnabled(val)
    localStorage.setItem('bespoke_notifications', JSON.stringify(val))
    showFeedback()
  }

  const handleToggleSms = (val) => {
    setOrderSmsEnabled(val)
    localStorage.setItem('bespoke_sms_alerts', JSON.stringify(val))
    showFeedback()
  }

  const handleToggleMarketing = (val) => {
    setMarketingEmailEnabled(val)
    localStorage.setItem('bespoke_marketing_email', JSON.stringify(val))
    showFeedback()
  }

  const showFeedback = () => {
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

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
          Settings
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 pt-6 space-y-4">
        {savedFeedback && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Preference updated and saved!</span>
          </div>
        )}

        {/* Notification Settings Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-neutral-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Notification Preferences
            </h2>
          </div>

          {/* Enable Push Notifications */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800 block">
                  Enable Notifications
                </span>
                <span className="text-[11px] text-neutral-400">
                  Receive live alerts for order tracking & chat messages
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => handleToggleNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D6007A]" />
            </label>
          </div>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* SMS Updates */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A]">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800 block">
                  Order Status SMS
                </span>
                <span className="text-[11px] text-neutral-400">
                  Receive dispatch and doorstep delivery alerts on mobile
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={orderSmsEnabled}
                onChange={(e) => handleToggleSms(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D6007A]" />
            </label>
          </div>

          <div className="border-t border-neutral-100/90 ml-16" />

          {/* Marketing Emails */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-pink-50 flex items-center justify-center text-[#D6007A]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800 block">
                  Exclusive Drops & Offers
                </span>
                <span className="text-[11px] text-neutral-400">
                  Get notified when new designer collections launch
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={marketingEmailEnabled}
                onChange={(e) => handleToggleMarketing(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D6007A]" />
            </label>
          </div>
        </div>

        {/* Currency & Regional Preferences */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-xs overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-neutral-800 block">
                  Currency Display
                </span>
                <span className="text-[11px] text-neutral-400">
                  Default shopping currency
                </span>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-pink-50 text-[#D6007A] rounded-xl border border-pink-200">
              INR (₹)
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
