import React from 'react'
import {
  ArrowLeft,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  ChevronRight,
  Headphones,
} from 'lucide-react'

function InstagramIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  )
}

function FacebookIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  )
}

function LinkedinIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  )
}

export default function ContactUsPage({ onBack }) {
  const contactChannels = [
    {
      title: 'Phone Number',
      content: '+91 987654321',
      href: 'tel:+91987654321',
      icon: Phone,
      description: 'Mon - Sat: 9:00 AM - 8:00 PM',
    },
    {
      title: 'E-Mail',
      content: 'bespoke@gmail.com',
      href: 'mailto:bespoke@gmail.com',
      icon: Mail,
      description: 'Response within 24 hours',
    },
    {
      title: 'WhatsApp Number',
      content: '+91 987654321',
      href: 'https://wa.me/91987654321',
      icon: MessageSquare,
      description: 'Instant chat with atelier stylist',
    },
    {
      title: 'Official Website',
      content: 'www.bespoke.in',
      href: 'https://bespoke.in',
      icon: Globe,
      description: 'Discover lookbooks & collections',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 md:pb-12 text-neutral-800 font-sans">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
          Contact us
        </h1>

        <div className="w-10" />
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Support Banner Card */}
        <div className="bg-gradient-to-br from-pink-500 to-[#D6007A] rounded-3xl p-6 text-white text-center shadow-lg shadow-pink-500/15 relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Headphones className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-extrabold tracking-tight">
            We're Here For You
          </h2>
          <p className="text-xs text-pink-100 mt-1 max-w-xs mx-auto leading-relaxed">
            Have questions about your custom measurements, order deliveries, or boutique styling? Connect with our dedicated concierge.
          </p>
        </div>

        {/* Contact Channels Card */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden divide-y divide-neutral-100">
          {contactChannels.map((channel, idx) => {
            const Icon = channel.icon
            return (
              <a
                key={idx}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="p-5 flex items-center justify-between hover:bg-neutral-50 active:bg-neutral-100 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                      {channel.title}
                    </span>
                    <span className="text-sm font-bold text-neutral-900 block mt-0.5 group-hover:text-[#D6007A] transition-colors">
                      {channel.content}
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      {channel.description}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#D6007A] group-hover:translate-x-0.5 transition-all" />
              </a>
            )
          })}
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6 text-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">
            Follow Bespoke Atelier
          </h3>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] hover:bg-[#D6007A] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
            >
              <InstagramIcon className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] hover:bg-[#D6007A] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
            >
              <FacebookIcon className="w-5 h-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="w-10 h-10 rounded-2xl bg-pink-50 text-[#D6007A] hover:bg-[#D6007A] hover:text-white flex items-center justify-center transition-colors shadow-2xs"
            >
              <LinkedinIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
