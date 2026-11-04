import React, { useState, useEffect } from 'react'
import {
  Ruler,
  Plus,
  Trash2,
  Check,
  ArrowLeft,
  X,
  User,
  Sparkles,
} from 'lucide-react'
import {
  getMeasurementSchema,
  getSavedMeasurementProfiles,
  saveMeasurementProfile,
  deleteMeasurementProfile,
  formatImageUrl,
} from '../../services/api'

export default function MeasurementsPage({
  currentUser,
  onBack,
  onOpenAuth,
}) {
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id))
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGender, setSelectedGender] = useState('FEMALE')
  const [schemaFields, setSchemaFields] = useState([])
  const [profileName, setProfileName] = useState('')
  const [measurementValues, setMeasurementValues] = useState({})
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    let ignore = false
    const userId = currentUser?.id
    if (!userId) return

    async function loadData() {
      setIsLoading(true)
      try {
        const [profRes, schemaRes] = await Promise.allSettled([
          getSavedMeasurementProfiles(userId),
          getMeasurementSchema('FEMALE'),
        ])
        if (ignore) return
        if (profRes.status === 'fulfilled' && profRes.value.status && Array.isArray(profRes.value.data)) {
          setProfiles(profRes.value.data)
        }
        if (schemaRes.status === 'fulfilled' && schemaRes.value.status && Array.isArray(schemaRes.value.data)) {
          setSchemaFields(schemaRes.value.data)
        }
      } catch (e) {
        console.error('Error loading measurements:', e)
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    loadData()
    return () => {
      ignore = true
    }
  }, [currentUser?.id])

  // Reload schema on gender switch
  const handleGenderSwitch = async (gender) => {
    setSelectedGender(gender)
    try {
      const res = await getMeasurementSchema(gender)
      if (res.status && Array.isArray(res.data)) {
        setSchemaFields(res.data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenAdd = () => {
    setProfileName('')
    setMeasurementValues({})
    handleGenderSwitch('FEMALE')
    setIsModalOpen(true)
  }

  const handleDelete = async (profileId) => {
    if (!confirm('Are you sure you want to delete this custom measurement profile?')) return
    try {
      await deleteMeasurementProfile(profileId)
      const res = await getSavedMeasurementProfiles(currentUser.id)
      if (res?.data) setProfiles(res.data)
      setStatusMsg('Profile deleted successfully.')
      setTimeout(() => setStatusMsg(''), 3000)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) {
      alert('Please provide a profile name (e.g. My Kurti Fit)')
      return
    }

    const payload = {
      user_id: currentUser.id,
      profile_name: profileName.trim(),
      gender: selectedGender,
      measurements: Object.entries(measurementValues).map(([id, val]) => ({
        measurement_id: id,
        value: val,
      })),
    }

    try {
      await saveMeasurementProfile(payload)
      const res = await getSavedMeasurementProfiles(currentUser.id)
      if (res?.data) setProfiles(res.data)
      setIsModalOpen(false)
      setStatusMsg('Measurement profile saved! You can now reuse this fit across all bespoke garments.')
      setTimeout(() => setStatusMsg(''), 4000)
    } catch (err) {
      console.error(err)
      alert('Failed to save measurement profile')
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-[70vh] bg-[var(--theme-bg)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
            <Ruler className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">Custom Measurement Profiles</h2>
          <p className="text-xs text-neutral-500 mt-2 mb-6">
            Log in to save your precision body measurements and enjoy made-to-measure tailoring for all your festive & bridal wear.
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

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
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
            Saved Custom Measurements
          </h1>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 btn-theme text-xs font-bold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Profile</span>
          </button>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Informational Atelier Banner */}
        <div className="bg-gradient-to-r from-pink-50/70 via-purple-50/40 to-white p-5 rounded-3xl border border-pink-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-theme-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h3 className="font-extrabold text-neutral-900">Doorstep Tailor Precision</h3>
            <p className="text-neutral-500 mt-0.5">
              Saved profiles can be selected in 1 click during checkout. Our master tailors will hand-cut and stitch your garments to these exact dimensions.
            </p>
          </div>
        </div>

        {/* Profiles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-neutral-200 animate-pulse space-y-3">
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
                <div className="h-16 bg-neutral-100 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-neutral-200 max-w-md mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-[var(--theme-primary)] mx-auto mb-4">
              <Ruler className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No Measurement Profiles</h3>
            <p className="text-xs text-neutral-500 mt-1 mb-6">
              Create a custom measurement profile for yourself or family members (e.g. Saree Blouse, Kurti, Sherwani).
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-6 py-2.5 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Create Measurement Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profiles.map((prof) => (
              <div
                key={prof.id}
                className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--theme-primary)]" />
                      <h3 className="text-sm font-bold text-neutral-900">
                        {prof.profile_name || prof.name || 'Custom Fit'}
                      </h3>
                    </div>
                    <span className="badge-theme-subtle text-[10px] py-0.5 px-2 uppercase font-bold">
                      {prof.gender || 'FEMALE'}
                    </span>
                  </div>

                  {/* Measurement parameters chips */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-neutral-100">
                    {prof.measurements && Array.isArray(prof.measurements) && prof.measurements.length > 0 ? (
                      prof.measurements.map((m, mIdx) => (
                        <div key={mIdx} className="bg-neutral-50 p-2 rounded-xl text-[11px]">
                          <span className="text-neutral-500 block truncate">{m.name || m.label || `Metric #${m.measurement_id}`}</span>
                          <span className="font-extrabold text-neutral-900">{m.value}&quot;</span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-xs text-neutral-400">
                        Standard Tailor Dimensions Saved
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDelete(prof.id)}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Profile</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Measurement Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-neutral-100 my-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900">
                  New Custom Measurement Profile
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter your body measurements in inches for precision bespoke tailoring
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Profile Name & Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Profile Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. My Festive Fit / Mom Saree"
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:border-[var(--theme-primary)] outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Garment Department
                  </label>
                  <div className="flex rounded-xl p-1 bg-neutral-100">
                    {['FEMALE', 'MALE', 'KIDS'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGenderSwitch(g)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          selectedGender === g
                            ? 'bg-white text-black shadow-xs'
                            : 'text-neutral-500 hover:text-black'
                        }`}
                      >
                        {g.charAt(0) + g.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Measurement Inputs from API Schema */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <span className="text-xs font-bold text-neutral-900 block">
                  Body Measurements (in Inches &quot;)
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                  {schemaFields.length === 0 ? (
                    // Default fallback schema if offline
                    [
                      { id: 1, name: 'Bust / Chest' },
                      { id: 7, name: 'Waist' },
                      { id: 22, name: 'Hip' },
                      { id: 23, name: 'Shoulder Width' },
                      { id: 25, name: 'Kurti / Shirt Length' },
                      { id: 27, name: 'Pant / Skirt Length' },
                    ].map((f) => (
                      <div key={f.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                        <label className="block text-[11px] font-bold text-neutral-700 mb-1 truncate">
                          {f.name}
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            value={measurementValues[f.id] || ''}
                            onChange={(e) =>
                              setMeasurementValues({ ...measurementValues, [f.id]: e.target.value })
                            }
                            placeholder="36.0"
                            className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg outline-none font-bold"
                          />
                          <span className="text-xs text-neutral-400 ml-1.5">&quot;</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    schemaFields.map((f) => (
                      <div key={f.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-neutral-700 truncate pr-1">
                            {f.name}
                          </label>
                          {f.image && (
                            <img
                              src={formatImageUrl(f.image)}
                              alt={f.name}
                              className="w-5 h-5 rounded-md object-cover shrink-0"
                            />
                          )}
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.5"
                            value={measurementValues[f.id] || ''}
                            onChange={(e) =>
                              setMeasurementValues({ ...measurementValues, [f.id]: e.target.value })
                            }
                            placeholder="e.g. 34.0"
                            className="w-full px-2 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg outline-none font-bold"
                          />
                          <span className="text-xs text-neutral-400 ml-1.5">&quot;</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-neutral-100">
                <button
                  type="submit"
                  className="flex-1 py-3 btn-theme text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Save Measurement Profile
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
