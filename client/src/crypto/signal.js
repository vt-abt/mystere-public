import { ProtocolAddress, SessionBuilder, SessionCipher } from '@raphaelvserafim/libsignal'
import { SignalProtocolStore } from './signal-store.js'

const store = new SignalProtocolStore();

// recipientId: string identifier
// preKeyBundle: { identityKey, signedPreKey, preKey, registrationId }
export async function initSession(recipientId, preKeyBundle) {
  const address = new ProtocolAddress(recipientId, 1)
  const builder = new SessionBuilder(store, address)
  await builder.processPreKey(preKeyBundle)
}

export async function encryptMessage(recipientId, plaintext) {
  const address = new ProtocolAddress(recipientId, 1)
  const cipher = new SessionCipher(store, address)
  return cipher.encrypt(plaintext)
}

export async function decryptMessage(senderId, ciphertext) {
  const address = new ProtocolAddress(senderId, 1)
  const cipher = new SessionCipher(store, address)
  if (ciphertext.type === 3) {  // PreKeyWhisperMessage
    return cipher.decryptPreKeyWhisperMessage(ciphertext.body, 'binary')
  }
  return cipher.decryptWhisperMessage(ciphertext.body, 'binary')
}
