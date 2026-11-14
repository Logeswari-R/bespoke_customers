import React from 'react'
import {
  Home,
  Store,
  ShoppingBag,
  Heart,
  User,
} from 'lucide-react'

export default function BottomTabBar({
  activeTab = 'home',
  onTabChange,
  cartCount = 0,
  wishlistCount = 0,
  userAvatar = null,
}) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'store', label: 'Store/Designer', icon: Store },
    { id: 'bag', label: 'Bag', icon: ShoppingBag, badge: cartCount },
    { id: 'favourites', label: 'Favourites', icon: Heart, badge: wishlistCount },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-14 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center relative py-1 text-center cursor-pointer transition-colors"
            >
              <div className="relative">
                {tab.id === 'profile' && userAvatar ? (
                  <img
                    src={userAvatar}
                    alt="Profile"
                    className={`w-5 h-5 rounded-full object-cover transition-all ${
                      isActive ? 'ring-2 ring-[var(--theme-primary)] scale-105' : 'opacity-80'
                    }`}
                  />
                ) : (
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-theme-primary stroke-[2.2]' : 'text-neutral-500'
                    }`}
                  />
                )}
                {tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-3.5 h-3.5 px-0.5 bg-theme-gradient text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] font-medium tracking-tight mt-0.5 ${
                  isActive ? 'text-theme-primary font-bold' : 'text-neutral-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

