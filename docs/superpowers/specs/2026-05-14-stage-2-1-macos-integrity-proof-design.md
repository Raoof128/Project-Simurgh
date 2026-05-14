# Stage 2.1 — macOS CLI Integrity Proof Pipeline Design Spec

**Date:** 2026-05-14
**Status:** Approved
**Author:** Raouf (Raoof999)
**Branch:** `stage-2-integrity-node`
**Predecessor:** v0.4.0 Stage 2.0 scaffold (already on this branch — will be refactored, not extended)

---

## Mission

Prove the Stage 2 cryptographic trust loop end-to-end: a macOS Integrity Node generates an Ed25519 keypair, signs a privacy-preserving v1 proof envelope, and the Simurgh server validates the signature + structure before recording it in the tamper-evident audit chain. No daemon, no port, no screen-recording permission, no content collection — only the signing/verification handshake.

This is **Stage 2.1**. Pairing (browser ↔ node), risk-score integration, ScreenCaptureKit scanning, and packaging are explicitly later milestones.

---

## Design Decisions Locked

| ID | Choice | Rationale |
|---|---|---|
| **A** | Refactor Stage 2.0 scaffold to the v1 envelope (no parallel schemas) | Clean contract, no prototype drift |
| **B2** | Ed25519 / Curve25519.Signing per-node keypair | Real Stage 2 trust shape; both stdlibs native |
| **D1** | CLI proof generator on macOS (no daemon, no permissions) | Stage 2.1 proves the contract, not the transport |
| **N1** | Strict node continuity — first proof binds `node_id_hash` for the session | One session = one node; node-swap rejected |

Stage 2.1 transitional posture: `signature_status: "unregistered_node"` for every accepted proof until pairing registry lands in Stage 2.2.

---

## Module Layout

### Server (`src/integrity/`)

```
src/integrity/
  proofSchema.js          ← constants, allowed values, forbidden fields, required fields
  proofCanonicalise.js    ← canonicaliseProofPayload() — sorted-key, no-whitespace JSON
  proofValidator.js       ← validateProof() — orchestrates schema + signature + state
  proofSignature.js       ← Ed25519 verify + sha256(public_key) → node_id_hash
  nonceGuard.js           ← per-session nonce TTL replay protection (existing, simplified)
  integrityState.js       ← per-session integrity record with N1 continuity
```

### Server changes outside `src/integrity/`

- `server.js` — `POST /api/integrity/proofs` route refactored to use the v1 pipeline
- `src/academic/academicEvents.js` — `INTEGRITY_NODE_STALE` constant added (defined but not emitted in 2.1; reserved for Stage 2.x staleness checker)

### macOS node (`tools/simurgh-node-macos/`)

```
tools/simurgh-node-macos/
  README.md               ← purpose, privacy boundaries, build/run, curl example
  Package.swift           ← single executable target, no external deps
  .gitignore              ← .build/
  Sources/SimurghNode/
    main.swift            ← CLI entry: parse flags, generate/load key, build + sign proof, print
    NodeIdentity.swift    ← keypair load-or-create at ~/.simurgh/node-key, derive node_id_hash
    ProofSigner.swift     ← canonicaliseProofPayload() (Swift) + Ed25519 sign
    ProofEnvelope.swift   ← v1 struct + Encodable conformance
  Tests/SimurghNodeTests/
    CanonicaliseTests.swift  ← golden-fixture interop test with Node
```

Each module < 150 lines. Single responsibility per file.

---

## v1 Proof Envelope

```json
{
  "version": "simurgh-integrity-proof-v1",
  "platform": "macos",
  "session_id": "sess_<hex>",
  "node_id_hash": "<64-char lowercase hex sha256 of public key>",
  "node_public_key": "<base64 standard, 44 chars for 32-byte Ed25519 key>",
  "nonce": "<base64 standard, 16 bytes random → 24 chars>",
  "timestamp": "2026-05-14T00:00:00.000Z",
  "capabilities": {
    "screencapturekit_available": false,
    "window_enumeration": false,
    "sharing_state_scan": false,
    "helper_bridge": false
  },
  "signals": {
    "node_uptime_ms": 0,
    "window_count": 0,
    "capture_excluded_window_count": 0,
    "helper_status": "not_configured"
  },
  "privacy_mode": "metadata_only",
  "signature": "<base64 standard, 88 chars for 64-byte Ed25519 signature>"
}
```

### Field rules

| Field | Type | Rule |
|---|---|---|
| `version` | string | must equal `"simurgh-integrity-proof-v1"` |
| `platform` | string | must equal `"macos"` (Stage 2.1) |
| `session_id` | string | `^[A-Za-z0-9_-]{1,64}$` AND matches `req.sessionTokenSessionId` |
| `node_id_hash` | string | `^[0-9a-f]{64}$` AND equals `sha256(decode(node_public_key))` |
| `node_public_key` | string | base64 → exactly 32 bytes |
| `nonce` | string | base64 → 12 to 64 bytes |
| `timestamp` | string | ISO-8601 UTC; within **30s past** or **5s future** of server clock |
| `capabilities` | object | exactly the four boolean keys above |
| `signals` | object | exactly the four typed keys above (3 non-negative integers + `helper_status` enum: `connected` / `stale` / `not_configured`) |
| `privacy_mode` | string | must equal `"metadata_only"` |
| `signature` | string | base64 → exactly 64 bytes |

### Forbidden top-level fields (rejection, not strip)

`screen_pixels`, `screenshot`, `screen_frame`, `screen_recording`, `webcam`, `webcam_frame`, `audio`, `microphone`, `microphone_audio`, `typed_answer`, `paste_content`, `face_embedding`, `window_title`, `process_name`, `raw_process_names`, `raw_window_titles`, `raw_student_name`, `student_name`, `hardware_serial`, `biometric`, `student_face`.

---

## Canonical Signing Rule

The function `canonicaliseProofPayload(proof)` produces the **exact byte sequence** that gets signed:

1. Copy input; remove the **top-level** `signature` field only (nested `signature` keys, if any exist, are preserved).
2. For any plain object, emit keys in lexicographic UTF-16 order (recursive).
3. For arrays, preserve insertion order.
4. For primitives, use standard JSON encoding (integers stay integers; no `.0` suffix).
5. No whitespace — `{"a":1,"b":[2,3]}` not `{ "a": 1, "b": [2, 3] }`.
6. UTF-8 encode the resulting string.

### Cross-implementation guarantee

- **Node.js** — handwritten recursive function (built-in `JSON.stringify` does not sort).
- **Swift** — `JSONEncoder` with `outputFormatting = [.sortedKeys, .withoutEscapingSlashes]` plus a top-level transform that drops `signature` before encoding.

The **golden fixture test** (`tests/unit/integrity/__fixtures__/golden-proof.json` + `golden-proof.sha256`) is loaded by both the JS canonicaliser test and the Swift canonicaliser test. Both must produce identical canonical bytes whose SHA-256 matches the fixture file. If either side drifts, the test fails on that side immediately.

---

## Server Validation Flow

```
POST /api/integrity/proofs
  │
  ▼
 1. requireSessionToken middleware
      Bearer token verified; req.sessionTokenSessionId set
      FAIL → 401 token_*
  │
  ▼
 2. sessions.get(sessionTokenSessionId) must exist
      FAIL → 409 session_expired_or_evicted
      (Integrity proofs require an active session — no implicit resurrection)
  │
  ▼
 3. proofValidator.validateProof(req.body, { now: Date.now() })
      a. forbidden-field check                          → 400 forbidden_field:<name>
      b. required-field presence + correct types        → 400 missing_field:<name>
      c. version === "simurgh-integrity-proof-v1"       → 400 unsupported_version
      d. platform === "macos"                            → 400 unsupported_platform
      e. privacy_mode === "metadata_only"                → 400 invalid_privacy_mode
      f. session_id regex + matches req.sessionTokenSessionId
                                                         → 401 proof_session_mismatch
      g. timestamp ISO-8601, ≤30s past, ≤5s future      → 400 proof_stale / proof_in_future
      h. capabilities = exactly the 4 boolean keys      → 400 invalid_capabilities
      i. signals = exactly the 4 typed keys             → 400 invalid_signals
      j. node_public_key base64 → 32 bytes              → 400 invalid_public_key
      k. node_id_hash matches sha256(public_key bytes)  → 400 node_id_hash_mismatch
      l. signature base64 → 64 bytes                    → 400 invalid_signature_format
      m. canonical = canonicaliseProofPayload(proof)
      n. crypto.verify(null, canonical, publicKeyObject, signature)
                                                         → 401 invalid_signature
  │
  ▼
 4. nonceGuard.check(nonce, sessionId)                  → 409 nonce_replayed
  │
  ▼
 5. integrityState.record(sessionId, proof)
      First proof: set bound_node_id_hash = proof.node_id_hash
      Later proof with same hash: update last_*, increment proof_count
      Later proof with different hash:                  → 409 node_id_hash_changed
  │
  ▼
 6. Stage 2.1 signature_status = "unregistered_node" (always)
      (Stage 2.2 will replace this with a pairing-registry lookup)
  │
  ▼
 7. appendAudit(sess, EVENTS.INTEGRITY_PROOF_RECEIVED, {
        node_id_hash, nonce_hash: sha256(nonce_bytes), signature_status,
        platform, version,
        capability_summary, signal_summary
    })
  │
  ▼
 8. 202 Accepted JSON receipt
```

### Failure path

On any rejection in steps 2–5, append `EVENTS.INTEGRITY_PROOF_REJECTED` to the audit chain with a **minimal privacy-safe payload**:

```json
{
  "reason": "<reason code>",
  "node_id_hash_if_parsed": "<hex or null>",
  "has_signature": true
}
```

`node_id_hash_if_parsed` is set only if the hash field passed regex AND the public key parsed. Prevents attacker-controlled strings entering the audit chain via malformed submissions.

### Response shape (success)

```json
{
  "status": "accepted",
  "session_id": "sess_abc",
  "nonce": "<echoed>",
  "node_id_hash": "<echoed>",
  "signature_status": "unregistered_node",
  "platform": "macos",
  "received_at": "2026-05-14T00:00:01.234Z",
  "note": "Stage 2.1 scaffold: signature mathematically verified, node not yet paired. Pairing lands in Stage 2.2."
}
```

---

## Per-Session Integrity State (`integrityState.js`)

A Map keyed by `sessionId`. Same lifecycle as `examSessions` — cleaned up when the underlying telemetry session evicts.

**Record shape:**

```js
{
  sessionId: "sess_abc",
  bound_node_id_hash: "<hex>",        // SET ON FIRST PROOF, immutable
  last_proof_received_at: 1778932156000,
  last_node_id_hash: "<hex>",          // always equals bound for accepted proofs
  last_signature_status: "unregistered_node",
  last_capabilities: { ... },
  last_signals: { ... },
  proof_count: 1
}
```

**API:** `record(sessionId, proof)`, `get(sessionId)`, `evict(sessionId)`, `evictMissing(activeSessionIds: Set)`, `size()`.

The existing `examEvictionTimer` (5-min interval) extends its callback to also call `integrityState.evictMissing(new Set(sessions.keys()))` so the integrity record never outlives its session.

**N1 continuity rule** (in `record`):

```
if !state.bound_node_id_hash:
  state.bound_node_id_hash = proof.node_id_hash
  return { ok: true }
elif state.bound_node_id_hash === proof.node_id_hash:
  update state.last_*
  return { ok: true }
else:
  return { ok: false, reason: "node_id_hash_changed" }
```

`bound_node_id_hash` is never overwritten.

---

## Audit Events

Three constants on `EVENTS` in `src/academic/academicEvents.js`:

| Constant | Emitted in 2.1? | Notes |
|---|---|---|
| `INTEGRITY_PROOF_RECEIVED` | ✅ Yes | Already exists from Stage 2.0; payload format finalised below |
| `INTEGRITY_PROOF_REJECTED` | ✅ Yes | Already exists from Stage 2.0; payload format finalised below |
| `INTEGRITY_NODE_STALE` | ❌ No | New constant. Defined to lock the audit-chain wire format; emitted by Stage 2.x staleness checker. |

### `INTEGRITY_PROOF_RECEIVED` payload

```json
{
  "node_id_hash": "<hex>",
  "nonce_hash": "<sha256(nonce_bytes), hex>",
  "signature_status": "unregistered_node",
  "platform": "macos",
  "version": "simurgh-integrity-proof-v1",
  "capability_summary": {
    "screencapturekit_available": false,
    "window_enumeration": false,
    "sharing_state_scan": false,
    "helper_bridge": false
  },
  "signal_summary": {
    "capture_excluded_window_count": 0,
    "helper_status": "not_configured"
  }
}
```

Explicitly excluded: raw nonce, raw public key, raw signature, `node_uptime_ms`, `window_count`.

### `INTEGRITY_PROOF_REJECTED` payload

```json
{
  "reason": "<validator reason code>",
  "node_id_hash_if_parsed": "<hex or null>",
  "has_signature": true
}
```

---

## macOS CLI Behaviour

### Keypair lifecycle

- **Location:** `~/.simurgh/node-key`. Override with `--key-path <path>` or `SIMURGH_NODE_KEY_PATH` env.
- **Format:** single-line base64 of the Curve25519 private key **raw representation** (32 bytes).
- **Permissions:** file `0600`, directory `0700`.
- **First run:** generate via `Curve25519.Signing.PrivateKey()`, write `rawRepresentation` to disk, set perms, print one-time warning to stderr.
- **Subsequent runs:** read, base64-decode, validate length is 32 bytes, reconstruct via `Curve25519.Signing.PrivateKey(rawRepresentation:)`.
- **Malformed key file:** exit code `2` with stderr error. **No auto-regenerate** — silent regeneration would mask key loss.

### CLI surface

```
swift run SimurghNode [options]

OPTIONS
  --session <ID>             Session ID (required unless SIMURGH_SESSION_ID is set)
  --key-path <path>          Override key file location
  --print-key-info           Print { node_id_hash, node_public_key, key_path } and exit
  --help                     Show usage

ENVIRONMENT
  SIMURGH_SESSION_ID         Same as --session
  SIMURGH_NODE_KEY_PATH      Same as --key-path
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Proof printed successfully |
| `1` | Generic error |
| `2` | Key file malformed |
| `3` | Missing required `--session` and no env var |
| `64` | Unknown CLI flag |

### stdout vs stderr

- **stdout** — ONLY the signed proof JSON, pretty-printed (sorted keys, indented). Pipeable to `curl --data @-`.
- **stderr** — all diagnostic messages, including the first-run privacy warning.

### Stage 2.1 capability/signal values (hard-coded)

```swift
capabilities = {
  screencapturekit_available: false,   // not probed; avoids permission prompt
  window_enumeration: false,
  sharing_state_scan: false,
  helper_bridge: false
}

signals = {
  node_uptime_ms: Int((Date.now - processStartTime) * 1000),
  window_count: 0,
  capture_excluded_window_count: 0,
  helper_status: "not_configured"
}
```

### Nonce + timestamp generation

- **Nonce:** 16 bytes from `SecRandomCopyBytes(kSecRandomDefault, ...)` → standard base64.
- **Timestamp:** `Date()` formatted via `ISO8601DateFormatter` with `[.withInternetDateTime, .withFractionalSeconds]` and `TimeZone(secondsFromGMT: 0)`. Target: `2026-05-14T00:00:00.000Z`.

### First-run warning (stderr)

```
[simurgh-node] WARNING:
[simurgh-node] - This is a development identity key.
[simurgh-node] - It is not hardware-backed attestation.
[simurgh-node] - Stage 2.1 does not enumerate windows, request screen recording,
[simurgh-node]   or collect any device content.
[simurgh-node] - Pairing with the Simurgh server is not yet implemented (Stage 2.2).
```

### README screenshot warning

The README must include: *"Redact `key_path` before sharing screenshots or logs publicly — it contains your local username."*

---

## Test Plan

### JS unit tests (`tests/unit/integrity/`)

| File | Tests |
|---|---|
| `proofCanonicalise.test.js` (new) | top-level keys lex-sorted; nested keys lex-sorted; array order preserved; top-level `signature` excluded; nested `signature` key preserved; no whitespace; integers stay integers; empty object/array handled; **golden-fixture SHA-256 matches `golden-proof.sha256`** |
| `proofSignature.test.js` (new) | `computeNodeIdHash(pubKey)` matches `crypto.createHash('sha256')`; round-trip signature verifies; tampered canonical fails; wrong public key fails; non-64-byte signature rejected |
| `proofValidator.test.js` (new, ~25 cases) | every reason code from Section 3 — generates real Ed25519 pair in-test, signs canonical, asserts pass/fail |
| `proofSchema.test.js` (rewrite of existing) | v1 constants present; forbidden-field list complete; capability/signal key sets exact |
| `nonceGuard.test.js` (existing, simplify) | drop `nonce_session_mismatch`; keep replay + per-session isolation |
| `integrityState.test.js` (new) | first record sets `bound_node_id_hash`; same hash updates last_* and increments `proof_count`; preserves bound hash; different hash returns `node_id_hash_changed`; `evict` removes record; `evictMissing(Set)` removes records absent from set |

### Golden fixture (`tests/unit/integrity/__fixtures__/`)

```
golden-proof.json        ← canonical input (no signature field)
golden-proof.sha256      ← expected hex SHA-256 of canonical bytes
```

Loaded by both `proofCanonicalise.test.js` (Node) and `CanonicaliseTests.swift` (Swift). Both must match.

### Swift test (`tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift`)

A single test asserting Swift's `canonicaliseProofPayload()` produces the same SHA-256 as `golden-proof.sha256`.

### CLI output privacy regression

Add to `scripts/check.sh` privacy guard: when Swift is available, run `swift run SimurghNode --session test_session --key-path /tmp/test-key 2>/dev/null` and assert the stdout JSON contains none of: `private_key`, `raw_process_names`, `raw_window_titles`, `screen_pixels`, `webcam`, `audio`, `typed_answer`, `paste_content`.

### Server smoke (extends `scripts/check.sh` server-boot block)

```
1. Create exam, join session, get sessionToken (existing flow)
2. Generate Ed25519 keypair in Node
3. Build v1 proof, canonicalise, sign with Ed25519
4. POST /api/integrity/proofs with Authorization: Bearer <sessionToken>
5. Assert 202 + body.signature_status === "unregistered_node"

Negative:
6. POST same payload with zeroed signature → assert 401 invalid_signature
```

### Swift build is conditional

`scripts/check.sh` checks for the `swift` binary AND the `tools/simurgh-node-macos/` directory. If both exist: `swift build` + `swift test`. Otherwise: print a clear "Swift toolchain not available — skipping macOS node build/test" message and pass. GitHub Actions (Ubuntu) does **not** install Swift, so the Swift step skips in CI by design.

### Total

| Suite | Tests |
|---|---|
| Existing (after refactor) | ~70 (Stage 1 + integrity tests preserved or rewritten) |
| New Stage 2.1 | ~60 |
| **Total target** | **~130 tests** |

Plus 2 new gates in `scripts/check.sh` (signature round-trip + CLI output privacy), bringing the quality gate from 21 → **23 gates**.

---

## What This Does NOT Claim

- ❌ Hardware-rooted attestation
- ❌ Production device trust
- ❌ Pairing / registry binding (Stage 2.2)
- ❌ Screen recording, window enumeration, or process scanning
- ❌ Risk-score integration (the proof is recorded but does not yet influence the Stage 1 score)
- ❌ Replacement of `/api/affinity` helper path

These are explicit deferrals with named follow-up milestones.

---

## Acceptance

Stage 2.1 is complete when:

1. ✅ A v1 proof generated by `swift run SimurghNode` is accepted by `POST /api/integrity/proofs` with `signature_status: "unregistered_node"`
2. ✅ `proofValidator` rejects every reason code in Section 3 (~25 test cases)
3. ✅ Golden fixture SHA-256 matches in both Node and Swift implementations
4. ✅ N1 strict continuity blocks any second-proof attempt with a different `node_id_hash`
5. ✅ Nonce replay blocks duplicate submissions
6. ✅ Audit chain contains `INTEGRITY_PROOF_RECEIVED` for accepted proofs and `INTEGRITY_PROOF_REJECTED` for failures (with minimal payloads)
7. ✅ No forbidden field appears in the CLI's stdout (privacy regression check)
8. ✅ `./scripts/check.sh` → 23/23 gates pass
9. ✅ `npm audit` → 0 high/critical
10. ✅ GitHub Actions CI green on the branch

---

## Follow-ups (out of scope)

- **Stage 2.2** — pairing endpoints (`/api/integrity/pairing/challenge`, `/api/integrity/pairing/complete`), localhost HTTP daemon in the Swift node, `signature_status: "verified"` once registered
- **Stage 2.3** — ScreenCaptureKit capability probing, window enumeration with hashed metadata
- **Stage 2.4** — helper bridge through the node
- **Stage 2.5** — Developer-ID signed + notarised app packaging
- **Stage 2.x** — `INTEGRITY_NODE_STALE` emitter, risk-score integration
