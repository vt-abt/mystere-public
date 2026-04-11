// client/src/crypto/capability.js
import { hkdf, aesGCMEncrypt, aesGCMDecrypt, wipe } from './webcrypto.js'

const KDF_CUSTODIAN_INFO = "mystere_custodian_access_v1"
const KDF_CUSTODIAN_ENC  = "custodian_enc_"

async function sha256(data) {
  return crypto.subtle.digest('SHA-256', data)
}

function encodeHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function concat(...arrays) {
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const array of arrays) {
    result.set(array, offset)
    offset += array.length
  }
  return result
}

export async function deriveCapabilityToken(rootKey, sessionId) {
  // rootKey: raw bytes of the Signal root key
  // Returns: 32-byte capability token
  const encoder = new TextEncoder()
  return hkdf(
    rootKey,
    new Uint8Array(32),  // salt: zeros
    KDF_CUSTODIAN_INFO + encodeHex(sessionId),
    32
  )
}

export async function encryptShareCustodian(capabilityToken, shareCustodian, messageId, sessionId) {
  const encoder = new TextEncoder()
  const messageIdBytes = typeof messageId === 'string' ? encoder.encode(messageId) : messageId
  const sessionIdBytes = typeof sessionId === 'string' ? encoder.encode(sessionId) : sessionId
  
  const encKeyBytes = await hkdf(
    capabilityToken,
    new Uint8Array(32),
    KDF_CUSTODIAN_ENC + encodeHex(messageIdBytes),
    32
  )
  const encKey = await crypto.subtle.importKey('raw', encKeyBytes, 'AES-GCM', false, ['encrypt'])
  
  // Rule #7: session_id must be in AAD
  const aad = await sha256(concat(capabilityToken, messageIdBytes, sessionIdBytes))
  const payload = concat(shareCustodian, messageIdBytes, sessionIdBytes)
  
  const result = await aesGCMEncrypt(encKey, payload, aad)
  wipe(encKeyBytes)
  return result
}

export async function decryptShareCustodian(capabilityToken, blob, messageId, sessionId) {
  const encoder = new TextEncoder()
  const messageIdBytes = typeof messageId === 'string' ? encoder.encode(messageId) : messageId
  const sessionIdBytes = typeof sessionId === 'string' ? encoder.encode(sessionId) : sessionId
  
  const encKeyBytes = await hkdf(
    capabilityToken,
    new Uint8Array(32),
    KDF_CUSTODIAN_ENC + encodeHex(messageIdBytes),
    32
  )
  const encKey = await crypto.subtle.importKey('raw', encKeyBytes, 'AES-GCM', false, ['decrypt'])
  
  const aad = await sha256(concat(capabilityToken, messageIdBytes, sessionIdBytes))
  const payload = await aesGCMDecrypt(encKey, blob, aad)
  wipe(encKeyBytes)
  
  // First 32 bytes are share_custodian
  return new Uint8Array(payload).slice(0, 32)
}

export async function storageKey(capabilityToken, messageId) {
  const encoder = new TextEncoder()
  const messageIdBytes = typeof messageId === 'string' ? encoder.encode(messageId) : messageId
  return sha256(concat(capabilityToken, messageIdBytes))
}
