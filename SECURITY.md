# Security Policy

## This Is a Cryptographic Protocol

Mystere is not a typical application with a security policy that says
"please email us before tweeting about it." It is a cryptographic messaging
protocol where a flaw in the threat model, the mathematical construction,
or the implementation could silently fail to protect people who are depending
on it.

If you have found something wrong, this document tells you what to do.
Read all of it before doing anything.

---

## What Counts as a Security Issue

Not everything is a security issue. Here is the distinction:

### Is a security issue

- A flaw in the 3-of-3 XOR threshold scheme that allows reconstruction
  from fewer than 3 shares
- A flaw in the GF(2^8) Shamir implementation that weakens the
  information-theoretic security of the split
- A bypass of the WebAuthn UV flag check that allows fragment retrieval
  without biometric verification
- A flaw in the mutual session commitment that allows session_id
  forgery or session substitution
- A flaw in the Double Ratchet or X3DH integration that breaks
  forward secrecy or break-in recovery
- A way for the relay server to learn custodian node URLs
- A way for any custodian node to learn user identity
- A way for an attacker with M-1 Shamir shards to extract information
  about the secret
- A memory disclosure vulnerability that exposes raw key bytes
  from the WebCrypto layer to JavaScript
- A capability token derivation flaw that allows token prediction
  or forgery without root_key access
- A session state machine bypass that allows FROZEN state to be avoided
  after a cryptographic inconsistency
- A DNA complement key derivation flaw that allows ciphertext
  recovery without root_key (this affects obfuscation, not AES security,
  but is still a protocol flaw)
- Any property that causes Mystere to claim a guarantee it does not
  actually provide

### Is NOT a security issue (but still open an issue)

- UI bugs, performance problems, crashes
- Missing features from the roadmap
- Documentation errors
- Test failures that do not affect production security properties
- DNA encoding bugs that cause data loss but do not weaken AES-256-GCM
- Custodian availability issues (DoS against nodes) — these affect
  usability, not the cryptographic guarantees

---

## Scope: What Mystere Claims and Does Not Claim

Before reporting a vulnerability, verify that it affects a property
Mystere actually claims. The full list of claims is in `docs/SPEC.md`.
The summary is:

**Mystere claims:**
- No subset of {share_x, share_y, share_custodian} reconstructs M_key
- Physical device access + PIN cannot produce a valid WebAuthn assertion
  without biometric
- The relay server learns no key material and no custodian URLs
- Each custodian node learns no user identity
- The session state machine distinguishes network failures from
  cryptographic failures
- Past rotation windows are irrecoverable after grace window expiry

**Mystere explicitly does not claim:**
- Protection against simultaneous concurrent compromise of all three
  trust domains within one rotation window
- Offline message reading
- Protection against a fully compromised OS that intercepts WebAuthn
  at the API level before hardware processes it
- Formal security proofs (these are a post-v1 goal, not a current claim)
- Group messaging security (not implemented)
- Multi-device security (not implemented)

A report demonstrating that "both devices being simultaneously and
fully compromised allows message decryption" is not a vulnerability —
it is a documented non-goal.

---

## How to Report

### For protocol-level issues (threat model, mathematics, cryptographic construction)

Open a GitHub issue with the label `security: protocol`.

Protocol issues are architectural. They do not require private disclosure
because fixing them requires public discussion, spec revision, and often
a breaking protocol change. The sooner the community sees the problem,
the sooner it gets fixed.

Include:
- Which property is violated (reference the claim from `docs/SPEC.md`)
- A concrete description of the attack or flaw
- A worked example if the flaw involves mathematics (show the calculation)
- Whether you believe the flaw affects v1.0, v2.0, or both

### For implementation-level issues (code bugs that break a protocol property)

If the flaw is in the code and not the protocol design, and if publishing
it immediately would give an active attacker a useful advantage before
a patch is deployed, use private disclosure:

**Email:** security@[project domain, to be set up before v1.0 release]

**Subject line:** `Mystere Security Report: [one sentence description]`

Include:
- Affected version (which release tag or commit hash)
- Which component (relay, custodian-node, client crypto layer, etc.)
- A description of the vulnerability
- Steps to reproduce or a proof of concept
- Your assessment of exploitability
- Whether you want credit in the disclosure, and if so, how

You will receive an acknowledgement within 72 hours.
You will receive a status update within 14 days.

### Coordinated disclosure timeline

- **Day 0:** Report received, acknowledged within 72 hours
- **Day 14:** Status update — confirmed, disputed, or needs more info
- **Day 60:** Fix deployed (or timeline revised with your agreement)
- **Day 67:** Public disclosure — a GitHub Security Advisory is published
  crediting you (if you want credit) and describing the fix

If 60 days is not enough for the fix, we will negotiate an extension
with you before the deadline. We will not go past 90 days without your
explicit agreement to an extended timeline.

If you want to disclose earlier, that is your right. We ask only that
you give us enough notice to prepare a public response.

---

## What We Will Do

- Acknowledge your report promptly
- Not ask you to keep it secret indefinitely
- Credit you in the public disclosure if you want credit
- Not take legal action against good-faith security research
- Fix confirmed issues before public disclosure
- Publish a clear, honest account of what the vulnerability was and
  how it was fixed

---

## What We Ask of You

- Give us reasonable time to fix confirmed issues before public disclosure
- Do not test against production systems or other users' data
- Do not exploit a vulnerability beyond what is necessary to demonstrate it
- Include enough detail that we can reproduce and confirm the issue

---

## Cryptographic Implementation Notes for Researchers

If you are auditing the cryptographic implementation, these are the
areas most worth your time:

**Highest priority:**

1. **GF(2^8) field arithmetic** in `custodian-node/app/shamir/gf256.py`
   and `client/src/crypto/shamir.js`. The irreducible polynomial must
   be `x^8 + x^4 + x^3 + x + 1` (0x11B). The log/antilog tables must
   be built from generator `g=3`. Any error here silently weakens the
   Shamir scheme.

2. **Shamir x_index convention** — indices must be 1..N, never 0.
   Index 0 is the secret. Passing index 0 as a share index to Lagrange
   reconstruction produces the secret directly without the other shares.

3. **WebAuthn UV flag verification** in `relay/app/routes/ws.py` and
   `custodian-node/app/auth/webauthn.py`. The UV bit is bit 2 (0x04)
   of `authenticatorData[32]`. If this check is absent or wrong,
   PIN bypasses biometric gating on fragment release.

4. **session_id in AAD** — every `crypto.subtle.encrypt` call must
   include `session_id` in `additionalData`. Missing session_id in
   AAD allows ciphertext from one session to be replayed into another.

5. **extractable: false** on all CryptoKey creation. Search the codebase
   for `extractable:` — every occurrence should be `false`. Any `true`
   means raw key bytes are accessible via `exportKey()`.

6. **Capability token storage_key** computation in `custodian-pool.js`:
   `storage_key = SHA-256(capability_token || message_id || node_index)`.
   If `node_index` is missing, shards from different nodes share a key
   namespace, enabling cross-node confusion attacks.

7. **Lagrange interpolation at x=0** — the formula evaluates `f(0)`.
   In GF(2^8), subtraction is XOR. `(0 - x_j) = x_j`. If an
   implementation uses `(0 ^ x_j)` for the numerator, that is correct.
   If it uses `x_j - 0 = x_j`, that is also correct. If it uses
   `0 - x_j` in a non-GF context (e.g., integer arithmetic), that
   would produce wrong results without failing visibly.

**Lower priority but worth checking:**

- Rotation jitter `k` derivation — should be from `root_key` via HKDF,
  never transmitted, different per session. If `k` is predictable or
  constant, an attacker can anticipate rotation timing.
- Decoy traffic rate derivation — same requirement as jitter `k`.
- Tombstone signature verification — a valid tombstone must not trigger
  the FROZEN state. A missing or invalid tombstone should escalate
  through the state machine, not be silently dropped.
- One-time prekey consumption — must use `SELECT ... FOR UPDATE SKIP LOCKED`
  in PostgreSQL. Without this, two simultaneous session initiations can
  consume the same prekey, breaking forward secrecy for one of them.

---

## Threat Model Reference

The full threat model is in `docs/SPEC.md`, Section 3.
The short version for security researchers:

The system is designed so that all three of the following must be
simultaneously and concurrently true within one jitter-randomized
rotation window for an attacker to decrypt any message:

1. X's device is compromised and X's WebAuthn credential is usable
   (requires X's biometric or hardware compromise)
2. Y's device is compromised and Y's WebAuthn credential is usable
   (requires Y's biometric or hardware compromise)
3. M-of-N custodian nodes are compromised or compelled

A report showing that any one of these three is insufficient to decrypt
a message is a confirmation that the system works as designed, not a
vulnerability.

A report showing that fewer than all three are required to decrypt
a message is a critical vulnerability.

---

## Version Support (Deprecated section - version planning is being redone)

| Version | Status | Security fixes |
|---|---|---|
| v2.x (current) | Active development | Yes |
| v1.x | Previous | Critical fixes only |
| v0.x | Beta / development | No |

Security fixes for v1.x will be backported only for vulnerabilities
that are critical and actively exploitable. Protocol-level issues
that require a redesign will be fixed in v2 only.

---

## Acknowledgements

Security researchers who have responsibly disclosed issues will be
credited here (with their permission) after public disclosure.

*None yet — Mystere is in active development.*

---

## A Note on Scope Creep in Security Reports

Mystere makes specific, bounded claims. It does not claim to protect
against a state-level attacker with unlimited resources who can compel
all participants simultaneously. It does not claim to protect against
a fully compromised hardware supply chain. It does not claim to be
unbreakable.

What it claims is that the bar for reading stored messages is
significantly higher than any existing production messenger. A report
that says "if you compromise everything, you can read the messages" is
not a vulnerability. A report that says "you can read messages by
compromising less than the stated requirements" is.

We take the second kind very seriously. We appreciate the first kind
being framed as a design discussion rather than a vulnerability report.
