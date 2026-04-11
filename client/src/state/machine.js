// client/src/state/machine.js

export const STATE = {
  HEALTHY:   'HEALTHY',
  DELAYED:   'DELAYED',
  SUSPECTED: 'SUSPECTED',
  FROZEN:    'FROZEN'
}

export const EVENT = {
  A: 'TIMEOUT_NO_MESSAGE',
  B: 'AUTH_FAILURE',
  C: 'RATCHET_DRIFT_SMALL',   // drift <= k
  D: 'RATCHET_DRIFT_LARGE',   // drift > k
  E: 'HEALTHY_MESSAGE'
}

export class SessionStateMachine {
  constructor(k, onFreeze, onSuspected, onHealthy) {
    this.state = STATE.HEALTHY
    this.k = k                    // drift window
    this.retryCount = 0
    this.RETRY_THRESHOLD = 5
    this.checkpoints = []         // last M checkpoint hashes
    this.onFreeze = onFreeze
    this.onSuspected = onSuspected
    this.onHealthy = onHealthy
  }

  async handleEvent(event, payload = {}) {
    switch (this.state) {
      case STATE.HEALTHY:
        if (event === EVENT.E) return
        if (event === EVENT.A) { this.state = STATE.DELAYED; this.retryCount = 0; return }
        if (event === EVENT.B || event === EVENT.D) await this.freeze('CRYPTO_EVIDENCE')
        if (event === EVENT.C) { this.state = STATE.SUSPECTED; await this.onSuspected() }
        break

      case STATE.DELAYED:
        if (event === EVENT.E) { this.state = STATE.HEALTHY; this.retryCount = 0; this.onHealthy(); return }
        if (event === EVENT.A) {
          this.retryCount++
          if (this.retryCount > this.RETRY_THRESHOLD) {
             await this.freeze('PERSISTENT_UNRESPONSIVE')
          }
          return
        }
        if (event === EVENT.B || event === EVENT.D) await this.freeze('CRYPTO_EVIDENCE')
        if (event === EVENT.C) { this.state = STATE.SUSPECTED; await this.onSuspected() }
        break

      case STATE.SUSPECTED:
        if (payload.checkpointsAlign) { this.state = STATE.HEALTHY; this.onHealthy() }
        else await this.freeze('CHECKPOINT_DIVERGENCE')
        break

      case STATE.FROZEN:
        break
    }
  }

  async freeze(reason) {
    this.state = STATE.FROZEN
    if (this.onFreeze) await this.onFreeze(reason)
  }

  addCheckpoint(hash) {
    this.checkpoints.push(hash)
    if (this.checkpoints.length > 20) this.checkpoints.shift()
  }
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

function encodeUint64(n) {
  return new Uint8Array(new BigUint64Array([BigInt(n)]).buffer)
}

export async function computeCheckpoint(ratchetState, messageCount, sessionId) {
  const input = concat(
    ratchetState,
    encodeUint64(messageCount),
    sessionId
  )
  return new Uint8Array(await crypto.subtle.digest('SHA-512', input))
}
