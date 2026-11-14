/**
 * Indian Postal PIN Code Auto-Lookup Utility
 * Resolves City/District and State from 6-digit postal PIN codes.
 * Includes in-memory caching and request timeout handling.
 */

const pincodeCache = new Map()

export async function lookupPincode(pincode) {
  if (!pincode || typeof pincode !== 'string') return null
  const cleanPin = pincode.replace(/\D/g, '').trim()
  if (cleanPin.length !== 6) return null

  // Check cache
  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin)
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null
    const json = await res.json()

    if (
      Array.isArray(json) &&
      json[0]?.Status === 'Success' &&
      Array.isArray(json[0]?.PostOffice) &&
      json[0].PostOffice.length > 0
    ) {
      const office = json[0].PostOffice[0]
      const district = office.District || office.Block || office.Division || ''
      const state = office.State || ''

      const result = {
        city: district.trim(),
        state: state.trim(),
        country: 'India',
        postOffices: json[0].PostOffice.map((p) => p.Name),
      }

      pincodeCache.set(cleanPin, result)
      return result
    }
  } catch (err) {
    // Non-blocking fallback
    console.warn(`[PostalUtils] PIN code lookup notice for ${cleanPin}:`, err.message)
  }

  return null
}

