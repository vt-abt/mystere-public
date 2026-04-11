// client/src/crypto/webauthn.js

export async function registerCredential(rpId) {
  const userId = crypto.getRandomValues(new Uint8Array(16))  // random, not identity-linked
  
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Mystere", id: rpId },
      user: {
        id: userId,
        name: "mystere_user",         // non-identifying
        displayName: "Mystere User"
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],  // P-256
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "preferred",
        authenticatorAttachment: "platform"
      },
      timeout: 60000
    }
  })
  
  // Store credential.id in IndexedDB (not identity-linked)
  // Return publicKey for relay registration
  return {
    credentialId: credential.rawId,
    publicKey: credential.response.getPublicKey()
  }
}

export async function getAssertion(credentialId, sessionId, messageId, nonce) {
  const encoder = new TextEncoder()
  const sessionIdBytes = typeof sessionId === 'string' ? encoder.encode(sessionId) : sessionId
  const messageIdBytes = typeof messageId === 'string' ? encoder.encode(messageId) : messageId
  const nonceBytes = typeof nonce === 'string' ? encoder.encode(nonce) : nonce
  
  // challengeInput = concat(sessionId, messageId, nonce, encodeTimestamp(Date.now()))
  const timestamp = new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer)
  const challengeInput = new Uint8Array(sessionIdBytes.length + messageIdBytes.length + nonceBytes.length + timestamp.length)
  challengeInput.set(sessionIdBytes)
  challengeInput.set(messageIdBytes, sessionIdBytes.length)
  challengeInput.set(nonceBytes, sessionIdBytes.length + messageIdBytes.length)
  challengeInput.set(timestamp, sessionIdBytes.length + messageIdBytes.length + nonceBytes.length)
  
  const challenge = await crypto.subtle.digest('SHA-256', challengeInput)
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: new Uint8Array(challenge),
      allowCredentials: [{ id: credentialId, type: 'public-key' }],
      userVerification: 'required',    // biometric mandatory — never change this
      timeout: 30000
    }
  })
  
  return assertion
}

export function verifyUVFlag(authenticatorData) {
  // authenticatorData byte layout:
  // [0-31]  rpIdHash
  // [32]    flags byte
  // flags bit 2 (0x04) = UV (User Verified) — biometric confirmed
  // flags bit 0 (0x01) = UP (User Present)
  const flags = new Uint8Array(authenticatorData)[32]
  const UV = (flags & 0x04) !== 0
  const UP = (flags & 0x01) !== 0
  if (!UV) throw new Error('WEBAUTHN_UV_NOT_SET: biometric not verified — reject')
  if (!UP) throw new Error('WEBAUTHN_UP_NOT_SET: user not present — reject')
  return true
}
