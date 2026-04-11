// client/src/crypto/fragments.js

const BATCH_SIZE = 8;

export async function splitKey(mKeyBytes) {
  // mKeyBytes: Uint8Array(32)
  const pad1 = crypto.getRandomValues(new Uint8Array(32))
  const pad2 = crypto.getRandomValues(new Uint8Array(32))
  
  const shareX = new Uint8Array(32)
  const shareY = new Uint8Array(32)
  const shareCustodian = new Uint8Array(32)
  
  for (let i = 0; i < 32; i++) {
    shareX[i] = mKeyBytes[i] ^ pad1[i] ^ pad2[i]
    shareY[i] = pad1[i]
    shareCustodian[i] = pad2[i]
  }
  
  // Wipe intermediates immediately
  pad1.fill(0)
  pad2.fill(0)
  
  return { shareX, shareY, shareCustodian }
}

export function reconstructKey(shareX, shareY, shareCustodian) {
  const mKeyBytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    mKeyBytes[i] = shareX[i] ^ shareY[i] ^ shareCustodian[i]
  }
  return mKeyBytes
}

export async function buildFragmentRequest(sessionId, messageIds, assertion) {
  // messageIds: array of real IDs + dummy IDs
  // All IDs must be present in the array — mix real and dummy
  return {
    type: 0x02, // MSG.FRAGMENT
    messageIds,       // real + dummy, mixed, fixed count (e.g., always 8)
    nonce: crypto.getRandomValues(new Uint8Array(16)),
    timestamp: Date.now(),
    assertion: assertion, // Needs to be serialized if sent over wire
    sessionId
  }
}

export function buildDummyFragment(size) {
  // MUST be identical in size to real fragments
  // MUST be indistinguishable in format
  return crypto.getRandomValues(new Uint8Array(size))
}

export function padToBlockSize(data, blockSize = 256) {
  const padLen = blockSize - (data.length % blockSize)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data)
  padded.fill(padLen, data.length)  // PKCS#7 style
  return padded
}

export function unpad(data) {
  const padLen = data[data.length - 1]
  return data.slice(0, data.length - padLen)
}

export async function signFragment(privateKey, shareX) {
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    shareX
  )
  const result = new Uint8Array(shareX.length + signature.byteLength)
  result.set(shareX)
  result.set(new Uint8Array(signature), shareX.length)
  return result
}

export async function verifyFragment(publicKey, signedFragment) {
  const shareX = signedFragment.slice(0, 32)
  const signature = signedFragment.slice(32)
  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    signature,
    shareX
  )
  if (!valid) throw new Error('FRAGMENT_SIGNATURE_INVALID')
  return shareX
}

export function wipeAll(...arrays) {
  for (const arr of arrays) {
    if (arr instanceof Uint8Array) {
      arr.fill(0)
    }
  }
}
