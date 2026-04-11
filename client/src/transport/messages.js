// client/src/transport/messages.js

export const MSG = {
  MESSAGE:    0x01,   // regular encrypted message content
  FRAGMENT:   0x02,   // key share fragment (request or response)
  RATCHET:    0x03,   // DH ratchet step
  TOMBSTONE:  0x04,   // clean session termination
  DUMMY:      0x05,   // decoy traffic — must be indistinguishable from MESSAGE
  CHECKPOINT: 0x06,   // ratchet state hash for Layer 5
  COMMIT_REQ: 0x07,   // Layer 1 Phase 1 — session_request
  COMMIT_ACK: 0x08,   // Layer 1 Phase 2 — session_ack
  KEY_REQ:    0x09,   // custodian URL exchange request
  KEY_RESP:   0x0A,   // custodian URL exchange response
}
