import React, { useState } from 'react'
import { registerCredential } from '../crypto/webauthn'

function Session({ onEstablished }) {
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    try {
      const rpId = window.location.hostname
      // 1. WebAuthn Registration
      const cred = await registerCredential(rpId)
      
      // 2. Generate Mock Signal Keys
      const keyPair = await crypto.subtle.generateKey(
        { name: 'Ed25519' },
        true,
        ['sign', 'verify']
      )
      
      const mockKeys = {
        identity_pubkey: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
        webauthn_pubkey: Array.from(new Uint8Array(cred.publicKey)).map(b => b.toString(16).padStart(2, '0')).join(''),
        signed_prekey: Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''),
        signed_prekey_sig: Array.from(crypto.getRandomValues(new Uint8Array(64))).map(b => b.toString(16).padStart(2, '0')).join(''),
        one_time_prekeys: Array.from({length: 5}, () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''))
      }

      // 3. Register with Relay
      const response = await fetch('http://localhost:8000/keys/identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockKeys)
      })
      const { user_id } = await response.json()
      
      console.log("Registered on Relay with ID:", user_id)
      onEstablished({ userId: user_id, cred, mockKeys, mockKeyPair: keyPair })
    } catch (err) {
      console.error("Registration failed:", err)
      alert("Registration failed. Check console.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="session-setup">
      <h2>1. Identity Registration</h2>
      <p>This will register your hardware-bound identity on the Relay.</p>
      <button onClick={handleRegister} disabled={loading}>
        {loading ? 'Registering...' : 'Register & Connect'}
      </button>
    </div>
  )
}

export default Session
