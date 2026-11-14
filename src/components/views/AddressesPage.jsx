import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowLeft,
  X,
  Phone,
  Home,
  Briefcase,
  AlertCircle,
  Building,
  Sparkles,
} from 'lucide-react'
import {
  getAddresses,
  addAddressApi,
  editAddressApi,
  deleteAddressApi,
} from '../../services/api'
import { lookupPincode } from '../../utils/postalUtils'

export default function AddressesPage({
  currentUser,
  onBack,
  onOpenAuth,
  selectMode = false,
  onSelectAddress,
}) {
  const [addresses, setAddresses] = useState([])
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [deletingAddress, setDeletingAddress] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusToast, setStatusToast] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  // Default address ID state (synced with localStorage & API data)
  const [defaultAddressId, setDefaultAddressId] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pincode: '',
    state: 'Tamil Nadu',
    city: 'Chennai',
    house_building_name: '',
    area_colony: '',
    landmark_nearby: '',
    type: '0', // '0' = Home, '1' = Work, '2' = Other
    setAsDefault: false,
  })

  const userId = currentUser?.id || currentUser?.user_id

  // Load default address from localStorage or fallback to first address
  const refreshDefaultId = useCallback((addrList) => {
    if (!addrList || addrList.length === 0) return null
    if (userId) {
      const saved = localStorage.getItem(`bespoke_default_address_${userId}`)
      if (saved && addrList.some((a) => String(a.id) === String(saved))) {
        return Number(saved)
      }
    }
    // Check if any address has is_default in backend data
    const backendDefault = addrList.find(
      (a) => a.is_default === 1 || a.is_default === true || a.default === 1 || a.action === '1'
    )
    if (backendDefault) return backendDefault.id

    // Fallback to first address
    return addrList[0].id
  }, [userId])

  // Fetch addresses
  const loadAddressList = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await getAddresses(userId)
      if (res?.data && Array.isArray(res.data)) {
        setAddresses(res.data)
        const defId = refreshDefaultId(res.data)
        setDefaultAddressId(defId)
      } else {
        setAddresses([])
      }
    } catch (err) {
      console.error('Failed to load delivery addresses:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, refreshDefaultId])

  useEffect(() => {
    loadAddressList()
  }, [loadAddressList])

  // Toast feedback helper
  const showToast = (message, type = 'success') => {
    setStatusToast({ message, type })
    setTimeout(() => {
      setStatusToast(null)
    }, 3500)
  }

  // Set as default handler
  const handleSetDefault = (addr) => {
    if (!addr?.id) return
    if (userId) {
      localStorage.setItem(`bespoke_default_address_${userId}`, String(addr.id))
    }
    setDefaultAddressId(addr.id)
    showToast(`"${addr.name}" set as your default delivery address.`)
  }

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingAddress(null)
    setFormErrors({})
    setFormData({
      name: currentUser?.name || currentUser?.username || '',
      phone: currentUser?.mobile || '',
      pincode: '',
      state: 'Tamil Nadu',
      city: 'Chennai',
      house_building_name: '',
      area_colony: '',
      landmark_nearby: '',
      type: '0',
      setAsDefault: addresses.length === 0,
    })
    setIsModalOpen(true)
  }

  // Open Edit modal
  const handleOpenEdit = (addr) => {
    setEditingAddress(addr)
    setFormErrors({})
    setFormData({
      name: addr.name || '',
      phone: addr.phone || '',
      pincode: addr.pincode || '',
      state: addr.state || 'Tamil Nadu',
      city: addr.city || 'Chennai',
      house_building_name: addr.house_building_name || addr.house || '',
      area_colony: addr.area_colony || addr.road || '',
      landmark_nearby: addr.landmark_nearby || '',
      type: String(addr.type) === '1' || addr.type === 'WORK' ? '1' : String(addr.type) === '2' ? '2' : '0',
      setAsDefault: Number(addr.id) === Number(defaultAddressId),
    })
    setIsModalOpen(true)
  }

  // Validate form fields
  const validateForm = () => {
    const errors = {}
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = 'Please enter a valid recipient name (minimum 2 letters).'
    }
    const cleanPhone = formData.phone.replace(/\D/g, '')
    if (!cleanPhone || cleanPhone.length < 10) {
      errors.phone = 'Please enter a valid 10-digit mobile number.'
    }
    const cleanPin = formData.pincode.replace(/\D/g, '')
    if (!cleanPin || cleanPin.length !== 6) {
      errors.pincode = 'Please enter a valid 6-digit postal PIN code.'
    }
    if (!formData.house_building_name.trim()) {
      errors.house_building_name = 'Flat, house or building number is required.'
    }
    if (!formData.area_colony.trim()) {
      errors.area_colony = 'Street name, colony or area is required.'
    }
    if (!formData.city.trim()) {
      errors.city = 'City name is required.'
    }
    if (!formData.state.trim()) {
      errors.state = 'State name is required.'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Submit form
  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const payload = {
        user_id: userId,
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        pincode: formData.pincode.trim(),
        state: formData.state.trim(),
        city: formData.city.trim(),
        house_building_name: formData.house_building_name.trim(),
        area_colony: formData.area_colony.trim(),
        landmark_nearby: formData.landmark_nearby.trim() || null,
        type: formData.type,
      }

      let targetId = editingAddress?.id

      if (editingAddress) {
        await editAddressApi({
          address_id: editingAddress.id,
          ...payload,
        })
        showToast('Address updated successfully.')
      } else {
        const addRes = await addAddressApi(payload)
        if (addRes?.data?.id || addRes?.id) {
          targetId = addRes?.data?.id || addRes?.id
        }
        showToast('New delivery address added successfully.')
      }

      // If user chose to make this default or if it is their first address
      if (formData.setAsDefault && targetId && userId) {
        localStorage.setItem(`bespoke_default_address_${userId}`, String(targetId))
        setDefaultAddressId(targetId)
      }

      await loadAddressList()
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to save address:', err)
      showToast('Failed to save address. Please check your network and try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Confirm and execute delete
  const handleConfirmDelete = async () => {
    if (!deletingAddress?.id) return
    try {
      await deleteAddressApi(deletingAddress.id, userId)
      showToast('Delivery address removed.')
      setDeletingAddress(null)
      await loadAddressList()
    } catch (err) {
      console.error('Failed to delete address:', err)
      showToast('Could not delete address. Please try again.', 'error')
    }
  }

  // Not logged in state
  if (!currentUser) {
    return (
      <div className="min-h-[75vh] bg-[#FFF5FA]/30 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#F0E5EC] shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FFF5FA] border border-pink-200/60 rounded-2xl flex items-center justify-center text-[#C00078] mx-auto mb-5 shadow-xs">
            <MapPin className="w-8 h-8 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold text-[#24212A] tracking-tight">
            Sign in for Saved Addresses
          </h2>
          <p className="text-xs text-[#77717C] leading-relaxed mt-2 mb-6">
            Log in to manage your delivery addresses across home, atelier, and office locations for instant 1-click checkout.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full py-3 bg-[#C00078] hover:bg-[#97005F] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF5FA]/20 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {statusToast && (
        <div
          role="status"
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 ${
            statusToast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {statusToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
          )}
          <span>{statusToast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#77717C]">
          <button
            type="button"
            onClick={onBack}
            className="hover:text-[#C00078] font-medium transition-colors cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={onBack}
            className="hover:text-[#C00078] font-medium transition-colors cursor-pointer"
          >
            My Account
          </button>
          <span>/</span>
          <span className="font-bold text-[#24212A]">Addresses</span>
        </nav>

        {/* Page Heading & Add Button */}
        <div className="bg-white rounded-2xl border border-[#F0E5EC] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#24212A] tracking-tight">
                My Addresses
              </h1>
              {addresses.length > 0 && (
                <span className="inline-flex items-center text-xs font-bold text-[#C00078] bg-[#FFF5FA] border border-[#F0E5EC] px-2.5 py-0.5 rounded-full">
                  {addresses.length} {addresses.length === 1 ? 'saved address' : 'saved addresses'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#77717C] mt-1">
              Manage your delivery locations for faster, personalized couture dispatch.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C00078] hover:bg-[#97005F] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Address</span>
          </button>
        </div>

        {/* Addresses Grid Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-[#F0E5EC] animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-5 bg-neutral-100 rounded w-16" />
                </div>
                <div className="h-12 bg-neutral-100 rounded-xl" />
                <div className="h-4 bg-neutral-100 rounded w-1/2" />
                <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
                  <div className="h-7 bg-neutral-100 rounded w-16" />
                  <div className="h-7 bg-neutral-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-[#F0E5EC] max-w-lg mx-auto shadow-xs my-8">
            <div className="w-20 h-20 rounded-full bg-[#FFF5FA] border border-pink-200/60 flex items-center justify-center text-[#C00078] mx-auto mb-5 shadow-xs">
              <MapPin className="w-9 h-9 stroke-[1.75]" />
            </div>
            <h2 className="text-xl font-extrabold text-[#24212A] tracking-tight">
              No saved addresses yet
            </h2>
            <p className="text-xs sm:text-sm text-[#77717C] mt-2 mb-7 max-w-sm mx-auto leading-relaxed">
              Add your delivery addresses to enjoy seamless, 1-click doorstep delivery for your bespoke creations.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#C00078] hover:bg-[#97005F] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Your First Address</span>
            </button>
          </div>
        ) : (
          /* Address Cards Grid: 2-Column on Desktop, 1-Column on Mobile */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            {addresses.map((addr) => {
              const isDefault = Number(addr.id) === Number(defaultAddressId)
              const rawType = String(addr.type || '0').trim().toUpperCase()
              const isWork = rawType === '1' || rawType === 'WORK'
              const isOther = rawType === '2' || rawType === 'OTHER'

              return (
                <div
                  key={addr.id}
                  className={`rounded-2xl p-5 sm:p-6 transition-all flex flex-col justify-between relative ${
                    isDefault
                      ? 'bg-gradient-to-br from-[#FFF5FA] via-white to-white border-2 border-[#C00078] shadow-[0_4px_18px_rgba(192,0,120,0.08)]'
                      : 'bg-white border border-[#F0E5EC] hover:border-pink-300/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(192,0,120,0.06)]'
                  }`}
                >
                  <div>
                    {/* Top Header: Name, Address Type Badge & Default Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base sm:text-[17px] font-bold text-[#24212A] tracking-tight">
                          {addr.name}
                        </span>

                        {/* Address Type Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isWork
                              ? 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                              : isOther
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-pink-50 text-[#C00078] border border-pink-200/70'
                          }`}
                        >
                          {isWork ? (
                            <Briefcase className="w-2.5 h-2.5" />
                          ) : isOther ? (
                            <Building className="w-2.5 h-2.5" />
                          ) : (
                            <Home className="w-2.5 h-2.5" />
                          )}
                          <span>{isWork ? 'Work' : isOther ? 'Other' : 'Home'}</span>
                        </span>
                      </div>

                      {/* Default Address Indicator */}
                      {isDefault && (
                        <span className="inline-flex items-center gap-1 bg-[#C00078] text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-2xs shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Default</span>
                        </span>
                      )}
                    </div>

                    {/* Complete Address Body */}
                    <div className="flex items-start gap-2.5 mt-2 text-sm text-[#24212A] leading-relaxed">
                      <MapPin className="w-4 h-4 text-[#C00078] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-normal text-[#24212A]">
                          {addr.house_building_name || addr.house}
                          {addr.area_colony || addr.road ? `, ${addr.area_colony || addr.road}` : ''}
                        </p>
                        {addr.landmark_nearby && (
                          <p className="text-xs text-[#77717C] mt-0.5">
                            <span className="font-medium text-neutral-500">Landmark:</span> Near{' '}
                            {addr.landmark_nearby}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-[#24212A] mt-1">
                          {addr.city}, {addr.state} -{' '}
                          <span className="text-[#C00078] font-bold">{addr.pincode}</span>
                        </p>
                      </div>
                    </div>

                    {/* Phone Number Contact Row */}
                    <div className="flex items-center gap-2 mt-3 pt-2.5 text-xs text-[#77717C] font-medium border-t border-neutral-100/70">
                      <Phone className="w-3.5 h-3.5 text-[#77717C] shrink-0" />
                      <span>Contact:</span>
                      <span className="font-bold text-[#24212A]">{addr.phone}</span>
                    </div>
                  </div>

                  {/* Card Bottom Action Row */}
                  <div className="pt-3.5 mt-4 border-t border-[#F0E5EC] flex items-center justify-between flex-wrap gap-2">
                    {/* Left Actions: Deliver Here (selectMode) or Set as Default */}
                    <div>
                      {selectMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectAddress) onSelectAddress(addr)
                            if (onBack) onBack()
                          }}
                          className="px-4 py-1.5 bg-[#C00078] hover:bg-[#97005F] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Deliver to this Address</span>
                        </button>
                      ) : isDefault ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C00078]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Default delivery address</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(addr)}
                          className="text-xs font-semibold text-[#C00078] hover:bg-[#FFF5FA] border border-pink-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Set as Default</span>
                        </button>
                      )}
                    </div>

                    {/* Right Actions: Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(addr)}
                        className="p-1.5 text-[#77717C] hover:text-[#24212A] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Edit address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingAddress(addr)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-[#F0E5EC] my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-[#F0E5EC]">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#24212A] tracking-tight">
                  {editingAddress ? 'Edit Delivery Address' : 'Add New Address'}
                </h3>
                <p className="text-xs text-[#77717C] mt-0.5">
                  Enter your doorstep delivery destination details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-[#24212A] transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Recipient Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    Contact Name <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null })
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border rounded-xl outline-none transition-all ${
                      formErrors.name
                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                        : 'border-[#F0E5EC] focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20'
                    }`}
                    placeholder="Recipient Full Name"
                  />
                  {formErrors.name && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.name}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    Mobile Number <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setFormData({ ...formData, phone: val })
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: null })
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border rounded-xl outline-none transition-all ${
                      formErrors.phone
                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                        : 'border-[#F0E5EC] focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20'
                    }`}
                    placeholder="10-digit mobile number"
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Flat / Building */}
              <div>
                <label className="block text-xs font-bold text-[#24212A] mb-1">
                  Flat, House No., Building Name <span className="text-[#C00078]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.house_building_name}
                  onChange={(e) => {
                    setFormData({ ...formData, house_building_name: e.target.value })
                    if (formErrors.house_building_name) {
                      setFormErrors({ ...formErrors, house_building_name: null })
                    }
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border rounded-xl outline-none transition-all ${
                    formErrors.house_building_name
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                      : 'border-[#F0E5EC] focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20'
                  }`}
                  placeholder="e.g. Flat 3A, Bespoke Residency"
                />
                {formErrors.house_building_name && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.house_building_name}</span>
                  </p>
                )}
              </div>

              {/* Area / Street */}
              <div>
                <label className="block text-xs font-bold text-[#24212A] mb-1">
                  Road Name, Area, Colony <span className="text-[#C00078]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.area_colony}
                  onChange={(e) => {
                    setFormData({ ...formData, area_colony: e.target.value })
                    if (formErrors.area_colony) setFormErrors({ ...formErrors, area_colony: null })
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border rounded-xl outline-none transition-all ${
                    formErrors.area_colony
                      ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                      : 'border-[#F0E5EC] focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20'
                  }`}
                  placeholder="e.g. 2nd Main Road, RA Puram"
                />
                {formErrors.area_colony && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{formErrors.area_colony}</span>
                  </p>
                )}
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-xs font-bold text-[#24212A] mb-1">
                  Landmark <span className="text-[#77717C] font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.landmark_nearby}
                  onChange={(e) => setFormData({ ...formData, landmark_nearby: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border border-[#F0E5EC] rounded-xl focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20 outline-none"
                  placeholder="e.g. Near Apollo Hospital / Park"
                />
              </div>

              {/* PIN Code, City, State */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    PIN Code <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={async (e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setFormData((prev) => ({ ...prev, pincode: val }))
                      if (formErrors.pincode) setFormErrors({ ...formErrors, pincode: null })
                      if (val.length === 6) {
                        const info = await lookupPincode(val)
                        if (info) {
                          setFormData((prev) => ({
                            ...prev,
                            pincode: val,
                            city: info.city || prev.city,
                            state: info.state || prev.state,
                          }))
                        }
                      }
                    }}
                    className={`w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border rounded-xl outline-none transition-all ${
                      formErrors.pincode
                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                        : 'border-[#F0E5EC] focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20'
                    }`}
                    placeholder="600028"
                  />
                  {formErrors.pincode && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{formErrors.pincode}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    City <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => {
                      setFormData({ ...formData, city: e.target.value })
                      if (formErrors.city) setFormErrors({ ...formErrors, city: null })
                    }}
                    className="w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border border-[#F0E5EC] rounded-xl focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20 outline-none"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    State <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => {
                      setFormData({ ...formData, state: e.target.value })
                      if (formErrors.state) setFormErrors({ ...formErrors, state: null })
                    }}
                    className="w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border border-[#F0E5EC] rounded-xl focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20 outline-none"
                    placeholder="State"
                  />
                </div>
              </div>

              {/* Address Type Selection Pills */}
              <div>
                <label className="block text-xs font-bold text-[#24212A] mb-2">
                  Address Type
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: '0', label: 'Home', icon: Home, hint: 'All-day delivery' },
                    { id: '1', label: 'Work', icon: Briefcase, hint: '9am - 6pm' },
                    { id: '2', label: 'Other', icon: Building, hint: 'Alternative' },
                  ].map((t) => {
                    const isSelected = formData.type === t.id
                    const Icon = t.icon
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t.id })}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#FFF5FA] border-[#C00078] text-[#C00078] shadow-2xs'
                            : 'bg-white border-[#F0E5EC] text-[#77717C] hover:border-neutral-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-bold">{t.label}</span>
                        <span className="text-[10px] text-neutral-400 font-medium">{t.hint}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Make Default Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.setAsDefault}
                    onChange={(e) => setFormData({ ...formData, setAsDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-[#C00078] border-[#F0E5EC] focus:ring-[#C00078] accent-[#C00078] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#24212A]">
                    Set as my default delivery address
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#F0E5EC]">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#C00078] hover:bg-[#97005F] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingAddress ? 'Update Address' : 'Save Address'}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-[#F0E5EC] text-[#77717C] hover:text-[#24212A] hover:bg-neutral-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog Modal */}
      {deletingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-[#F0E5EC] text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Trash2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-bold text-[#24212A]">Delete Delivery Address?</h3>
            <p className="text-xs text-[#77717C] leading-relaxed mt-1.5 mb-6">
              Are you sure you want to remove the address for{' '}
              <strong className="text-[#24212A]">{deletingAddress.name}</strong>? You can always add it back later.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingAddress(null)}
                className="flex-1 py-2.5 border border-[#F0E5EC] text-[#77717C] hover:bg-neutral-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
