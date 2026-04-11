// client/src/defence/tombstone.js

export async function sendTombstone(socket, sessionId, identityKeyPair) {
  const payload = JSON.stringify({
    sessionId: Array.from(sessionId),
    timestamp: Date.now(),
    reason: 'clean_revocation',
    nonce: Array.from(crypto.getRandomValues(new Uint8Array(16)))
  })
  const encoder = new TextEncoder()
  const payloadBytes = encoder.encode(payload)
  
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    identityKeyPair.privateKey,
    payloadBytes
  )
  
  const msg = {
    type: 0x04, // MSG.TOMBSTONE
    payload: payloadBytes,
    signature: new Uint8Array(signature)
  }
  
  socket.send(msg)
}

export async function verifyTombstone(message, theirIdentityPublicKey) {
  const valid = await crypto.subtle.verify(
    { name: 'Ed25519' },
    theirIdentityPublicKey,
    message.signature,
    message.payload
  )
  if (!valid) throw new Error('TOMBSTONE_SIGNATURE_INVALID')
}
