import { expect, test, vi } from 'vitest'
import { keyhelper, ProtocolAddress, SessionBuilder, SessionCipher } from '@raphaelvserafim/libsignal'
import { SignalProtocolStore } from '../src/crypto/signal-store.js'

// Mocking IndexedDB for testing
class MemoryStore extends SignalProtocolStore {
  constructor() {
    super();
    this.memory = new Map();
  }
  async initDB() { return Promise.resolve(); }
  async get(store, key) { return this.memory.get(`${store}:${key}`); }
  async put(store, key, value) { this.memory.set(`${store}:${key}`, value); }
  async remove(store, key) { this.memory.delete(`${store}:${key}`); }
}

test('libsignal handshake simulation', async () => {
  const store = new MemoryStore();
  const registrationId = keyhelper.generateRegistrationId();
  const identityKeyPair = keyhelper.generateIdentityKeyPair();
  
  await store.put('registrationId', 'id', registrationId);
  await store.put('identityKeys', 'keyPair', identityKeyPair);
  
  const preKeyId = 1;
  const preKey = keyhelper.generatePreKey(preKeyId);
  await store.storePreKey(preKeyId, preKey.keyPair);
  
  const signedPreKeyId = 1;
  const signedPreKey = keyhelper.generateSignedPreKey(identityKeyPair, signedPreKeyId);
  await store.storeSignedPreKey(signedPreKeyId, signedPreKey.keyPair);
  
  const bundle = {
    registrationId: registrationId,
    identityKey: identityKeyPair.pubKey,
    preKey: {
      keyId: preKeyId,
      publicKey: preKey.keyPair.pubKey
    },
    signedPreKey: {
      keyId: signedPreKeyId,
      publicKey: signedPreKey.keyPair.pubKey,
      signature: signedPreKey.signature
    }
  };
  
  const recipientId = 'user_b';
  const address = new ProtocolAddress(recipientId, 1);
  const builder = new SessionBuilder(store, address);
  await builder.processPreKey(bundle);
  
  const cipher = new SessionCipher(store, address);
  const plaintext = new TextEncoder().encode('Hello libsignal').buffer;
  const ciphertext = await cipher.encrypt(plaintext);
  
  expect(ciphertext).toBeDefined();
  expect(ciphertext.type).toBe(3); // PreKeyWhisperMessage
})
