import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Ruler,
  Plus,
  Trash2,
  Edit2,
  Check,
  ArrowLeft,
  X,
  User,
  Sparkles,
  Eye,
  AlertCircle,
  HelpCircle,
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
  onOpenLoginPrompt,
  initialData = null,
  selectMode = false,
  onSelectProfile,
}) {
  const [profiles, setProfiles] = useState([])
  const [isLoading, setIsLoading] = useState(() => Boolean(currentUser?.id || currentUser?.user_id))
  const [isModalOpen, setIsModalOpen] = useState(Boolean(initialData))
  const [viewingProfile, setViewingProfile] = useState(null)
  const [editingProfile, setEditingProfile] = useState(null)
  const [deletingProfile, setDeletingProfile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusToast, setStatusToast] = useState(null)

  // Form state
  const [selectedGender, setSelectedGender] = useState(initialData?.selectedGender || 'FEMALE')
  const [schemaFields, setSchemaFields] = useState([])
  const [profileName, setProfileName] = useState(initialData?.profileName || '')
  const [measurementValues, setMeasurementValues] = useState(initialData?.measurementValues || {})
  const [makeDefaultCheckbox, setMakeDefaultCheckbox] = useState(false)
  const [formError, setFormError] = useState('')

  // Master schema lookup dictionary to map measurement_id -> { name, image }
  const [schemaDictionary, setSchemaDictionary] = useState({})

  // Default Profile ID (persisted in localStorage & backend state)
  const userId = currentUser?.id || currentUser?.user_id
  const [defaultProfileId, setDefaultProfileId] = useState(null)

  // Toast feedback helper
  const showToast = (message, type = 'success') => {
    setStatusToast({ message, type })
    setTimeout(() => {
      setStatusToast(null)
    }, 3500)
  }

  // Load default profile ID from localStorage
  const refreshDefaultProfileId = useCallback((profileList) => {
    if (!profileList || profileList.length === 0) return null
    if (userId) {
      const saved = localStorage.getItem(`bespoke_default_measurement_profile_${userId}`)
      if (saved && profileList.some((p) => String(p.id) === String(saved))) {
        return Number(saved)
      }
    }
    // Fallback to first profile
    return profileList[0]?.id || null
  }, [userId])

  // Sync initialData if provided on mount or update
  useEffect(() => {
    if (initialData) {
      if (initialData.profileName) setProfileName(initialData.profileName)
      if (initialData.selectedGender) setSelectedGender(initialData.selectedGender)
      if (initialData.measurementValues) setMeasurementValues(initialData.measurementValues)
      setIsModalOpen(true)
    }
  }, [initialData])

  // Fetch all schemas (MALE, FEMALE, KIDS) once on mount to build master dictionary
  useEffect(() => {
    let ignore = false
    async function loadMasterSchemas() {
      try {
        const [maleRes, femaleRes, kidsRes] = await Promise.allSettled([
          getMeasurementSchema('MALE'),
          getMeasurementSchema('FEMALE'),
          getMeasurementSchema('KIDS'),
        ])
        if (ignore) return

        const dict = {}
        const ingest = (res) => {
          if (res.status === 'fulfilled' && res.value?.status && Array.isArray(res.value?.data)) {
            res.value.data.forEach((item) => {
              if (item?.id) {
                dict[String(item.id)] = item
              }
            })
          }
        }
        ingest(femaleRes)
        ingest(maleRes)
        ingest(kidsRes)
        setSchemaDictionary(dict)
      } catch (err) {
        console.error('Failed loading measurement schemas:', err)
      }
    }
    loadMasterSchemas()
    return () => {
      ignore = true
    }
  }, [])

  // Load active user's measurement profiles
  const loadProfiles = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await getSavedMeasurementProfiles(userId)
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.profiles)
        ? res.data.profiles
        : []
      if (res?.status && list) {
        setProfiles(list)
        const defId = refreshDefaultProfileId(list)
        setDefaultProfileId(defId)
      } else {
        setProfiles([])
      }
    } catch (e) {
      console.error('Error loading measurements:', e)
    } finally {
      setIsLoading(false)
    }
  }, [userId, refreshDefaultProfileId])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  // Switch gender schema inside form
  const handleGenderSwitch = useCallback(async (gender) => {
    setSelectedGender(gender)
    try {
      const res = await getMeasurementSchema(gender)
      if (res?.status && Array.isArray(res.data)) {
        setSchemaFields(res.data)
        // Also update dictionary
        setSchemaDictionary((prev) => {
          const next = { ...prev }
          res.data.forEach((item) => {
            if (item?.id) next[String(item.id)] = item
          })
          return next
        })
      }
    } catch (e) {
      console.error('Error switching gender schema:', e)
    }
  }, [])

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProfile(null)
    setProfileName('')
    setMeasurementValues({})
    setFormError('')
    setMakeDefaultCheckbox(profiles.length === 0)
    handleGenderSwitch('FEMALE')
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (prof) => {
    setEditingProfile(prof)
    setProfileName(prof.profile_name || prof.name || '')
    const gender = (prof.gender || 'FEMALE').toUpperCase()
    setSelectedGender(gender)
    setFormError('')
    setMakeDefaultCheckbox(Number(prof.id) === Number(defaultProfileId))

    // Populate measurement values
    const vals = {}
    if (Array.isArray(prof.measurements)) {
      prof.measurements.forEach((m) => {
        if (m.measurement_id !== undefined && m.value !== undefined) {
          vals[String(m.measurement_id)] = m.value
        }
      })
    }
    setMeasurementValues(vals)
    handleGenderSwitch(gender)
    setIsModalOpen(true)
  }

  // Set default profile
  const handleSetDefault = (prof) => {
    if (!prof?.id) return
    if (userId) {
      localStorage.setItem(`bespoke_default_measurement_profile_${userId}`, String(prof.id))
    }
    setDefaultProfileId(prof.id)
    showToast(`"${prof.profile_name || prof.name}" set as your default fit profile.`)
  }

  // Delete profile
  const handleConfirmDelete = async () => {
    if (!deletingProfile?.id) return
    try {
      await deleteMeasurementProfile(deletingProfile.id)
      showToast('Measurement profile removed.')
      setDeletingProfile(null)
      await loadProfiles()
    } catch (e) {
      console.error(e)
      showToast('Could not delete profile. Please try again.', 'error')
    }
  }

  // Submit create or edit form
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) {
      setFormError('Please enter a profile name (e.g. My Kurti Fit / Loki Formal).')
      return
    }

    // Check at least one measurement entered
    const validEntries = Object.entries(measurementValues).filter(
      ([, val]) => val !== '' && !isNaN(Number(val)) && Number(val) > 0
    )
    if (validEntries.length === 0) {
      setFormError('Please enter at least one body measurement.')
      return
    }

    if (!currentUser) {
      if (onOpenLoginPrompt) {
        onOpenLoginPrompt({
          title: 'Sign In Required',
          message: 'Please login to save your bespoke measurement profile.',
          actionDescription: 'save your custom measurement profile',
          pendingAction: {
            type: 'SAVE_MEASUREMENTS',
            measurementData: {
              profileName: profileName.trim(),
              selectedGender,
              measurementValues,
            },
            pageUrl: window.location.href,
          },
        })
      } else if (onOpenAuth) {
        onOpenAuth('login')
      }
      return
    }

    setIsSubmitting(true)
    setFormError('')

    const payload = {
      user_id: userId,
      cust_id: userId,
      profile_name: profileName.trim(),
      name: profileName.trim(),
      gender: selectedGender,
      measurements: validEntries.map(([id, val]) => ({
        measurement_id: Number(id),
        measurment_id: Number(id),
        value: String(val),
      })),
    }

    try {
      // If editing an existing profile, remove previous record ID upon storing update
      if (editingProfile?.id) {
        await deleteMeasurementProfile(editingProfile.id)
      }

      const res = await saveMeasurementProfile(payload)
      const newId =
        res?.data?.customer_measurement_name_id ||
        res?.data?.id ||
        res?.id ||
        null

      if (makeDefaultCheckbox && newId && userId) {
        localStorage.setItem(`bespoke_default_measurement_profile_${userId}`, String(newId))
        setDefaultProfileId(newId)
      }

      await loadProfiles()
      setIsModalOpen(false)
      showToast(editingProfile ? 'Profile updated successfully.' : 'New measurement profile saved!')
    } catch (err) {
      console.error(err)
      setFormError('Failed to save profile. Please check your network and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format measurement label dynamically from schema
  const resolveMeasurementName = (measurementId, fallbackName) => {
    if (fallbackName && !fallbackName.toLowerCase().startsWith('metric')) {
      return fallbackName
    }
    const schemaItem = schemaDictionary[String(measurementId)]
    if (schemaItem?.name) {
      // Clean up common schema names
      return schemaItem.name
        .replace(/^Height of shirt from shoulder$/i, 'Shirt Length')
        .replace(/^Chest Test$/i, 'Chest')
    }
    return `Metric #${measurementId}`
  }

  // Not logged in state
  if (!currentUser) {
    return (
      <div className="min-h-[75vh] bg-[#FFF5FA]/30 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-[#F0E5EC] shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#FFF5FA] border border-pink-200/60 rounded-2xl flex items-center justify-center text-[#C00078] mx-auto mb-5 shadow-xs">
            <Ruler className="w-8 h-8 stroke-[1.75]" />
          </div>
          <h2 className="text-xl font-bold text-[#24212A] tracking-tight">
            Custom Measurement Profiles
          </h2>
          <p className="text-xs text-[#77717C] leading-relaxed mt-2 mb-6">
            Log in to save your body dimensions and enjoy bespoke made-to-measure tailoring for all your festival, bridal, and everyday luxury creations.
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
      {/* Toast Feedback */}
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
          <span className="font-bold text-[#24212A]">Measurements</span>
        </nav>

        {/* Page Heading & Action */}
        <div className="bg-white rounded-2xl border border-[#F0E5EC] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#24212A] tracking-tight">
                My Measurement Profiles
              </h1>
              {profiles.length > 0 && (
                <span className="inline-flex items-center text-xs font-bold text-[#C00078] bg-[#FFF5FA] border border-[#F0E5EC] px-2.5 py-0.5 rounded-full">
                  {profiles.length} {profiles.length === 1 ? 'saved profile' : 'saved profiles'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#77717C] mt-1">
              Your saved measurements, ready for your next perfect fit.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C00078] hover:bg-[#97005F] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create New Profile</span>
          </button>
        </div>

        {/* Tailoring Information Banner */}
        <div className="bg-[#FFF5FA] border border-pink-200/70 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-pink-100/70 text-[#C00078] flex items-center justify-center shrink-0 shadow-2xs">
            <Ruler className="w-5 h-5 stroke-[2]" />
          </div>
          <div className="flex-1">
            <h3 className="text-xs sm:text-sm font-bold text-[#24212A]">
              Your Perfect Fit, Every Time
            </h3>
            <p className="text-xs text-[#77717C] mt-0.5 leading-relaxed">
              Save your measurements once and use them at checkout for a personalised fit. Our master ateliers tailor each garment to your exact body dimensions.
            </p>
          </div>
        </div>

        {/* Profiles Grid Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl border border-[#F0E5EC] animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-5 bg-neutral-200 rounded w-1/3" />
                  <div className="h-5 bg-neutral-100 rounded w-16" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="h-12 bg-neutral-100 rounded-xl" />
                  <div className="h-12 bg-neutral-100 rounded-xl" />
                  <div className="h-12 bg-neutral-100 rounded-xl" />
                </div>
                <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
                  <div className="h-7 bg-neutral-100 rounded w-16" />
                  <div className="h-7 bg-neutral-100 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : profiles.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-[#F0E5EC] max-w-lg mx-auto shadow-xs my-8">
            <div className="w-20 h-20 rounded-full bg-[#FFF5FA] border border-pink-200/60 flex items-center justify-center text-[#C00078] mx-auto mb-5 shadow-xs">
              <Ruler className="w-9 h-9 stroke-[1.75]" />
            </div>
            <h2 className="text-xl font-extrabold text-[#24212A] tracking-tight">
              No measurement profiles yet
            </h2>
            <p className="text-xs sm:text-sm text-[#77717C] mt-2 mb-7 max-w-sm mx-auto leading-relaxed">
              Create your first profile to enjoy a more personalised fit across kurtis, sherwanis, suits, and bespoke dresses.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#C00078] hover:bg-[#97005F] text-white text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Your First Profile</span>
            </button>
          </div>
        ) : (
          /* Profile Cards Grid: 2-Column Responsive Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            {profiles.map((prof) => {
              const isDefault = Number(prof.id) === Number(defaultProfileId)
              const genderText = (prof.gender || 'FEMALE').toUpperCase()
              const measurementsList = Array.isArray(prof.measurements) ? prof.measurements : []
              const displayList = measurementsList.slice(0, 6)
              const hasMore = measurementsList.length > 6

              return (
                <div
                  key={prof.id}
                  className={`rounded-2xl p-5 sm:p-6 transition-all flex flex-col justify-between relative ${
                    isDefault
                      ? 'bg-gradient-to-br from-[#FFF5FA] via-white to-white border-2 border-[#C00078] shadow-[0_4px_18px_rgba(192,0,120,0.08)]'
                      : 'bg-white border border-[#F0E5EC] hover:border-pink-300/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(192,0,120,0.06)]'
                  }`}
                >
                  <div>
                    {/* Header Row: Avatar, Name, Gender Badge & Default Indicator */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="w-8 h-8 rounded-xl bg-[#FFF5FA] border border-[#F0E5EC] text-[#C00078] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-[17px] font-bold text-[#24212A] tracking-tight line-clamp-1">
                            {prof.profile_name || prof.name || 'Custom Fit Profile'}
                          </h3>
                        </div>
                        <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {genderText}
                        </span>
                      </div>

                      {isDefault && (
                        <span className="inline-flex items-center gap-1 bg-[#C00078] text-white text-[9.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-2xs shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Default Profile</span>
                        </span>
                      )}
                    </div>

                    {/* Measurement Cells Grid */}
                    <div className="mt-4 pt-3.5 border-t border-neutral-100">
                      {measurementsList.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic py-2">
                          Standard tailor dimensions saved for this profile.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {displayList.map((m, mIdx) => {
                            const metaName = resolveMeasurementName(m.measurement_id, m.name || m.label)
                            return (
                              <div
                                key={mIdx}
                                className="bg-neutral-50/90 hover:bg-[#FFF5FA]/60 border border-[#F0E5EC] rounded-xl p-2.5 transition-colors"
                              >
                                <span className="text-[11px] text-[#77717C] font-semibold truncate block">
                                  {metaName}
                                </span>
                                <span className="text-sm sm:text-base font-extrabold text-[#24212A] block mt-0.5">
                                  {m.value}&quot;
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Expand prompt if more than 6 measurements */}
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setViewingProfile(prof)}
                          className="mt-2 text-[11px] font-bold text-[#C00078] hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>View all {measurementsList.length} measurements &rarr;</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Action Row */}
                  <div className="pt-3.5 mt-4 border-t border-[#F0E5EC] flex items-center justify-between flex-wrap gap-2">
                    {/* Left Actions: Deliver with this fit (selectMode) or Set as Default */}
                    <div>
                      {selectMode ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectProfile) onSelectProfile(prof)
                            if (onBack) onBack()
                          }}
                          className="px-4 py-1.5 bg-[#C00078] hover:bg-[#97005F] text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Use this Profile</span>
                        </button>
                      ) : isDefault ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C00078]">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Default fit profile</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(prof)}
                          className="text-xs font-semibold text-[#C00078] hover:bg-[#FFF5FA] border border-pink-200/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Set as Default</span>
                        </button>
                      )}
                    </div>

                    {/* Right Actions: View, Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingProfile(prof)}
                        className="p-1.5 text-[#77717C] hover:text-[#24212A] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="View detailed measurements"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prof)}
                        className="p-1.5 text-[#77717C] hover:text-[#24212A] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Edit profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingProfile(prof)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Delete profile"
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

      {/* View Detailed Measurements Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-[#F0E5EC] my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3.5 border-b border-[#F0E5EC]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#24212A]">
                    {viewingProfile.profile_name || viewingProfile.name}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                    {viewingProfile.gender}
                  </span>
                </div>
                <p className="text-xs text-[#77717C] mt-0.5">
                  Complete saved atelier dimensions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="p-1.5 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-[#24212A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
              <div className="grid grid-cols-2 gap-2.5">
                {(viewingProfile.measurements || []).map((m, idx) => {
                  const metaName = resolveMeasurementName(m.measurement_id, m.name || m.label)
                  const schemaItem = schemaDictionary[String(m.measurement_id)]
                  return (
                    <div
                      key={idx}
                      className="bg-neutral-50/90 border border-[#F0E5EC] rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {schemaItem?.image && (
                          <img
                            src={formatImageUrl(schemaItem.image)}
                            alt={metaName}
                            className="w-5 h-5 rounded-md object-cover shrink-0"
                          />
                        )}
                        <span className="text-xs text-[#24212A] font-medium truncate">
                          {metaName}
                        </span>
                      </div>
                      <span className="text-sm font-extrabold text-[#C00078] shrink-0">
                        {m.value}&quot;
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0E5EC] flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const target = viewingProfile
                  setViewingProfile(null)
                  handleOpenEdit(target)
                }}
                className="flex-1 py-2.5 bg-[#C00078] hover:bg-[#97005F] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Measurements</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingProfile(null)}
                className="px-5 py-2.5 border border-[#F0E5EC] text-[#77717C] hover:bg-neutral-50 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Measurement Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#F0E5EC] my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-[#F0E5EC]">
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#24212A] tracking-tight">
                  {editingProfile ? 'Edit Measurement Profile' : 'New Custom Measurement Profile'}
                </h3>
                <p className="text-xs text-[#77717C] mt-0.5">
                  Enter your body dimensions in inches for personalized made-to-measure tailoring.
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

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Name & Garment Department Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    Profile Name <span className="text-[#C00078]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => {
                      setProfileName(e.target.value)
                      if (formError) setFormError('')
                    }}
                    placeholder="e.g. My Festive Fit / Loki Formal"
                    className="w-full px-3.5 py-2.5 text-xs text-[#24212A] bg-white border border-[#F0E5EC] rounded-xl focus:border-[#C00078] focus:ring-1 focus:ring-[#C00078]/20 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24212A] mb-1">
                    Garment Department
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl">
                    {['FEMALE', 'MALE', 'KIDS'].map((g) => {
                      const isSelected = selectedGender === g
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => handleGenderSwitch(g)}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-[#C00078] shadow-xs'
                              : 'text-[#77717C] hover:text-[#24212A]'
                          }`}
                        >
                          {g.charAt(0) + g.slice(1).toLowerCase()}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic Measurement Inputs from API Schema */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#24212A]">
                    Body Measurements (in Inches &quot;)
                  </span>
                  <span className="text-[11px] text-[#77717C]">
                    Loaded from {selectedGender.toLowerCase()} tailor schema
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {schemaFields.length === 0 ? (
                    <div className="col-span-3 text-center py-6 text-xs text-neutral-400">
                      Loading measurement matrix...
                    </div>
                  ) : (
                    schemaFields.map((f) => {
                      const label = resolveMeasurementName(f.id, f.name)
                      const val = measurementValues[String(f.id)] || ''
                      return (
                        <div
                          key={f.id}
                          className="p-2.5 bg-neutral-50/90 rounded-xl border border-[#F0E5EC] hover:border-pink-200 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-[#24212A] truncate pr-1">
                              {label}
                            </label>
                            {f.image && (
                              <img
                                src={formatImageUrl(f.image)}
                                alt={label}
                                className="w-4 h-4 rounded-md object-cover shrink-0"
                              />
                            )}
                          </div>
                          <div className="flex items-center">
                            <input
                              type="number"
                              step="0.5"
                              value={val}
                              onChange={(e) =>
                                setMeasurementValues({
                                  ...measurementValues,
                                  [String(f.id)]: e.target.value,
                                })
                              }
                              placeholder="e.g. 34.0"
                              className="w-full px-2.5 py-1.5 text-xs text-[#24212A] bg-white border border-[#F0E5EC] rounded-lg focus:border-[#C00078] outline-none font-bold"
                            />
                            <span className="text-xs text-neutral-400 ml-1.5">&quot;</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Set as Default Profile Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={makeDefaultCheckbox}
                    onChange={(e) => setMakeDefaultCheckbox(e.target.checked)}
                    className="w-4 h-4 rounded text-[#C00078] border-[#F0E5EC] focus:ring-[#C00078] accent-[#C00078] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#24212A]">
                    Set as my default measurement profile for 1-click checkout
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
                    <span>{editingProfile ? 'Update Profile' : 'Save Measurement Profile'}</span>
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
      {deletingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-[#F0E5EC] text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Trash2 className="w-6 h-6 stroke-[1.75]" />
            </div>
            <h3 className="text-base font-bold text-[#24212A]">Delete Measurement Profile?</h3>
            <p className="text-xs text-[#77717C] leading-relaxed mt-1.5 mb-6">
              Are you sure you want to remove{' '}
              <strong className="text-[#24212A]">
                {deletingProfile.profile_name || deletingProfile.name}
              </strong>
              ? You will need to re-enter your dimensions for future bespoke orders.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingProfile(null)}
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
