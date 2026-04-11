// client/src/defence/decoy.js
import { hkdf, padToBlockSize } from '../crypto/webcrypto.js'

const KDF_DUMMY_RATE_INFO = "dummy_rate"

export class DecoyTraffic {
  constructor(socket, rootKey, encryptAsType) {
    this.socket = socket
    this.interval = null
    this.rate = null
    this.rootKey = rootKey
    this.encryptAsType = encryptAsType
  }

  async init() {
    const rateBytes = await hkdf(this.rootKey, new Uint8Array(32), KDF_DUMMY_RATE_INFO, 4)
    const rateRaw = new DataView(rateBytes.buffer).getUint32(0)
    // Rate: between 2 and 10 seconds between dummies
    this.rate = 2000 + (rateRaw % 8000)
  }

  start() {
    this.interval = setInterval(() => this.sendDummy(), this.rate)
  }

  stop() {
    clearInterval(this.interval)
  }

  async sendDummy() {
    // Generate a dummy message that is IDENTICAL IN SIZE to real messages (padded to 256n bytes)
    // MSG.DUMMY = 0x05
    const dummyPayload = crypto.getRandomValues(new Uint8Array(32))
    const encrypted = await this.encryptAsType(dummyPayload, 0x05)
    this.socket.send(encrypted)
  }
}
