import React, { useState, useEffect } from 'react'
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowLeft,
  X,
} from 'lucide-react'
import {
  getAddresses,
  addAddressApi,
  editAddressApi,
  deleteAddressApi,
} from '../../services/api'

export default function AddressesPage({
  currentUser,
  onBack,
  onOpenAuth,
}) {
  const [addresses, setAddresses] = useState([])
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pincode: '',
    state: '',
    city: '',
    house_building_name: '',
    area_colony: '',
    landmark_nearby: '',
    type: '0',
  })
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function load() {
      setIsLoading(true)
      try {
        const res = await getAddresses(userId)
        if (!ignore && res.status && Array.isArray(res.data)) {
          setAddresses(res.data)
        }
      } catch (err) {
        console.error('Error loading addresses:', err)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    load()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Sign in for Saved Addresses</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            Log in to manage your delivery addresses across home, atelier, and office locations.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="w-full py-3 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      </div>
    )
  }

  const handleOpenAdd = () => {
    setEditingAddress(null)
    setFormData({
      name: currentUser.name || currentUser.username || '',
      phone: currentUser.mobile || '',
      pincode: '',
      state: 'Tamil Nadu',
      city: 'Chennai',
      house_building_name: '',
      area_colony: '',
      landmark_nearby: '',
      type: '0',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr)
    setFormData({
      name: addr.name || '',
      phone: addr.phone || '',
      pincode: addr.pincode || '',
      state: addr.state || '',
      city: addr.city || '',
      house_building_name: addr.house_building_name || addr.house || '',
      area_colony: addr.area_colony || addr.road || '',
      landmark_nearby: addr.landmark_nearby || '',
      type: String(addr.type) === '1' || addr.type === 'WORK' ? '1' : '0',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (addrId) => {
    if (!confirm('Are you sure you want to delete this delivery address?')) return
    try {
      await deleteAddressApi(addrId)
      const res = await getAddresses(currentUser.id)
      if (res?.data) setAddresses(res.data)
      setStatusMsg('Address removed successfully.')
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingAddress) {
        await editAddressApi({
          address_id: editingAddress.id,
          user_id: currentUser.id,
          ...formData,
        })
        setStatusMsg('Address updated successfully.')
      } else {
        await addAddressApi({
          user_id: currentUser.id,
          ...formData,
        })
        setStatusMsg('New address saved successfully.')
      }
      const res = await getAddresses(currentUser.id)
      if (res?.data) setAddresses(res.data)
      setIsModalOpen(false)
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (err) {
      console.error(err)
      alert('Failed to save address')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-base font-extrabold text-neutral-900 tracking-tight">
            My Delivery Addresses
          </h1>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 btn-theme text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Address</span>
          </button>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Addresses Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-neutral-200 animate-pulse space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
                <div className="h-12 bg-neutral-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : addresses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No saved addresses</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              Add your delivery addresses to enjoy seamless 1-click checkout for your bespoke pieces.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-6 py-2.5 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Add First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-neutral-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-neutral-900">{addr.name}</span>
                    <span className="badge-theme-subtle text-[10px] py-0.5 px-2 uppercase font-bold">
                      {String(addr.type) === '1' || addr.type === 'WORK' ? 'WORK' : 'HOME'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    {addr.house_building_name || addr.house}, {addr.area_colony || addr.road}
                    {addr.landmark_nearby ? `, Near ${addr.landmark_nearby}` : ''}
                    <br />
                    {addr.city}, {addr.state} - <span className="font-bold">{addr.pincode}</span>
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                    Phone: {addr.phone}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(addr)}
                    className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-neutral-100 my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-neutral-900">
                {editingAddress ? 'Edit Delivery Address' : 'Add New Address'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="Recipient Name"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="10 digit mobile"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="600001"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="State"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Flat, House No., Building Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.house_building_name}
                  onChange={(e) => setFormData({ ...formData, house_building_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                  placeholder="e.g. Flat 3A, Silver Oak Apts"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Road Name, Area, Colony
                </label>
                <input
                  type="text"
                  value={formData.area_colony}
                  onChange={(e) => setFormData({ ...formData, area_colony: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                  placeholder="Street / Locality"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Landmark
                  </label>
                  <input
                    type="text"
                    value={formData.landmark_nearby}
                    onChange={(e) => setFormData({ ...formData, landmark_nearby: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none"
                    placeholder="Near Apollo Hospital"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Address Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none font-medium"
                  >
                    <option value="0">Home (7am - 9pm)</option>
                    <option value="1">Office / Work (9am - 6pm)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-neutral-300 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
