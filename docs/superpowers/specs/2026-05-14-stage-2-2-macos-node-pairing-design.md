# Stage 2.2 — macOS Node Pairing Design Spec

**Date:** 2026-05-14
**Status:** Approved
**Author:** Raouf (Raoof999)
**Branch:** `stage-2-2-macos-node-pairing`
**Predecessor:** v0.4.1 Stage 2.1 macOS Integrity Proof Pipeline (on main)

---

## Mission

Bind one browser exam session to one macOS node public key. After pairing, subsequent integrity proofs are verified against the registered key and return `signature_status: "verified"` instead of `"unregistered_node"`. This is the jump from **crypto-valid** to **session-trusted**.

Stage 2.2 is explicitly **narrow**: pairing endpoints + registry + verified proof status. No localhost daemon, no browser SDK, no ScreenCaptureKit, no risk-score integration.

---

## Locked Design Decisions

| ID                    | Decision                                                                                    | Rationale                                      |
| --------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Scope**             | Narrow — pairing semantics only; transport stays manual (CLI + curl)                        | Prove pairing first, daemon comes in Stage 2.3 |
| **Crypto**            | Same Ed25519 / SPKI / canonical-JSON pipeline as Stage 2.1 (re-export the canonicaliser)    | Single source of truth for the wire format     |
| **State**             | In-memory only, evicts with session                                                         | Matches `integrityState.js` lifecycle          |
| **Immutability**      | Once paired, `paired_node_id_hash` + `paired_node_public_key` are immutable for the session | One session = one node (N1 strict)             |
| **Re-pairing**        | Forbidden in Stage 2.2 — `/challenge` AND `/complete` both reject 409 `node_already_paired` | Closes the swap-attack window                  |
| **Verification (E1)** | On paired proofs: hash match + public-key string match + signature with registered key      | Three explicit gates; reviewer-friendly        |
| **Backward compat**   | Stage 2.1 unpaired flow still works (returns `unregistered_node`)                           | No demo regression                             |
| **CLI**               | New `pair` subcommand; bare `--session` still means `proof`                                 | Forward-compatible CLI surface                 |
| **Rate limits**       | 10/min on `/challenge`, 20/min on `/complete` (per session token)                           | Light throttling matches Stage 1 hygiene       |

---

## Module Layout

### Server (new + updated)

```
src/integrity/
  pairingSchema.js         ← v1 pairing envelope constants + forbidden fields
  pairingCanonicalise.js   ← re-export of canonicaliseProofPayload as canonicalisePairingPayload
  pairingValidator.js      ← validatePairingProof(raw, { now, expectedSessionId })
  pairingRegistry.js       ← challenge state machine + paired-node store
  proofValidator.js        ← UPDATED: validateProof(raw, { now, pairedNode, expectedSessionId })
  proofSchema.js           ← unchanged
  proofCanonicalise.js     ← unchanged
  proofSignature.js        ← unchanged
  integrityState.js        ← unchanged
  nonceGuard.js            ← unchanged

src/academic/academicEvents.js
  ← 3 new constants: INTEGRITY_PAIRING_CHALLENGE_CREATED, INTEGRITY_NODE_PAIRED, INTEGRITY_PAIRING_REJECTED

server.js
  ← POST /api/integrity/pairing/challenge   (new, rate-limited)
  ← POST /api/integrity/pairing/complete    (new, rate-limited)
  ← POST /api/integrity/proofs              (UPDATED: looks up pairedNode, uses validator-returned signature_status)
  ← examEvictionTimer extended to call pairingRegistry.evictMissing(...)
```

### macOS node (new + updated)

```
tools/simurgh-node-macos/Sources/SimurghNode/
  main.swift               UPDATED — subcommand dispatch (proof | pair | --print-key-info)
  PairingEnvelope.swift    new — v1 pairing struct (8 fields, Encodable)
  PairingSigner.swift      new — canonicalise + Ed25519 sign + pretty stdout JSON
  ProofEnvelope.swift      unchanged
  ProofSigner.swift        unchanged
  NodeIdentity.swift       unchanged
```

### Tests

```
tests/unit/integrity/
  pairingSchema.test.js         new — constants and forbidden-field reuse
  pairingCanonicalise.test.js   new — re-export + golden fixture interop
  pairingValidator.test.js      new — ~22 reason codes
  pairingRegistry.test.js       new — ~16 state machine transitions
  proofValidator.test.js        UPDATED — adds paired-session cases
  __fixtures__/golden-pairing-payload.{json,sha256}   new

tools/simurgh-node-macos/Tests/SimurghNodeTests/
  PairingCanonicaliseTests.swift                       new
  Fixtures/golden-pairing-payload.{json,sha256}        new (synced copies)
```

Each module < 200 lines. Single responsibility per file.

---

## v1 Pairing Envelope

```json
{
  "version": "simurgh-pairing-proof-v1",
  "platform": "macos",
  "session_id": "sess_<hex>",
  "node_id_hash": "<64-char lowercase hex sha256 of public key>",
  "node_public_key": "<base64 standard, 32-byte Ed25519 key>",
  "challenge": "<base64 standard, 32-byte server-generated value>",
  "timestamp": "2026-05-14T00:00:00.000Z",
  "signature": "<base64 standard, 64-byte Ed25519 signature>"
}
```

### Field rules

| Field             | Type   | Rule                                                                                         |
| ----------------- | ------ | -------------------------------------------------------------------------------------------- |
| `version`         | string | must equal `"simurgh-pairing-proof-v1"` (distinct from proof v1)                             |
| `platform`        | string | must equal `"macos"`                                                                         |
| `session_id`      | string | `^[A-Za-z0-9_-]{1,64}$` AND matches `expectedSessionId` (route's session token)              |
| `node_id_hash`    | string | `^[0-9a-f]{64}$` AND equals `sha256(decode(node_public_key))`                                |
| `node_public_key` | string | base64-decodes to **exactly 32 bytes**                                                       |
| `challenge`       | string | base64-decodes to **exactly 32 bytes**; route+registry verify it equals the issued challenge |
| `timestamp`       | string | ISO-8601 UTC; within **30 s past** or **5 s future** of server clock                         |
| `signature`       | string | base64-decodes to **exactly 64 bytes**                                                       |

**Strict 8-key validation:** the envelope must contain _exactly_ these 8 top-level fields. Any extra key triggers `unknown_field:<name>`. Any missing key triggers `missing_field:<name>`.

### Forbidden top-level fields (rejection, not strip)

Same blocklist as proof: `screen_pixels`, `screenshot`, `screen_frame`, `screen_recording`, `webcam`, `webcam_frame`, `audio`, `microphone`, `microphone_audio`, `typed_answer`, `paste_content`, `face_embedding`, `window_title`, `process_name`, `raw_process_names`, `raw_window_titles`, `raw_student_name`, `student_name`, `hardware_serial`, `biometric`, `student_face`.

### Notable difference from proof envelope

The pairing envelope does **not** carry `capabilities`, `signals`, or `privacy_mode`. Pairing is identity binding, not state declaration. Capabilities/signals belong on every subsequent proof, not on the one-time pairing event.

### Canonical signing rule — reuse the proof canonicaliser

```js
// src/integrity/pairingCanonicalise.js
//
// Pairing payloads use the same canonical signing rules as integrity proof payloads:
// top-level `signature` stripped, keys lex-sorted at every depth, no whitespace,
// UTF-8 bytes. We re-export the proof helper rather than duplicate it — fewer
// places for the canonical wire format to drift between modules.
export { canonicaliseProofPayload as canonicalisePairingPayload } from "./proofCanonicalise.js";
```

Once a challenge is consumed by a successful `completePairing`, it cannot be reused: the registry clears its `pending` slot and refuses further submissions for that session.

---

## Pairing Registry State Machine

### Record shape

```js
{
  sessionId: "sess_abc",

  // Pending challenge — present after createChallenge, cleared on pairing success
  pending: {
    challenge:           "<base64, 32 bytes>",
    challenge_hash:      "<sha256(challenge_bytes), hex>",
    challenge_created_at: <number>,
    challenge_expires_at: <number>,
  } || null,

  // Paired node — set on first successful completePairing, IMMUTABLE thereafter
  paired: {
    node_id_hash:     "<hex>",
    node_public_key:  "<base64>",
    paired_at:         <number>,
  } || null,
}
```

### Transitions

```
       (no entry)
            │  createChallenge(sid)
            ▼
   pending = {…}, paired = null
            │
            ├── createChallenge(sid) again
            │   ─► REPLACES pending (legal only before pairing); paired must still be null
            │
            ├── completePairing(sid, payload) succeeds
            │   ─► pending = null, paired = {…}
            │
            └── eviction (TTL or session-level)
                ─► entry removed entirely

       paired = {…}, pending = null
            │
            ├── createChallenge(sid)      → REJECT node_already_paired
            ├── completePairing(sid, …)   → REJECT node_already_paired
            ├── getPairedNode(sid)         → returns { node_id_hash, node_public_key }
            └── eviction                   → entry removed entirely
```

### API

```js
createPairingRegistry({ challengeTtlMs = 60_000 } = {})

registry.createChallenge(sessionId, now = Date.now())
  → { ok: true, challenge, expires_at } | { ok: false, reason: "node_already_paired" }

registry.getChallenge(sessionId)                     // internal-only; never exposed via API
  → { challenge, expires_at } | null

registry.completePairing(sessionId, { challenge, node_id_hash, node_public_key }, now = Date.now())
  → { ok: true, paired_at } | { ok: false, reason: "challenge_not_found" | "challenge_expired" | "challenge_mismatch" | "node_already_paired" }

registry.getPairedNode(sessionId)
  → { node_id_hash, node_public_key, paired_at } | null

registry.isPaired(sessionId)
  → boolean

registry.evict(sessionId)
registry.evictMissing(activeSessionIds: Set)
registry.size()
```

`now` is injectable on `createChallenge` and `completePairing` for deterministic TTL testing.

### Lifecycle wiring in `server.js`

```js
const pairingRegistry = createPairingRegistry({ challengeTtlMs: 60_000 });

// Extend the existing examEvictionTimer callback:
const activeIds = new Set(sessions.keys());
integrityState.evictMissing(activeIds);
pairingRegistry.evictMissing(activeIds); // ← added
```

### What the registry does NOT do

- ❌ Verify signatures (validator's job)
- ❌ Parse base64 (validator's job)
- ❌ Decide HTTP status codes (route's job)
- ❌ Audit emission (route's job)

Pure state machine.

---

## API Endpoints

### `POST /api/integrity/pairing/challenge`

**Rate limit:** 10/min per session token.

**Request:**

```
POST /api/integrity/pairing/challenge
Authorization: Bearer <sessionToken>
Content-Type: application/json

{}
```

**Pipeline:**

```
1. requireSessionToken                                  → 401 token_*
2. sessions.get(sessionId) exists                        → 409 session_expired_or_evicted
3. registry.createChallenge(sessionId, Date.now())       → 409 node_already_paired
4. appendAudit(sess, INTEGRITY_PAIRING_CHALLENGE_CREATED, {
       challenge_hash, expires_at, platform: "macos"
   })
5. 200 OK
```

**Success response (200):**

```json
{
  "status": "challenge_created",
  "session_id": "sess_abc",
  "challenge": "<base64, 32 bytes>",
  "expires_at": "2026-05-14T00:01:00.000Z",
  "note": "Sign this challenge with the macOS Simurgh node and POST the result to /api/integrity/pairing/complete. Expires in 60 s; submit a new challenge request to replace before pairing."
}
```

Replacement of an unconsumed challenge is **not** a failure — `createChallenge` returns `{ ok: true }` and the route emits a fresh `INTEGRITY_PAIRING_CHALLENGE_CREATED` event with the new `challenge_hash`. The old challenge becomes unusable as soon as the new one replaces it in the `pending` slot.

---

### `POST /api/integrity/pairing/complete`

**Rate limit:** 20/min per session token.

**Request body:** the full v1 pairing envelope (8 fields above).

**Pipeline:**

```
1. requireSessionToken                                   → 401 token_*
2. sessions.get(sessionId) exists                         → 409 session_expired_or_evicted
3. Early bail-out: registry.isPaired(sessionId)           → 409 node_already_paired
                                                            (skips Ed25519 work on a session that cannot pair)
4. pairingValidator.validatePairingProof(req.body, {
       now: Date.now(),
       expectedSessionId: sessionId,
   })
     a. raw is plain object                              → 400 proof_not_an_object
     b. forbidden-field check                            → 400 forbidden_field:<name>
     c. exactly 8 top-level keys                         → 400 missing_field:<name> | unknown_field:<name>
     d. version === "simurgh-pairing-proof-v1"           → 400 unsupported_version
     e. platform === "macos"                              → 400 unsupported_platform
     f. session_id regex                                  → 400 invalid_session_id
     g. session_id === expectedSessionId                 → 401 proof_session_mismatch
     h. timestamp ISO-8601, ≤30s past, ≤5s future       → 400 pairing_stale / pairing_in_future
     i. node_public_key base64 → 32 bytes                → 400 invalid_public_key
     j. node_id_hash matches sha256(public_key bytes)    → 400 node_id_hash_mismatch
     k. challenge base64 → 32 bytes                       → 400 invalid_challenge_format
     l. signature base64 → 64 bytes                       → 400 invalid_signature_format
     m. canonicalisePairingPayload(raw) + verifyProofSignature(canonical, pub_key, sig)
                                                          → 401 invalid_signature
5. Cross-route N1 consistency check:
     existingIntegrity = integrityState.get(sessionId)
     if existingIntegrity?.bound_node_id_hash &&
        existingIntegrity.bound_node_id_hash !== payload.node_id_hash
                                                          → 409 node_id_hash_changed
6. registry.completePairing(sessionId, {
       challenge: payload.challenge,
       node_id_hash: payload.node_id_hash,
       node_public_key: payload.node_public_key,
   }, Date.now())                                         → 409 challenge_not_found / challenge_expired / challenge_mismatch / node_already_paired
7. appendAudit(sess, INTEGRITY_NODE_PAIRED, {
       node_id_hash, challenge_hash, platform: "macos", signature_status: "verified"
   })
8. 200 OK
```

**Success response (200):**

```json
{
  "status": "paired",
  "session_id": "sess_abc",
  "node_id_hash": "<hex>",
  "signature_status": "verified",
  "paired_at": "2026-05-14T00:00:01.234Z",
  "note": "Subsequent /api/integrity/proofs submissions for this session must be signed by the registered node and will return signature_status: verified."
}
```

### Failure-path audit payload

```json
INTEGRITY_PAIRING_REJECTED:
{
  "reason": "<reason code>",
  "node_id_hash_if_parsed": "<hex or null>",
  "challenge_hash_if_parsed": "<hex or null>",
  "has_signature": true | false
}
```

`*_if_parsed` fields are set only when the validator successfully decoded those values. Prevents attacker-controlled strings from entering the audit chain through malformed submissions.

### Reason code → HTTP status map

| Status | Codes                                                                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `400`  | `proof_not_an_object`, `forbidden_field:*`, `missing_field:*`, `unknown_field:*`, `unsupported_version`, `unsupported_platform`, `invalid_session_id`, `pairing_stale`, `pairing_in_future`, `invalid_public_key`, `node_id_hash_mismatch`, `invalid_challenge_format`, `invalid_signature_format` |
| `401`  | `session_token_required`, `proof_session_mismatch`, `invalid_signature`                                                                                                                                                                                                                            |
| `409`  | `session_expired_or_evicted`, `node_already_paired`, `challenge_not_found`, `challenge_expired`, `challenge_mismatch`, `node_id_hash_changed`                                                                                                                                                      |

---

## Proof Route Upgrade (Stage 2.1 → 2.2)

### Validator signature change

```js
// Stage 2.1
validateProof(raw, { now })  →  { ok, proof, reason }

// Stage 2.2
validateProof(raw, { now, pairedNode = null, expectedSessionId = null })
  →  { ok: true, proof, signature_status } | { ok: false, reason }
```

`pairedNode` is `null` or `{ node_id_hash, node_public_key, paired_at }` from `pairingRegistry.getPairedNode(sessionId)`.

`expectedSessionId` collapses the route's session-id-match check into the validator (used by both `validateProof` and `validatePairingProof` for symmetry).

### New validator paired-session checks (E1)

After existing schema/parsing checks succeed:

```
k1. proof.node_id_hash === pairedNode.node_id_hash
                                                     → 409 paired_node_mismatch
k2. proof.node_public_key === pairedNode.node_public_key   (exact string compare)
                                                     → 409 paired_public_key_mismatch
…canonicalise the proof…
if pairedNode:
    verify(canonical, decode(pairedNode.node_public_key), signature)
                                                     → 401 registered_signature_invalid
    → signature_status = "verified"
else:
    verify(canonical, decode(proof.node_public_key), signature)
                                                     → 401 invalid_signature
    → signature_status = "unregistered_node"
```

### Route change — `POST /api/integrity/proofs`

Two new lines plus reason-code dispatch:

```diff
   const sess = sessions.get(sessionId);
   if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });

-  const validation = validateProof(req.body, { now: Date.now() });
+  const pairedNode = pairingRegistry.getPairedNode(sessionId);
+  const validation = validateProof(req.body, {
+    now: Date.now(),
+    pairedNode,
+    expectedSessionId: sessionId,
+  });
   if (!validation.ok) {
     // ... existing rejection handling ...
     let status = 400;
     if (validation.reason === "invalid_signature") status = 401;
+    if (validation.reason === "registered_signature_invalid") status = 401;
     if (validation.reason === "proof_session_mismatch") status = 401;
+    if (validation.reason === "paired_node_mismatch") status = 409;
+    if (validation.reason === "paired_public_key_mismatch") status = 409;
     return res.status(status).json({ error: validation.reason });
   }
-  const { proof } = validation;
+  const { proof, signature_status } = validation;

   // ... nonceGuard, integrityState.record (unchanged) ...

   appendAudit(sess, EVENTS.INTEGRITY_PROOF_RECEIVED, {
     node_id_hash: proof.node_id_hash,
     nonce_hash: nonceHash,
-    signature_status: "unregistered_node",
+    signature_status,
     ...
   });

   res.status(202).json({
     ...
-    signature_status: "unregistered_node",
+    signature_status,
     ...
-    note: "Stage 2.1 scaffold: signature mathematically verified, node not yet paired. Pairing lands in Stage 2.2.",
+    note: signature_status === "verified"
+      ? "Signature verified against the node registered to this session."
+      : "Signature mathematically verified, node not yet paired. Submit /api/integrity/pairing/challenge to pair.",
   });
```

### Backward compatibility

Unpaired Stage 2.1 sessions still get `signature_status: "unregistered_node"`. The demo flow works without ever calling `/pairing/complete`.

### Audit payload changes

`INTEGRITY_PROOF_RECEIVED` shape unchanged. Only the value of `signature_status` varies (`"verified"` vs `"unregistered_node"`). Old audit chain entries remain parseable.

---

## macOS CLI

### Subcommand surface

```
swift run SimurghNode proof --session <ID>
swift run SimurghNode pair  --session <ID> --challenge <BASE64>
swift run SimurghNode --print-key-info
swift run SimurghNode --session <ID>              ← bare flag = proof (Stage 2.1 compat)
swift run SimurghNode --help
```

### Subcommand parsing rules (strict)

```
If args[1] starts with "-"   → proof mode (Stage 2.1 backward-compat path)
If args[1] == "proof"        → proof mode
If args[1] == "pair"          → pair mode (requires --challenge)
Any other args[1]            → exit 64 "unknown subcommand: <name>"
```

Typos like `prrof` exit 64; they do not silently fall through to proof mode.

### Pair flow

```
swift run SimurghNode pair --session sess_abc --challenge <base64>
  │
  ▼
1. Parse --session + --challenge (or env vars SIMURGH_SESSION_ID)
2. NodeIdentity.loadOrCreate(at: ~/.simurgh/node-key)
3. PairingEnvelope.build(sessionId, challenge, identity, timestamp: ISO8601(now))
4. canonical = canonicalisePairingPayload(envelope)
5. signature = identity.privateKey.signature(for: canonical)
6. Print pretty JSON of envelope + base64(signature) to stdout
7. exit 0
```

### Exit codes

| Code | Meaning                                |
| ---- | -------------------------------------- |
| `0`  | Proof or pairing JSON printed          |
| `1`  | Generic error                          |
| `2`  | Key file malformed                     |
| `3`  | Missing `--session`                    |
| `4`  | Missing `--challenge` (pair mode only) |
| `64` | Unknown CLI flag or subcommand         |

### What the CLI does NOT do

- ❌ Auto-POST to the server
- ❌ Open a localhost port
- ❌ ScreenCaptureKit / screen-recording permission
- ❌ Browser discovery

---

## Audit Events

### Three new constants

```js
INTEGRITY_PAIRING_CHALLENGE_CREATED;
INTEGRITY_NODE_PAIRED;
INTEGRITY_PAIRING_REJECTED;
```

### Success payloads

```json
INTEGRITY_PAIRING_CHALLENGE_CREATED:
{
  "challenge_hash": "<sha256(challenge_bytes), hex>",
  "expires_at": "<ISO>",
  "platform": "macos"
}

INTEGRITY_NODE_PAIRED:
{
  "node_id_hash": "<hex>",
  "challenge_hash": "<sha256(challenge_bytes), hex>",
  "platform": "macos",
  "signature_status": "verified"
}
```

### Failure payload

```json
INTEGRITY_PAIRING_REJECTED:
{
  "reason": "<reason code>",
  "node_id_hash_if_parsed": "<hex or null>",
  "challenge_hash_if_parsed": "<hex or null>",
  "has_signature": true | false
}
```

### Privacy invariant — explicit absence

Audit payloads for pairing events MUST NOT contain:

- Raw `challenge`
- Raw `node_public_key`
- Raw `signature`

A dedicated test asserts the absence of these fields in audit payloads.

---

## Test Plan

### New JS unit tests (`tests/unit/integrity/`)

| File                          | Approx tests                                             |
| ----------------------------- | -------------------------------------------------------- |
| `pairingSchema.test.js`       | 6                                                        |
| `pairingCanonicalise.test.js` | 2 (re-export reference + golden fixture interop)         |
| `pairingValidator.test.js`    | ~22 reason codes                                         |
| `pairingRegistry.test.js`     | ~16 state machine transitions (TTL via injectable `now`) |

### Updated tests

| File                     | Additions                                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proofValidator.test.js` | + paired happy path (verified); + `paired_node_mismatch`; + `paired_public_key_mismatch`; + `registered_signature_invalid`; + unpaired baseline preserved; + `expectedSessionId` mismatch |
| `academicEvents.test.js` | + 3 new constants in required list; + absence assertion (audit payloads do NOT contain `challenge`, `node_public_key`, `signature` keys)                                                  |

### Swift tests

| File                             | Tests                                                         |
| -------------------------------- | ------------------------------------------------------------- |
| `PairingCanonicaliseTests.swift` | 1 — golden-pairing-payload SHA-256 matches Node               |
| Optional CLI integration check   | `pair` stdout JSON has exactly 8 top-level keys (best-effort) |

### Golden fixture

```
tests/unit/integrity/__fixtures__/
  golden-pairing-payload.json    ← input (no signature)
  golden-pairing-payload.sha256  ← expected hex of canonical bytes

tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/
  golden-pairing-payload.json    ← Swift-side copy
  golden-pairing-payload.sha256  ← Swift-side copy
```

`scripts/check.sh` "Golden fixture sync" gate extended to cover both pairs.

### `scripts/check.sh` extensions (27 → 32 gates)

Four new server-side gates:

```
✓ Stage 2.2 pairing round-trip
    join → token → /pairing/challenge → sign payload → /pairing/complete →
    assert 200 + signature_status: "verified" + paired_at

✓ Stage 2.2 paired-session proof returns verified
    same session → submit valid proof signed by paired key →
    assert 202 + signature_status: "verified"

✓ Stage 2.2 paired-session rejects different node
    same session → submit proof signed by a DIFFERENT Ed25519 key →
    assert 409 paired_node_mismatch

✓ Stage 2.2 unpaired-session proof still returns unregistered_node
    fresh session → submit proof → assert 202 + signature_status: "unregistered_node"
```

Plus the existing fixture sync check expanded to cover both fixtures (no new gate, extended assertion).

Swift block adds `PairingCanonicaliseTests` and a pairing-mode CLI privacy regression (uses the valid 32-byte challenge `AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=` which decodes to 32 zero bytes).

---

## Documentation Updates

```
README.md                                — Stage 2.2 paragraph; new endpoints
docs/stages/STAGE_2_ARCHITECTURE.md             — clarify Stage 2.2 is manual/CLI; daemon is 2.3
docs/VALIDATION.md                        — pairing crypto + state + new endpoints
docs/RISK_REGISTER.md                     — pairing risk row (CLI-only)
tools/simurgh-node-macos/README.md       — `pair` subcommand + curl chain
AGENT.md, CHANGELOG.md                    — Stage 2.2 implementation entry
```

---

## Acceptance Criteria

Stage 2.2 is complete when:

1. ✅ `POST /pairing/challenge` issues a 32-byte CSPRNG challenge with 60 s TTL
2. ✅ `POST /pairing/complete` validates an Ed25519-signed pairing payload and stores the public key
3. ✅ Subsequent `/api/integrity/proofs` from the paired node return `signature_status: "verified"`
4. ✅ Proofs from a different `node_id_hash` are rejected with 409 `paired_node_mismatch`
5. ✅ Embedded `node_public_key` mismatch returns 409 `paired_public_key_mismatch`
6. ✅ Invalid signature on a paired proof returns 401 `registered_signature_invalid`
7. ✅ Unpaired-session proofs continue to return `signature_status: "unregistered_node"`
8. ✅ Pairing cannot be replaced (`/challenge` and `/complete` both reject 409 `node_already_paired`)
9. ✅ Cross-route N1 consistency: pairing rejected with 409 `node_id_hash_changed` if `integrityState.bound_node_id_hash` already differs
10. ✅ Pairing state evicts with session
11. ✅ Golden pairing fixture matches in Node and Swift (SHA-256 byte-equality)
12. ✅ Audit payloads contain no raw challenge / public key / signature
13. ✅ Rate limits: 10/min on `/challenge`, 20/min on `/complete`
14. ✅ Unknown CLI subcommand exits 64 (no silent fallthrough)
15. ✅ `./scripts/check.sh` → 32/32 gates pass
16. ✅ `npm test` passes (target ≈ 200 tests)
17. ✅ `swift build` + `swift test` pass on macOS
18. ✅ `npm audit` → 0 high/critical
19. ✅ GitHub Actions CI green

---

## Explicit Non-Claims

Stage 2.2 does **not** claim:

- Production device trust
- Hardware-rooted attestation
- Localhost daemon transport
- Browser SDK discovery
- ScreenCaptureKit scanning
- Window enumeration
- Helper bridge through node
- Risk-score integration
- Malware resistance
- Kernel-compromise resistance

These are explicit deferrals for Stages 2.3 / 2.4 / 2.5 / 2.x and Stage 4.

---

## Follow-up Stages

- **Stage 2.3** — localhost daemon (Swift HTTP server on `127.0.0.1`) for proof + pair endpoints
- **Stage 2.4** — browser SDK discovery and pairing automation
- **Stage 2.5** — ScreenCaptureKit capability scan; capabilities + signals start carrying real values
- **Stage 2.6** — helper bridge through the node
- **Stage 2.x** — `INTEGRITY_NODE_STALE` emitter, risk-score integration, persistent pairing across server restarts
