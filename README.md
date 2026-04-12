<div align="center">

```
███╗   ███╗██╗   ██╗███████╗████████╗███████╗██████╗ ███████╗
████╗ ████║╚██╗ ██╔╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗██╔════╝
██╔████╔██║ ╚████╔╝ ███████╗   ██║   █████╗  ██████╔╝█████╗  
██║╚██╔╝██║  ╚██╔╝  ╚════██║   ██║   ██╔══╝  ██╔══██╗██╔══╝  
██║ ╚═╝ ██║   ██║   ███████║   ██║   ███████╗██║  ██║███████╗
╚═╝     ╚═╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝
```

**No single party can read anything alone.**

---

## I. Why Privacy Matters

Privacy is not about having something to hide. That framing — repeated endlessly by people who benefit from you believing it — is one of the most successful misdirections in the history of technology.

Every significant idea, every dissenting opinion, every conversation between two people trying to figure out who they are — these happen in private first. The erosion of private communication is not a side effect of modern technology. It is a feature that benefits platforms and advertisers — and it has been designed deliberately, incrementally, and with great care to happen slowly enough that most people never notice until it is already gone.

We are at a point where:

- The content of your messages may be end-to-end encrypted, but who you talk to, when, how often, and for how long is fully visible to every platform you use.
- "End-to-end encrypted" has become a marketing phrase that obscures more than it reveals. WhatsApp is E2E encrypted. WhatsApp also knows your entire social graph, your device fingerprint, your location history, and your behavioural patterns — and shares them with Meta's advertising infrastructure.
- Physical access to an unlocked phone — by a partner, a government agent, a border officer, or a thief — is sufficient to read every message you have ever sent or received on every existing mainstream messenger.
- Legal compulsion of a single company is sufficient to expose the communication history of millions of people, silently, without their knowledge.

Privacy is not a luxury for people with secrets. It is the precondition for autonomy, for dignity, and for the kind of honest human communication that has always happened in private and always needed to.

Mystere is one of the smaller attempts to retake what we might loose...?
---

## II. Why I Made This
This project started as one of the many projects that was started under the collective efforts of the now long gone clipper spectreman, between me and @vnr517 (Velara Nordania). Many of the components in this are directly or indirectly taken/ influenced by the early mystere project.
No one else is involved in the development of this project before the public release, and the final say on what is in the final release of the project rests with the owner. This is to protect the ethos and sensitivities surrounding the project(s). I do not wish to explain any details of how what happened, happened, but any work or acknowledgements that will be made which involved this project, should state the primary countributor as Aishwarya Sahu, Adwait Bhardwaj (and not the reverse).
Now on to the work itself...

The question that stuck with me was deceptively simple:

> *What would a messaging system look like if it were designed from the beginning around the assumption that the server, the network, and a physical attacker with your device are all potentially hostile — simultaneously?*

Signal answers this brilliantly for the network attacker. Nobody answers it for the physical attacker. The assumption that device possession is the last line of defence has been quietly accepted by every mainstream messaging system as an inevitable compromise. It is not inevitable. It is just hard.

Mystere is my attempt to do the hard thing — to build a system where physical possession of an unlocked device, combined with PIN knowledge and server-level access, is still cryptographically insufficient to read stored messages.

It started in a fictional world. The problem turned out to be very real.

---

## III. What I Am Trying to Do Here
There are three things Mystere is trying to accomplish, in order of importance.

**First: Build something that works.**
Not a proof of concept with asterisks. Not a demo that works under ideal conditions. A protocol with a coherent threat model, mathematically sound primitives, and a clear-eyed view of what it claims and what it does not. The version rollout plan at the bottom of this document is deliberately conservative for exactly this reason — I would rather ship fewer features that are genuinely secure than many features that are aspirationally secure.

**Second: Make the ideas legible.**
Most cryptographic protocols are documented in ways that require significant background knowledge to understand. The full Mystere protocol specification is available in `docs/SPEC.md` and is written to be readable by someone with a general software engineering background, not just a cryptographer. If you read it and something is unclear, that is a documentation bug. Open an issue.

The goal is that anyone who cares enough to read it can understand exactly what guarantees Mystere makes, why it makes them, and where the boundaries are. Privacy technology that cannot be understood cannot be trusted.

**Third: Contribute to the open source ecosystem that made this possible.**
Mystere would not exist without Signal Protocol, libsodium, the WebAuthn specification, and decades of public cryptography research. Every primitive used in this project is either open source or openly specified. The decision to make Mystere open source is not a strategic choice — it is the only honest option. Security through obscurity is not security. If there are flaws in this design, I want them found and fixed, not hidden.

I believe deeply in what the open source security community has built. This is my contribution back to it.

---

## IV. Technical Stack

### Client (Browser — v0.x through v1.0)

| Component | Technology | Purpose |
|---|---|---|
| Framework | React 18 + Vite | Component-based session and state management, fast iteration |
| Cryptography | WebCrypto API (native browser) | AES-256-GCM, ECDH, HKDF — non-extractable CryptoKey objects, raw bytes never in JS heap |
| Signal Protocol | libsignal-protocol-javascript | Audited X3DH session establishment and Double Ratchet per-message key derivation |
| Authentication | WebAuthn (navigator.credentials) | Hardware-bound biometric authentication — platform authenticator, UV=required enforced |
| Local Storage | IndexedDB via idb wrapper | Ciphertext blobs and encrypted share blobs only — no key material ever written to disk |
| Transport | WebSockets | Persistent single channel — messages, fragments, and dummies are indistinguishable at transport layer |
| TLS | Mandatory everywhere (mkcert in dev) | WebCrypto and WebAuthn both require a secure context — no exceptions |

### Client (Android — v1.0 production)

| Component | Technology | Purpose |
|---|---|---|
| Language | Kotlin | Modern Android development |
| Key Storage | Android Keystore + StrongBox | TEE-backed hardware-bound key storage, `setUserAuthenticationRequired(true)` |
| Biometrics | BiometricPrompt | Replaces WebAuthn — fresh biometric required per operation, PIN alone rejected |
| Signal Protocol | libsignal-android | Same protocol, native implementation |
| Storage | EncryptedSharedPreferences + Room | Encrypted at rest, session state never in plaintext |

### Relay Server

| Component | Technology | Purpose |
|---|---|---|
| Framework | FastAPI (Python 3.12) | Async-native, WebSocket support, minimal surface area |
| Primary DB | PostgreSQL | ACID guarantees for prekey consumption — row-level locks prevent one-time prekey race conditions |
| Cache | Redis | WebSocket connection state, message queuing |
| Server role | Relay only | Routes encrypted blobs. Never sees plaintext. Never sees key material. Never sees custodian URLs. |

### Custodian Server (separate deployment)

| Component | Technology | Purpose |
|---|---|---|
| Framework | FastAPI (Python 3.12) | Three endpoints only — deposit, retrieve, delete |
| Storage | PostgreSQL + Redis TTL | Opaque key → opaque value with hard expiry. Auto-deletion on TTL. |
| Authentication | WebAuthn assertion verification | Stateless, no user accounts, no identity information stored |
| Logging policy | Operational metrics only | No content logs. No identity logs. No session logs. Cannot be compelled to produce what does not exist. |

### Infrastructure

```
Docker Compose     — relay + custodian + postgres + redis in one command
mkcert             — local TLS for WebCrypto and WebAuthn secure context
pytest             — relay and custodian backend tests
Vitest             — client-side crypto layer unit tests
```

---

## V. The Mathematics and Protocols

This section explains what Mystere actually does under the hood. No hand-waving. No "military-grade encryption." Just the actual constructions.

### 5.1 The Signal Protocol Foundation (Layers 2)

Mystere's transit security is built entirely on the Signal Protocol, specifically two sub-protocols.

**Extended Triple Diffie-Hellman (X3DH)**

X3DH establishes a shared secret between two parties who may not be simultaneously online, using a combination of long-term and ephemeral keys. The shared secret is computed from four Diffie-Hellman operations:

```
DH1 = DH(identity_x,  signed_prekey_y)
DH2 = DH(ephemeral_x, identity_y)
DH3 = DH(ephemeral_x, signed_prekey_y)
DH4 = DH(ephemeral_x, one_time_prekey_y)

shared_secret = HKDF(DH1 || DH2 || DH3 || DH4)
```

The critical property: the shared secret is computed independently on both devices. It is never transmitted. An observer who captures every packet between X and Y sees only public keys — and computing the shared secret from public keys alone requires solving the Elliptic Curve Discrete Logarithm Problem, which is computationally infeasible with Curve25519 at current and foreseeable computing capabilities.

Mystere extends the standard X3DH derivation by mixing `session_id` into the root key:

```
root_key = HKDF(shared_secret || session_id, "mystere_root_v1")
```

This binds the cryptographic session to the mutual session commitment (see Layer 1), preventing session substitution attacks.

**Double Ratchet Algorithm**

Once the session is established, every message derives a unique encryption key. The Double Ratchet maintains two ratchets simultaneously:

The *symmetric-key ratchet* advances with every message:
```
(next_chain_key, message_key) = HMAC-SHA256(chain_key, [0x01, 0x02])
```

Each `message_key` is used once and then deleted. Compromise of `message_key_n` reveals nothing about `message_key_n-1` or `message_key_n+1`.

The *Diffie-Hellman ratchet* fires at each rotation event, deriving an entirely new root key from a fresh DH exchange. This provides two properties that most encryption schemes do not simultaneously guarantee:

- **Forward secrecy**: Past messages cannot be decrypted even if current keys are compromised.
- **Break-in recovery**: Future messages are safe even if current keys are compromised.

### 5.2 The 3-of-3 Threshold Scheme (Layer 3)

This is the core novel contribution of Mystere.

For every message M, a per-message key M_key is generated and split into three shares using XOR secret sharing:

```
M_key           = AES-256 random key
pad_1, pad_2    = independent random 256-bit values

share_x         = M_key ⊕ pad_1 ⊕ pad_2
share_y         = pad_1
share_custodian = pad_2

Reconstruction: share_x ⊕ share_y ⊕ share_custodian
              = (M_key ⊕ pad_1 ⊕ pad_2) ⊕ pad_1 ⊕ pad_2
              = M_key  ✓
```

**Why XOR secret sharing is information-theoretically secure for 2-of-3 subsets:**

Any single share is a uniformly random 256-bit string. It is computationally and information-theoretically indistinguishable from random noise. Knowing share_x alone tells you nothing about M_key — there exists a valid M_key consistent with share_x for every possible value of M_key. The same applies to any single share or any pair of shares.

Only all three shares together reconstruct M_key. This is the 3-of-3 threshold property.

The message is encrypted as:
```
C = AES-256-GCM(M_key, plaintext, AAD = session_id || message_id || sequence_number)
```

AES-256-GCM provides authenticated encryption — decryption fails if the ciphertext has been tampered with, if the wrong key is used, or if the AAD does not match. The inclusion of session_id in AAD means a ciphertext from one session cannot be replayed into another.

**Share distribution:**

```
share_x         → Held by X, released only on authenticated fragment request
share_y         → Delivered to Y over Signal channel, re-encrypted under Y's WebAuthn-bound key
share_custodian → Deposited to Y's chosen custodian, encrypted under capability_token
```

No single party — X, Y, the relay server, or the custodian — holds more than one share for any message.

### 5.3 Capability Token Derivation

The capability token authenticates Y to the custodian without revealing Y's identity. It is derived deterministically from the session's root key:

```
capability_token = HKDF(
  key:   root_key,
  info:  "mystere_custodian_access_v1" || session_id,
  len:   32 bytes
)
```

Both X and Y derive the same capability_token independently — no additional communication needed. The token is unknown to the relay server (never transmitted there), unknown to the custodian until X deposits the first blob, and cryptographically bound to this specific session.

The custodian stores blobs against:
```
storage_key = SHA-256(capability_token || message_id)
```

This means the custodian cannot link two retrievals to the same session (different message_ids produce different storage_keys), and cannot reverse the hash to find the capability_token.

On rotation, a new root_key produces a new capability_token. Old custodian entries expire by TTL. The custodian's knowledge is always bounded to the current rotation window.

### 5.4 WebAuthn Hardware Binding

WebAuthn (Web Authentication API) creates a credential whose private signing key is stored in the device's hardware security element — the platform authenticator. The key never leaves the hardware, even to the browser or the operating system.

When Y requests a fragment, Y must produce a WebAuthn assertion:

```
challenge = SHA-256(session_id || message_id || nonce || timestamp)
assertion = PlatformAuthenticator.sign(challenge)
```

The assertion proves two things:
1. The requester possesses the registered credential (device possession)
2. The user verified their identity via biometric (`userVerification: 'required'`)

Critically, `userVerification: 'required'` means the platform authenticator will refuse to sign without a successful biometric — fingerprint or face recognition. PIN alone is rejected at the hardware level. W who knows Y's PIN but does not have Y's fingerprint cannot produce a valid assertion.

X and the custodian both verify:
- The UV flag (bit 2) of `authenticatorData.flags` is set — biometric was verified
- The signature over `authenticatorData || SHA-256(clientDataJSON)` is valid under the registered public key
- The challenge matches the expected value (prevents replay)
- The timestamp is within acceptable skew (prevents delayed replay)

On Android in v1.0, Android Keystore with `setUserAuthenticationRequired(true)` and `setUserAuthenticationValidityDurationSeconds(-1)` provides equivalent guarantees using `BiometricPrompt`. `StrongBoxBacked(true)` uses a dedicated security chip where available, providing hardware isolation even against a rooted OS.

### 5.5 The Mutual Session Commitment (Layer 1)

Before any X3DH key material is exchanged, both parties sign a commitment to the session using their long-term identity keys:

```
session_request = Sign(SK_identity_x, { target_id, nonce_x, timestamp })
session_ack     = Sign(SK_identity_y, { SHA-512(session_request), nonce_y })
session_id      = SHA-512(session_request || session_ack)
```

`session_id` is then mixed into every subsequent cryptographic operation as authenticated additional data. A message without the correct `session_id` in its AAD fails authentication and is rejected.

This prevents:
- **Session poisoning**: An attacker cannot substitute a different session because `session_id` is bound to both identity signatures.
- **Prekey exhaustion**: One-time prekeys are consumed only after both parties have committed — a fake session cannot deplete prekeys without both parties' identity keys.
- **Front-running**: Phase 2 requires Y's identity key signature. It cannot be forged.

### 5.6 The Event-Driven Ratchet and Jitter (Layer 4)

Rotation is triggered by message count, not wall clock time. This makes the system immune to NTP manipulation attacks. The rotation interval includes unpredictable jitter:

```
N     = base rotation interval (default: 50 messages)
k     = HKDF(root_key, "jitter_range") mod K_max    (default K_max: 20)
trigger at: N + k messages
```

Both parties derive `k` independently from `root_key`. Neither transmits `k`. An external observer watching traffic cannot predict when rotation will fire. An attacker who controls message delivery cannot trigger rotation at a chosen moment by controlling message count, because they cannot know `k`.

On rotation, a new `root_key`, new chain keys, and a new `capability_token` are derived. Old shares are deleted after a 30-second grace window. Old custodian blobs expire by TTL. The blast radius of any compromise is bounded to the current rotation window — past windows are irrecoverable, future windows require full re-compromise.

### 5.7 The Session State Machine (Layer 5)

The state machine prevents the protocol from treating network failures as security events. Events are classified before the system reacts:

```
Event A: No message received within timeout
         → Ambiguous. Network failure or active blocking.
         → DO NOT freeze. Start retry counter.

Event B: Message received, authentication fails
         → Unambiguous. Active tampering.
         → Immediate hard freeze.

Event C: Message received, auth passes, ratchet drifts ≤ k steps
         → Probably out-of-order delivery.
         → Initiate checkpoint exchange before acting.

Event D: Message received, auth passes, ratchet drifts > k steps
         → Structurally inconsistent.
         → Freeze after checkpoint verification.

Event E: Message received, auth passes, ratchet matches
         → Healthy. Normal operation.
```

States: `HEALTHY → DELAYED → SUSPECTED → FROZEN`

Only Event B, or Event D with confirmed checkpoint divergence, justifies `FROZEN`. No number of Event A occurrences alone can force a hard freeze. This separates network failures from security failures — an important distinction that naive implementations miss.

Checkpoint commitments are computed every N messages:

```
checkpoint_n = SHA-512(ratchet_state_n || message_count || session_id)
```

These are hashes of ratchet state, not key material. They are safe to persist. On `SUSPECTED`, both sides exchange their last M checkpoints to identify the exact point of divergence and determine whether it is explainable (reordering) or unexplainable (possible attack).

---

## VII. Acknowledgements

Mystere stands on the shoulders of decades of public cryptography research and open source engineering. None of this would exist without the following:

**Signal Protocol — Open Whisper Systems / Signal Foundation**  
The Double Ratchet Algorithm and X3DH key agreement are the foundation of Mystere's transit security. Moxie Marlinspike and Trevor Perrin's work on Signal Protocol is one of the most significant contributions to practical cryptography in the last decade. The fact that it is open source and freely implementable is a gift to everyone who builds on it.  
https://signal.org/docs/

**libsignal-protocol-javascript**  
The JavaScript implementation of Signal Protocol used in Mystere's browser client. Audited, maintained, and trusted by millions.  
https://github.com/signalapp/libsignal

**libsodium**  
Daniel J. Bernstein's NaCl and the libsodium fork — the gold standard for easy-to-use, hard-to-misuse cryptographic primitives. The philosophy of making secure defaults the path of least resistance has influenced every design decision in Mystere.  
https://libsodium.org

**WebAuthn Specification — W3C & FIDO Alliance**  
The Web Authentication API specification that made hardware-bound authentication available natively in browsers. The work of the FIDO Alliance in standardising phishing-resistant authentication has been fundamental to Mystere's approach to participant authentication.  
https://www.w3.org/TR/webauthn/

**Curve25519 — Daniel J. Bernstein**  
The elliptic curve used for all Diffie-Hellman operations in Mystere. Fast, safe by design (no secret branch conditions, no secret memory access patterns), and carefully chosen to avoid the class of weaknesses found in NIST curves.  
https://cr.yp.to/ecdh.html

**AES-GCM and HKDF — NIST / Hugo Krawczyk**  
AES-256-GCM for authenticated encryption and HKDF for key derivation — both well-understood, well-analysed, and available natively in the WebCrypto API without any additional dependencies.

**The Noise Protocol Framework — Trevor Perrin**  
Noise influenced Mystere's thinking about how to compose cryptographic handshakes from principled, composable building blocks rather than ad-hoc protocol design.  
https://noiseprotocol.org

**Shamir's Secret Sharing — Adi Shamir**  
The mathematical foundation for the v2.0 decentralised custodian pool. Shamir's 1979 paper remains one of the most elegant results in applied cryptography.

**FastAPI — Sebastián Ramírez**  
The relay and custodian servers are built on FastAPI. Clean, fast, async-native, and a joy to work with.  
https://fastapi.tiangolo.com

**React and the broader JavaScript ecosystem**  
The browser client is built with React and Vite, standing on the work of thousands of open source contributors.

**The broader cryptography research community**  
Every paper on forward secrecy, authenticated key exchange, threshold cryptography, and privacy-preserving protocols that has ever been published openly has contributed to the thinking behind Mystere. Science that is locked behind paywalls does not protect people. Science that is published openly does.

---
Please read `docs/SPEC.md` before opening a protocol issue. Most questions are answered there.

## Licence

Apache 2.0. See `LICENSE`.

You are free to use, modify, and distribute Mystere. If you build something with it, consider contributing improvements back. That is how this works.

---

<div align="center">

With regards to the community,
adwait bhardwaj 
vt-abt
jsk.

</div>
