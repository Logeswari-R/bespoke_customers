import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getUserProfile } from '../services/api'

const AuthContext = createContext(null)

const PENDING_ACTION_STORAGE_KEY = 'bespoke_pending_action'
const PENDING_ACTION_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes validity window

/**
 * Centralized Authentication Provider
 * Single source of truth for customer session state across the application.
 * Manages:
 * - Active customer session (persisted via localStorage 'bespoke_user')
 * - Login prompt dialog state ("Please login to continue.")
 * - Existing AuthModal open/close & mode state
 * - Action guard `requireLogin(action, options)`
 * - Post-Login Action Continuation (pendingAction state + sessionStorage)
 */
export function AuthProvider({ children }) {
  // Current logged in user (null if guest)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('bespoke_user')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.error('Failed reading user from localStorage:', e)
    }
    return null
  })

  // Automatically synchronize fresh user profile details (avatar, name, email, mobile) on mount & id change
  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function syncFreshProfile() {
      try {
        const fresh = await getUserProfile(userId)
        if (!ignore && fresh) {
          setCurrentUser((prev) => {
            const merged = { ...(prev || {}), ...fresh }
            try {
              localStorage.setItem('bespoke_user', JSON.stringify(merged))
              window.dispatchEvent(new CustomEvent('bespoke_user_updated', { detail: merged }))
            } catch (e) {
              console.error('Failed caching bespoke_user:', e)
            }
            return merged
          })
        }
      } catch (err) {
        console.warn('Profile sync background error:', err)
      }
    }

    syncFreshProfile()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  // Listen for storage or custom sync events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'bespoke_user' && e.newValue) {
        try {
          setCurrentUser(JSON.parse(e.newValue))
        } catch (err) {}
      }
    }
    const handleCustomUserUpdate = (e) => {
      if (e.detail) {
        setCurrentUser((prev) => ({ ...(prev || {}), ...e.detail }))
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('bespoke_user_updated', handleCustomUserUpdate)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('bespoke_user_updated', handleCustomUserUpdate)
    }
  }, [])

  // Full AuthModal (Sign In / Register / Forgot Password) state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')

  // Reusable Login Prompt Dialog state ("Please login to continue.")
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [loginPromptOptions, setLoginPromptOptions] = useState({
    title: 'Authentication Required',
    message: 'Please login to continue.',
    actionDescription: '',
  })

  // Centralized Pending Action State (in-memory + sessionStorage)
  // Preserves intended guest actions (Add to Cart, Buy Now, Wishlist, Checkout, Measurements, Reviews)
  const [pendingAction, setPendingActionState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(PENDING_ACTION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < PENDING_ACTION_MAX_AGE_MS) {
          return parsed
        }
        sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
      }
    } catch (e) {
      console.error('Failed reading pending action from sessionStorage:', e)
    }
    return null
  })

  // Set pending action
  const setPendingAction = useCallback((action) => {
    if (!action) {
      setPendingActionState(null)
      try {
        sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
      } catch (e) {}
      return
    }

    const payload = {
      ...action,
      timestamp: Date.now(),
    }
    setPendingActionState(payload)
    try {
      sessionStorage.setItem(PENDING_ACTION_STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.error('Failed saving pending action to sessionStorage:', e)
    }
  }, [])

  // Clear pending action (used when user cancels login or action completes)
  const clearPendingAction = useCallback(() => {
    setPendingActionState(null)
    try {
      sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
    } catch (e) {}
  }, [])

  // Consume pending action atomically (returns the action and clears it so it cannot run twice)
  const consumePendingAction = useCallback(() => {
    let action = pendingAction
    if (!action) {
      try {
        const saved = sessionStorage.getItem(PENDING_ACTION_STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < PENDING_ACTION_MAX_AGE_MS) {
            action = parsed
          }
        }
      } catch (e) {}
    }

    // Always clear immediately to guarantee exactly-once execution
    setPendingActionState(null)
    try {
      sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
    } catch (e) {}

    return action
  }, [pendingAction])

  // Open full auth modal
  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }, [])

  // Close full auth modal
  const closeAuthModal = useCallback((cancelled = false) => {
    setIsAuthModalOpen(false)
    if (cancelled) {
      clearPendingAction()
    }
  }, [clearPendingAction])

  // Open the lightweight Login Prompt Dialog
  const openLoginPrompt = useCallback(
    (options = {}) => {
      setLoginPromptOptions({
        title: options.title || 'Authentication Required',
        message: options.message || 'Please login to continue.',
        actionDescription: options.actionDescription || options.action || '',
      })
      if (options.pendingAction) {
        setPendingAction(options.pendingAction)
      }
      setIsLoginPromptOpen(true)
    },
    [setPendingAction]
  )

  // Close the lightweight Login Prompt Dialog
  const closeLoginPrompt = useCallback(
    (cancelled = false) => {
      setIsLoginPromptOpen(false)
      if (cancelled) {
        clearPendingAction()
      }
    },
    [clearPendingAction]
  )

  /**
   * Action Guard: requireLogin
   * If user is authenticated, executes `actionCallback()`.
   * If user is a guest, preserves pending action, displays the Login Prompt Modal and halts execution.
   */
  const requireLogin = useCallback(
    (actionCallback, options = {}) => {
      if (currentUser) {
        if (typeof actionCallback === 'function') {
          return actionCallback()
        }
        return true
      }

      openLoginPrompt(options)
      return false
    },
    [currentUser, openLoginPrompt]
  )

  // Login handler
  const login = useCallback((user) => {
    setCurrentUser(user)
    try {
      localStorage.setItem('bespoke_user', JSON.stringify(user))
    } catch (e) {
      console.error('Failed storing bespoke_user:', e)
    }
    setIsAuthModalOpen(false)
    setIsLoginPromptOpen(false)
  }, [])

  // Logout handler
  const logout = useCallback(() => {
    try {
      localStorage.removeItem('bespoke_user')
      localStorage.removeItem('bespoke_guest_cart')
      localStorage.removeItem('bespoke_guest_wishlist')
      localStorage.removeItem('bespoke_guest_wishlist_ids')
      sessionStorage.removeItem(PENDING_ACTION_STORAGE_KEY)
    } catch (e) {
      console.error('Failed clearing session:', e)
    }
    setCurrentUser(null)
    setPendingActionState(null)
    setIsAuthModalOpen(false)
    setIsLoginPromptOpen(false)
  }, [])

  // Update customer fields in state and localStorage
  const updateUser = useCallback((updatedFields) => {
    setCurrentUser((prev) => {
      const merged = { ...(prev || {}), ...updatedFields }
      try {
        localStorage.setItem('bespoke_user', JSON.stringify(merged))
        window.dispatchEvent(new CustomEvent('bespoke_user_updated', { detail: merged }))
      } catch (e) {
        console.error('Failed updating bespoke_user:', e)
      }
      return merged
    })
  }, [])

  const value = {
    currentUser,
    setCurrentUser,
    isAuthenticated: Boolean(currentUser),
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    isLoginPromptOpen,
    loginPromptOptions,
    openLoginPrompt,
    closeLoginPrompt,
    pendingAction,
    setPendingAction,
    clearPendingAction,
    consumePendingAction,
    requireLogin,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth hook
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

