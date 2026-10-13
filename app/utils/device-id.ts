const STORAGE_KEY = 'paywall.deviceId'

function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback for older WebViews without randomUUID.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let memoryId: string | null = null

/**
 * Anonymous device identifier persisted in localStorage.
 * Stands in for a real user id the host app would pass into the WebView.
 * Client-only: call it from event handlers or onMounted.
 */
export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored
    const id = uuidV4()
    localStorage.setItem(STORAGE_KEY, id)
    return id
  }
  catch {
    // Storage can be disabled inside some WebViews — keep the id for this session.
    memoryId ??= uuidV4()
    return memoryId
  }
}
