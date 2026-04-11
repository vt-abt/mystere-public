import { MSG } from '../transport/messages.js'

export async function createSessionRequest(identityKeyPair, theirIdentityPublicKey) {
  const nonce = crypto.getRandomValues(new Uint8Array(32))
  const timestamp = new Uint8Array(new BigUint64Array([BigInt(Date.now())]).buffer)
  
  // Payload: [32 bytes nonce][8 bytes timestamp]
  const payload = new Uint8Array(32 + 8)
  payload.set(nonce, 0)
  payload.set(timestamp, 32)
  
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    identityKeyPair.privateKey,
    payload
  )
  
  return { 
    payload, 
    signature: new Uint8Array(signature), 
    type: MSG.COMMIT_REQ 
  }
}

export async function createSessionAck(identityKeyPair, sessionRequest) {
  const requestHash = new Uint8Array(
    await crypto.subtle.digest('SHA-512', sessionRequest.payload)
  )
  const nonce = crypto.getRandomValues(new Uint8Array(32))
  
  // Payload: [64 bytes requestHash][32 bytes nonce]
  const payload = new Uint8Array(64 + 32)
  payload.set(requestHash, 0)
  payload.set(nonce, 64)
  
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    identityKeyPair.privateKey,
    payload
  )
  
  return { 
    payload, 
    signature: new Uint8Array(signature), 
    type: MSG.COMMIT_ACK 
  }
}

export async function computeSessionId(requestPayload, ackPayload) {
  const combined = new Uint8Array(requestPayload.length + ackPayload.length)
  combined.set(requestPayload, 0)
  combined.set(ackPayload, requestPayload.length)
  
  return new Uint8Array(await crypto.subtle.digest('SHA-512', combined))
}

export async function verifyCommitmentSignature(publicKey, payload, signature) {
  return crypto.subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    signature,
    payload
  )
}
