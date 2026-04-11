// client/src/defence/rotation.js
import { hkdf } from '../crypto/webcrypto.js'

const BASE_N = 50      // rotate every 50 messages
const K_MAX  = 20      // max jitter range
const KDF_JITTER_INFO = "jitter_range"

export async function computeRotationThreshold(rootKey) {
  const jitterBytes = await hkdf(rootKey, new Uint8Array(32), KDF_JITTER_INFO, 4)
  const jitter = new DataView(jitterBytes.buffer).getUint32(0) % K_MAX
  return BASE_N + jitter
}

export class RotationManager {
  constructor(rootKey, sessionId, onTrigger) {
    this.messageCount = 0
    this.sessionId = sessionId
    this.threshold = null
    this.graceTimer = null
    this.rootKey = rootKey
    this.onTrigger = onTrigger
  }

  async init() {
    this.threshold = await computeRotationThreshold(this.rootKey)
  }

  async onMessage() {
    this.messageCount++
    if (this.messageCount >= this.threshold) {
      await this.triggerRotation()
    }
  }

  async triggerRotation() {
    // Notify about rotation
    if (this.onTrigger) {
      await this.onTrigger()
    }
    
    // Start grace window
    this.graceTimer = setTimeout(() => this.expireOldShares(), 30_000)
    
    // Reset counter
    this.messageCount = 0
  }

  async expireOldShares() {
    // Delete all share_x blobs from previous rotation window
    console.log("Grace window expired, clearing old shares...")
    // In reality, would call idb.deleteSharesForRotation(...)
  }
}
