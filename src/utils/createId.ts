const uuidFromBytes = (bytes: Uint8Array) => {
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Creates a unique local identifier without requiring the newer randomUUID API. */
export const createId = () => {
  const webCrypto = globalThis.crypto
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID()
  if (typeof webCrypto?.getRandomValues === 'function') return uuidFromBytes(webCrypto.getRandomValues(new Uint8Array(16)))
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
