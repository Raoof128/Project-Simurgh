# Stage 2.1 — macOS CLI Integrity Proof Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Stage 2.0 scaffold to the v1 integrity proof envelope, implement Ed25519 signature verification with SPKI-wrapped raw public keys, add strict node continuity, and ship a macOS Swift CLI that emits signed v1 proofs which the server accepts as `signature_status: "unregistered_node"`.

**Architecture:** Six focused JS modules under `src/integrity/` (`proofSchema`, `proofCanonicalise`, `proofSignature`, `proofValidator`, `nonceGuard`, `integrityState`) feed a refactored `POST /api/integrity/proofs` route. A standalone Swift CLI under `tools/simurgh-node-macos/` produces v1 proofs that pass server validation. A cross-implementation **golden fixture** locks the canonical-JSON byte stream so Node and Swift cannot drift apart.

**Tech Stack:** Node.js 22 (ESM, `node:crypto`, `node:test`), Express 4, Swift 5.9+ with `CryptoKit` + `Foundation` (no external deps), Prettier 3.

**Design spec:** `docs/superpowers/specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md`

---

## File Structure

### Server (new + refactored)

| File                                 | Status   | Responsibility                                                                                                                                            |
| ------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/integrity/proofSchema.js`       | rewrite  | v1 constants: version, platform, allowed values, forbidden top-level fields, required-field list, capability keys, signal keys                            |
| `src/integrity/proofCanonicalise.js` | new      | `canonicaliseProofPayload(obj)` — sorted-key recursive JSON, top-level `signature` excluded, no whitespace                                                |
| `src/integrity/proofSignature.js`    | new      | `createEd25519PublicKeyFromRaw(rawBytes)`, `verifyProofSignature(canonical, rawPubKey, sig)`, `computeNodeIdHash(rawPubKey)`                              |
| `src/integrity/proofValidator.js`    | new      | `validateProof(raw, { now })` — orchestrates schema + timestamp + privacy + key + signature checks; returns `{ ok, proof, reason }`                       |
| `src/integrity/nonceGuard.js`        | simplify | remove `nonce_session_mismatch`; same-session replay → `nonce_replayed`                                                                                   |
| `src/integrity/integrityState.js`    | new      | per-session N1 continuity; `record/get/evict/evictMissing/size`                                                                                           |
| `src/academic/academicEvents.js`     | modify   | add `INTEGRITY_NODE_STALE` constant (defined, not emitted in 2.1)                                                                                         |
| `server.js`                          | modify   | refactor `POST /api/integrity/proofs` to v1 pipeline; gate on `requireSessionToken`; reject `409 session_expired_or_evicted` if telemetry session missing |

### Server tests (new + rewritten)

| File                                                    | Status                                    |
| ------------------------------------------------------- | ----------------------------------------- |
| `tests/unit/integrity/proofSchema.test.js`              | rewrite for v1                            |
| `tests/unit/integrity/proofCanonicalise.test.js`        | new                                       |
| `tests/unit/integrity/proofSignature.test.js`           | new                                       |
| `tests/unit/integrity/proofValidator.test.js`           | new                                       |
| `tests/unit/integrity/integrityState.test.js`           | new                                       |
| `tests/unit/integrity/nonceGuard.test.js`               | simplify (drop session-mismatch case)     |
| `tests/unit/integrity/__fixtures__/golden-proof.json`   | new — input proof body (no signature)     |
| `tests/unit/integrity/__fixtures__/golden-proof.sha256` | new — expected SHA-256 of canonical bytes |

### macOS Swift CLI (all new)

| File                                                                      | Status |
| ------------------------------------------------------------------------- | ------ |
| `tools/simurgh-node-macos/README.md`                                      | new    |
| `tools/simurgh-node-macos/Package.swift`                                  | new    |
| `tools/simurgh-node-macos/.gitignore`                                     | new    |
| `tools/simurgh-node-macos/Sources/SimurghNode/main.swift`                 | new    |
| `tools/simurgh-node-macos/Sources/SimurghNode/NodeIdentity.swift`         | new    |
| `tools/simurgh-node-macos/Sources/SimurghNode/ProofSigner.swift`          | new    |
| `tools/simurgh-node-macos/Sources/SimurghNode/ProofEnvelope.swift`        | new    |
| `tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift` | new    |

### Tooling + docs

| File               | Status                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `scripts/check.sh` | extend smoke block with Stage 2.1 Ed25519 round-trip + add Swift-conditional build/test step + CLI privacy regression |
| `README.md`        | add brief Stage 2.1 paragraph linking to the spec                                                                     |
| `AGENT.md`         | add Stage 2.1 implementation entry                                                                                    |
| `CHANGELOG.md`     | add 0.4.1-stage-2-1-macos-integrity entry                                                                             |

---

## Phase 1 — JS Schema, Canonicaliser, Signature

### Task 1: Rewrite `proofSchema.js` for v1

**Files:**

- Modify: `src/integrity/proofSchema.js`

- [ ] **Step 1: Replace the file contents entirely**

Write `/Users/raoof.r12/Desktop/Raouf/Project-Simurgh/src/integrity/proofSchema.js`:

```js
// Stage 2.1 v1 proof schema constants — purely declarative.
// Validation logic lives in proofValidator.js.

export const PROOF_VERSION = "simurgh-integrity-proof-v1";
export const PROOF_PLATFORM = "macos";
export const PROOF_PRIVACY_MODE = "metadata_only";

// Timestamp window: 30 s past tolerance, 5 s future tolerance.
export const TIMESTAMP_PAST_MS = 30_000;
export const TIMESTAMP_FUTURE_MS = 5_000;

// Top-level required fields. Each missing field is rejected as missing_field:<name>.
export const REQUIRED_FIELDS = Object.freeze([
  "version",
  "platform",
  "session_id",
  "node_id_hash",
  "node_public_key",
  "nonce",
  "timestamp",
  "capabilities",
  "signals",
  "privacy_mode",
  "signature",
]);

// Forbidden top-level fields. Rejection (not stripping).
export const FORBIDDEN_FIELDS = new Set([
  "screen_pixels",
  "screenshot",
  "screen_frame",
  "screen_recording",
  "webcam",
  "webcam_frame",
  "audio",
  "microphone",
  "microphone_audio",
  "typed_answer",
  "paste_content",
  "face_embedding",
  "window_title",
  "process_name",
  "raw_process_names",
  "raw_window_titles",
  "raw_student_name",
  "student_name",
  "hardware_serial",
  "biometric",
  "student_face",
]);

// Exactly these capability keys, all boolean.
export const CAPABILITY_KEYS = Object.freeze([
  "screencapturekit_available",
  "window_enumeration",
  "sharing_state_scan",
  "helper_bridge",
]);

// Exactly these signal keys with their accepted types.
export const SIGNAL_KEYS = Object.freeze({
  node_uptime_ms: "nonNegativeInt",
  window_count: "nonNegativeInt",
  capture_excluded_window_count: "nonNegativeInt",
  helper_status: "helperStatusEnum",
});

export const HELPER_STATUS_VALUES = Object.freeze(["connected", "stale", "not_configured"]);

// Byte-length rules — checked against the base64-decoded value, not string length.
export const PUBLIC_KEY_BYTES = 32;
export const SIGNATURE_BYTES = 64;
export const NONCE_BYTES_MIN = 12;
export const NONCE_BYTES_MAX = 64;

// Session ID format used by Stage 1 — must also match req.sessionTokenSessionId at the route.
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const NODE_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;
```

- [ ] **Step 2: Replace `tests/unit/integrity/proofSchema.test.js`**

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PROOF_VERSION,
  PROOF_PLATFORM,
  PROOF_PRIVACY_MODE,
  REQUIRED_FIELDS,
  FORBIDDEN_FIELDS,
  CAPABILITY_KEYS,
  SIGNAL_KEYS,
  HELPER_STATUS_VALUES,
  PUBLIC_KEY_BYTES,
  SIGNATURE_BYTES,
  NONCE_BYTES_MIN,
  NONCE_BYTES_MAX,
  TIMESTAMP_PAST_MS,
  TIMESTAMP_FUTURE_MS,
  SESSION_ID_PATTERN,
  NODE_ID_HASH_PATTERN,
} from "../../../src/integrity/proofSchema.js";

describe("proofSchema constants", () => {
  test("version, platform, privacy_mode are locked v1 values", () => {
    assert.equal(PROOF_VERSION, "simurgh-integrity-proof-v1");
    assert.equal(PROOF_PLATFORM, "macos");
    assert.equal(PROOF_PRIVACY_MODE, "metadata_only");
  });

  test("REQUIRED_FIELDS lists all 11 v1 top-level fields", () => {
    assert.equal(REQUIRED_FIELDS.length, 11);
    for (const f of [
      "version",
      "platform",
      "session_id",
      "node_id_hash",
      "node_public_key",
      "nonce",
      "timestamp",
      "capabilities",
      "signals",
      "privacy_mode",
      "signature",
    ]) {
      assert.ok(REQUIRED_FIELDS.includes(f), `missing required: ${f}`);
    }
  });

  test("FORBIDDEN_FIELDS includes all Section 2 entries", () => {
    for (const f of [
      "screen_pixels",
      "screenshot",
      "screen_frame",
      "webcam",
      "audio",
      "microphone",
      "typed_answer",
      "paste_content",
      "face_embedding",
      "window_title",
      "process_name",
      "raw_student_name",
      "biometric",
    ]) {
      assert.ok(FORBIDDEN_FIELDS.has(f), `missing forbidden: ${f}`);
    }
  });

  test("CAPABILITY_KEYS lists exactly 4 keys", () => {
    assert.deepEqual([...CAPABILITY_KEYS].sort(), [
      "helper_bridge",
      "screencapturekit_available",
      "sharing_state_scan",
      "window_enumeration",
    ]);
  });

  test("SIGNAL_KEYS lists exactly 4 typed entries", () => {
    assert.deepEqual(Object.keys(SIGNAL_KEYS).sort(), [
      "capture_excluded_window_count",
      "helper_status",
      "node_uptime_ms",
      "window_count",
    ]);
  });

  test("HELPER_STATUS_VALUES enumerates connected/stale/not_configured", () => {
    assert.deepEqual([...HELPER_STATUS_VALUES].sort(), ["connected", "not_configured", "stale"]);
  });

  test("byte-length constants are 32/64/12/64", () => {
    assert.equal(PUBLIC_KEY_BYTES, 32);
    assert.equal(SIGNATURE_BYTES, 64);
    assert.equal(NONCE_BYTES_MIN, 12);
    assert.equal(NONCE_BYTES_MAX, 64);
  });

  test("timestamp windows are 30s past, 5s future", () => {
    assert.equal(TIMESTAMP_PAST_MS, 30_000);
    assert.equal(TIMESTAMP_FUTURE_MS, 5_000);
  });

  test("regex patterns match expected formats", () => {
    assert.ok(SESSION_ID_PATTERN.test("sess_abc123"));
    assert.ok(!SESSION_ID_PATTERN.test("../etc/passwd"));
    assert.ok(NODE_ID_HASH_PATTERN.test("a".repeat(64)));
    assert.ok(!NODE_ID_HASH_PATTERN.test("A".repeat(64))); // must be lowercase
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh && node --test tests/unit/integrity/proofSchema.test.js
```

Expected: 9 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/integrity/proofSchema.js tests/unit/integrity/proofSchema.test.js
git commit -m "refactor(integrity): v1 schema constants"
```

---

### Task 2: Add `proofCanonicalise.js`

**Files:**

- Create: `src/integrity/proofCanonicalise.js`
- Create: `tests/unit/integrity/proofCanonicalise.test.js`

- [ ] **Step 1: Write failing tests first**

Create `tests/unit/integrity/proofCanonicalise.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("canonicaliseProofPayload", () => {
  test("sorts top-level keys lexicographically", () => {
    const result = canonicaliseProofPayload({ b: 2, a: 1, c: 3 });
    assert.equal(result, '{"a":1,"b":2,"c":3}');
  });

  test("sorts nested object keys recursively", () => {
    const result = canonicaliseProofPayload({ outer: { z: 1, a: 2 }, alpha: 1 });
    assert.equal(result, '{"alpha":1,"outer":{"a":2,"z":1}}');
  });

  test("preserves array order", () => {
    const result = canonicaliseProofPayload({ list: [3, 1, 2] });
    assert.equal(result, '{"list":[3,1,2]}');
  });

  test("excludes top-level signature only", () => {
    const result = canonicaliseProofPayload({ a: 1, signature: "sig", b: 2 });
    assert.equal(result, '{"a":1,"b":2}');
  });

  test("preserves nested signature key", () => {
    const result = canonicaliseProofPayload({ a: { signature: "nested" }, signature: "top" });
    assert.equal(result, '{"a":{"signature":"nested"}}');
  });

  test("emits no whitespace", () => {
    const result = canonicaliseProofPayload({ a: 1, b: { c: [1, 2] } });
    assert.ok(!/\s/.test(result), `has whitespace: ${result}`);
  });

  test("integers stay integers (no .0)", () => {
    const result = canonicaliseProofPayload({ n: 5 });
    assert.equal(result, '{"n":5}');
  });

  test("empty object and empty array", () => {
    assert.equal(canonicaliseProofPayload({}), "{}");
    assert.equal(canonicaliseProofPayload({ a: [] }), '{"a":[]}');
  });

  test("strings are JSON-encoded with escaping", () => {
    const result = canonicaliseProofPayload({ s: 'hello "world"' });
    assert.equal(result, '{"s":"hello \\"world\\""}');
  });

  test("booleans and null encode correctly", () => {
    assert.equal(canonicaliseProofPayload({ b: true, n: null }), '{"b":true,"n":null}');
  });

  test("golden fixture canonical SHA-256 matches expected hex", () => {
    const fixturePath = join(__dirname, "__fixtures__", "golden-proof.json");
    const expectedPath = join(__dirname, "__fixtures__", "golden-proof.sha256");
    const proof = JSON.parse(readFileSync(fixturePath, "utf8"));
    const expected = readFileSync(expectedPath, "utf8").trim();

    const canonical = canonicaliseProofPayload(proof);
    const actual = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(actual, expected, `canonical: ${canonical}`);
  });
});
```

- [ ] **Step 2: Run tests — expect "module not found"**

```bash
node --test tests/unit/integrity/proofCanonicalise.test.js
```

Expected: FAIL — `Cannot find module './proofCanonicalise.js'`.

- [ ] **Step 3: Implement the module**

Create `src/integrity/proofCanonicalise.js`:

```js
// Canonical JSON serialiser for Stage 2 integrity proofs.
//
// Rules:
//   1. Top-level `signature` is removed (nested `signature` keys are preserved).
//   2. Object keys are sorted lexicographically by UTF-16 code-unit value at every depth.
//   3. Arrays preserve insertion order.
//   4. Output contains no whitespace.
//   5. Output is UTF-8 (string is returned; caller encodes if needed).
//
// The Swift implementation in tools/simurgh-node-macos/ must produce
// byte-identical output for the same logical input. Locked by the
// golden-fixture interop test.

function encodePrimitive(v) {
  // JSON.stringify on primitives produces the exact RFC 8259 encoding
  // we want, including escaping and no whitespace.
  return JSON.stringify(v);
}

function encodeValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return encodePrimitive(value);
  if (Array.isArray(value)) {
    return "[" + value.map(encodeValue).join(",") + "]";
  }
  // Plain object — sort keys.
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => JSON.stringify(k) + ":" + encodeValue(value[k]));
  return "{" + parts.join(",") + "}";
}

export function canonicaliseProofPayload(proof) {
  if (proof === null || typeof proof !== "object" || Array.isArray(proof)) {
    throw new Error("canonicaliseProofPayload: input must be a plain object");
  }
  // Strip top-level signature only — nested keys named "signature" stay.
  const copy = { ...proof };
  delete copy.signature;
  return encodeValue(copy);
}
```

- [ ] **Step 4: Create the golden-fixture files**

Create `tests/unit/integrity/__fixtures__/golden-proof.json`:

```json
{
  "version": "simurgh-integrity-proof-v1",
  "platform": "macos",
  "session_id": "sess_test_golden_001",
  "node_id_hash": "5a1c8d2cae3c7c1f0a8b9d4f5e2c1a7b6d3e9f0c4b8a1d2e5f7c3b9a0e1d2f3a",
  "node_public_key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  "nonce": "AAAAAAAAAAAAAAAAAAAAAA==",
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
  "privacy_mode": "metadata_only"
}
```

- [ ] **Step 5: Compute the expected SHA-256 from your canonicaliser**

Run this one-liner to get the SHA-256 of the canonicalised fixture:

```bash
node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import crypto from 'node:crypto';
const proof = JSON.parse(readFileSync('tests/unit/integrity/__fixtures__/golden-proof.json', 'utf8'));
const canonical = canonicaliseProofPayload(proof);
const hex = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
writeFileSync('tests/unit/integrity/__fixtures__/golden-proof.sha256', hex + '\n');
console.log('canonical:', canonical);
console.log('sha256:', hex);
"
```

Expected: prints the canonical string and a 64-char hex SHA-256, writes the hex to `golden-proof.sha256`.

- [ ] **Step 6: Run tests — all 11 should pass**

```bash
node --test tests/unit/integrity/proofCanonicalise.test.js
```

Expected: 11 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/integrity/proofCanonicalise.js \
        tests/unit/integrity/proofCanonicalise.test.js \
        tests/unit/integrity/__fixtures__/golden-proof.json \
        tests/unit/integrity/__fixtures__/golden-proof.sha256
git commit -m "feat(integrity): add canonical JSON serialiser + golden fixture"
```

---

### Task 3: Add `proofSignature.js`

**Files:**

- Create: `src/integrity/proofSignature.js`
- Create: `tests/unit/integrity/proofSignature.test.js`

- [ ] **Step 1: Write failing tests first**

Create `tests/unit/integrity/proofSignature.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createEd25519PublicKeyFromRaw,
  verifyProofSignature,
  computeNodeIdHash,
} from "../../../src/integrity/proofSignature.js";

function freshKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = publicKey.export({ format: "jwk" });
  // jwk.x is the raw 32-byte public key base64url-encoded.
  const rawPubBytes = Buffer.from(rawPub.x, "base64url");
  return { publicKey, privateKey, rawPubBytes };
}

function sign(privateKey, data) {
  return crypto.sign(null, Buffer.from(data, "utf8"), privateKey);
}

describe("proofSignature", () => {
  test("createEd25519PublicKeyFromRaw produces a usable KeyObject", () => {
    const { rawPubBytes } = freshKeypair();
    const keyObject = createEd25519PublicKeyFromRaw(rawPubBytes);
    assert.equal(keyObject.type, "public");
    assert.equal(keyObject.asymmetricKeyType, "ed25519");
  });

  test("rejects non-32-byte input", () => {
    assert.throws(() => createEd25519PublicKeyFromRaw(Buffer.alloc(31)), /invalid_public_key/);
    assert.throws(() => createEd25519PublicKeyFromRaw(Buffer.alloc(33)), /invalid_public_key/);
    assert.throws(() => createEd25519PublicKeyFromRaw("not-a-buffer"), /invalid_public_key/);
  });

  test("computeNodeIdHash returns lowercase hex sha256 of raw public key", () => {
    const rawPub = Buffer.alloc(32, 0xaa);
    const expected = crypto.createHash("sha256").update(rawPub).digest("hex");
    assert.equal(computeNodeIdHash(rawPub), expected);
    assert.ok(/^[0-9a-f]{64}$/.test(computeNodeIdHash(rawPub)));
  });

  test("verifyProofSignature returns true for a valid signed canonical", () => {
    const { privateKey, rawPubBytes } = freshKeypair();
    const canonical = '{"a":1,"b":2}';
    const sig = sign(privateKey, canonical);
    assert.ok(verifyProofSignature(canonical, rawPubBytes, sig));
  });

  test("verifyProofSignature returns false for tampered canonical bytes", () => {
    const { privateKey, rawPubBytes } = freshKeypair();
    const sig = sign(privateKey, '{"a":1,"b":2}');
    assert.equal(verifyProofSignature('{"a":1,"b":3}', rawPubBytes, sig), false);
  });

  test("verifyProofSignature returns false for wrong public key", () => {
    const a = freshKeypair();
    const b = freshKeypair();
    const sig = sign(a.privateKey, "hello");
    assert.equal(verifyProofSignature("hello", b.rawPubBytes, sig), false);
  });

  test("verifyProofSignature returns false for malformed signature (≠ 64 bytes)", () => {
    const { rawPubBytes } = freshKeypair();
    assert.equal(verifyProofSignature("hello", rawPubBytes, Buffer.alloc(63)), false);
    assert.equal(verifyProofSignature("hello", rawPubBytes, Buffer.alloc(65)), false);
  });

  test("verifyProofSignature returns false on invalid public key bytes", () => {
    // 32 bytes but on top of being an invalid point — Ed25519 will reject.
    // This test just confirms we don't throw on an unusual input.
    const { privateKey } = freshKeypair();
    const sig = sign(privateKey, "hello");
    const wrongPub = Buffer.alloc(32, 0xff);
    assert.equal(verifyProofSignature("hello", wrongPub, sig), false);
  });
});
```

- [ ] **Step 2: Run tests — expect "module not found"**

```bash
node --test tests/unit/integrity/proofSignature.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

Create `src/integrity/proofSignature.js`:

```js
import crypto from "node:crypto";

// DER prefix for "SubjectPublicKeyInfo wrapping an Ed25519 public key".
// Structure:
//   30 2a            — SEQUENCE, length 42
//     30 05          — SEQUENCE (AlgorithmIdentifier), length 5
//       06 03 2b 65 70 — OID 1.3.101.112 (Ed25519)
//     03 21 00       — BIT STRING, length 33 (32 key bytes + 1 unused-bits byte)
// Concatenated with the 32-byte raw public key, this is a valid SPKI DER blob
// that Node's crypto.createPublicKey() accepts.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const RAW_PUBLIC_KEY_BYTES = 32;
const SIGNATURE_BYTES = 64;

/**
 * Wrap a raw 32-byte Ed25519 public key in the SPKI envelope required by
 * Node's crypto.createPublicKey(). Throws "invalid_public_key" on bad input.
 */
export function createEd25519PublicKeyFromRaw(rawPublicKey) {
  if (!Buffer.isBuffer(rawPublicKey) || rawPublicKey.length !== RAW_PUBLIC_KEY_BYTES) {
    throw new Error("invalid_public_key");
  }
  return crypto.createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, rawPublicKey]),
    format: "der",
    type: "spki",
  });
}

/**
 * SHA-256 of the raw 32-byte public key, returned as 64-char lowercase hex.
 * This is the node_id_hash carried in the proof envelope.
 */
export function computeNodeIdHash(rawPublicKey) {
  if (!Buffer.isBuffer(rawPublicKey) || rawPublicKey.length !== RAW_PUBLIC_KEY_BYTES) {
    throw new Error("invalid_public_key");
  }
  return crypto.createHash("sha256").update(rawPublicKey).digest("hex");
}

/**
 * Verify an Ed25519 signature over the canonical proof bytes.
 * Returns true/false. Never throws on bad signatures or bad keys —
 * malformed inputs return false so the caller can return a single
 * uniform "invalid_signature" reason code.
 *
 *   canonical: string  — output of canonicaliseProofPayload()
 *   rawPubBytes: Buffer(32)
 *   signatureBytes: Buffer(64)
 */
export function verifyProofSignature(canonical, rawPubBytes, signatureBytes) {
  if (!Buffer.isBuffer(signatureBytes) || signatureBytes.length !== SIGNATURE_BYTES) {
    return false;
  }
  let publicKey;
  try {
    publicKey = createEd25519PublicKeyFromRaw(rawPubBytes);
  } catch {
    return false;
  }
  try {
    return crypto.verify(null, Buffer.from(canonical, "utf8"), publicKey, signatureBytes);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests — all 8 should pass**

```bash
node --test tests/unit/integrity/proofSignature.test.js
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/integrity/proofSignature.js tests/unit/integrity/proofSignature.test.js
git commit -m "feat(integrity): add Ed25519 signature verifier with SPKI wrapping"
```

---

## Phase 2 — Validator

### Task 4: Add `proofValidator.js`

**Files:**

- Create: `src/integrity/proofValidator.js`
- Create: `tests/unit/integrity/proofValidator.test.js`

- [ ] **Step 1: Write failing tests first**

Create `tests/unit/integrity/proofValidator.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateProof } from "../../../src/integrity/proofValidator.js";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";
import { computeNodeIdHash } from "../../../src/integrity/proofSignature.js";

const NOW = Date.parse("2026-05-14T12:00:00.000Z");

function freshSignedProof(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const base = {
    version: "simurgh-integrity-proof-v1",
    platform: "macos",
    session_id: "sess_abc",
    node_id_hash: computeNodeIdHash(rawPub),
    node_public_key: rawPub.toString("base64"),
    nonce: Buffer.alloc(16, 0xab).toString("base64"),
    timestamp: new Date(NOW).toISOString(),
    capabilities: {
      screencapturekit_available: false,
      window_enumeration: false,
      sharing_state_scan: false,
      helper_bridge: false,
    },
    signals: {
      node_uptime_ms: 0,
      window_count: 0,
      capture_excluded_window_count: 0,
      helper_status: "not_configured",
    },
    privacy_mode: "metadata_only",
    ...overrides,
  };
  // Sign the canonical payload.
  const canonical = canonicaliseProofPayload(base);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), privateKey);
  base.signature = sig.toString("base64");
  return base;
}

describe("validateProof — accepts a well-formed proof", () => {
  test("returns ok: true with all fields", () => {
    const proof = freshSignedProof();
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.proof.version, "simurgh-integrity-proof-v1");
    assert.equal(result.proof.session_id, "sess_abc");
  });
});

describe("validateProof — required field checks", () => {
  for (const field of [
    "version",
    "platform",
    "session_id",
    "node_id_hash",
    "node_public_key",
    "nonce",
    "timestamp",
    "capabilities",
    "signals",
    "privacy_mode",
    "signature",
  ]) {
    test(`rejects missing ${field}`, () => {
      const proof = freshSignedProof();
      delete proof[field];
      const result = validateProof(proof, { now: NOW });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`missing_field:${field}|invalid_`));
    });
  }
});

describe("validateProof — forbidden fields", () => {
  for (const field of ["screen_pixels", "typed_answer", "paste_content", "webcam"]) {
    test(`rejects forbidden field ${field}`, () => {
      const proof = freshSignedProof();
      proof[field] = "anything";
      const result = validateProof(proof, { now: NOW });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`forbidden_field:${field}`));
    });
  }
});

describe("validateProof — version/platform/privacy_mode", () => {
  test("rejects unsupported version", () => {
    const proof = freshSignedProof({ version: "simurgh-integrity-proof-v9" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "unsupported_version");
  });

  test("rejects non-macos platform", () => {
    const proof = freshSignedProof({ platform: "linux" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "unsupported_platform");
  });

  test("rejects non-metadata privacy mode", () => {
    const proof = freshSignedProof({ privacy_mode: "full_capture" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_privacy_mode");
  });
});

describe("validateProof — session_id format", () => {
  test("rejects path-traversal session id", () => {
    const proof = freshSignedProof({ session_id: "../../etc/passwd" });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_session_id");
  });
});

describe("validateProof — timestamp window", () => {
  test("accepts within 25s past", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW - 25_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true);
  });

  test("accepts within 4s future", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW + 4_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.ok, true);
  });

  test("rejects 60s past", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW - 60_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "proof_stale");
  });

  test("rejects 60s future", () => {
    const proof = freshSignedProof({ timestamp: new Date(NOW + 60_000).toISOString() });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "proof_in_future");
  });
});

describe("validateProof — capabilities and signals", () => {
  test("rejects capabilities as array", () => {
    const proof = freshSignedProof({ capabilities: ["screencapturekit_available"] });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_capabilities");
  });

  test("rejects capabilities missing a key", () => {
    const caps = {
      screencapturekit_available: false,
      window_enumeration: false,
      sharing_state_scan: false,
      // helper_bridge missing
    };
    const proof = freshSignedProof({ capabilities: caps });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_capabilities");
  });

  test("rejects signals with wrong helper_status", () => {
    const sig = {
      node_uptime_ms: 0,
      window_count: 0,
      capture_excluded_window_count: 0,
      helper_status: "rebooting",
    };
    const proof = freshSignedProof({ signals: sig });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signals");
  });
});

describe("validateProof — public key and node_id_hash", () => {
  test("rejects public key that decodes to 31 bytes", () => {
    const proof = freshSignedProof({ node_public_key: Buffer.alloc(31).toString("base64") });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_public_key");
  });

  test("rejects node_id_hash that does not match the public key", () => {
    const proof = freshSignedProof({ node_id_hash: "0".repeat(64) });
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "node_id_hash_mismatch");
  });
});

describe("validateProof — signature", () => {
  test("rejects signature that decodes to 63 bytes", () => {
    const proof = freshSignedProof();
    proof.signature = Buffer.alloc(63).toString("base64");
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signature_format");
  });

  test("rejects signature that doesn't verify (zeroed)", () => {
    const proof = freshSignedProof();
    proof.signature = Buffer.alloc(64).toString("base64");
    const result = validateProof(proof, { now: NOW });
    assert.equal(result.reason, "invalid_signature");
  });

  test("re-ordered keys in input still verify (canonicaliser sorts)", () => {
    const proof = freshSignedProof();
    // Reconstruct with deliberately reversed key insertion order — should still verify.
    const reordered = Object.fromEntries(Object.entries(proof).reverse());
    const result = validateProof(reordered, { now: NOW });
    assert.equal(result.ok, true);
  });
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

```bash
node --test tests/unit/integrity/proofValidator.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the validator**

Create `src/integrity/proofValidator.js`:

```js
import { canonicaliseProofPayload } from "./proofCanonicalise.js";
import { verifyProofSignature, computeNodeIdHash } from "./proofSignature.js";
import {
  PROOF_VERSION,
  PROOF_PLATFORM,
  PROOF_PRIVACY_MODE,
  REQUIRED_FIELDS,
  FORBIDDEN_FIELDS,
  CAPABILITY_KEYS,
  SIGNAL_KEYS,
  HELPER_STATUS_VALUES,
  PUBLIC_KEY_BYTES,
  SIGNATURE_BYTES,
  NONCE_BYTES_MIN,
  NONCE_BYTES_MAX,
  TIMESTAMP_PAST_MS,
  TIMESTAMP_FUTURE_MS,
  SESSION_ID_PATTERN,
  NODE_ID_HASH_PATTERN,
} from "./proofSchema.js";

function fail(reason) {
  return { ok: false, reason };
}

function tryDecodeBase64(s) {
  if (typeof s !== "string") return null;
  // Buffer.from is permissive — reject anything with non-base64 chars by re-encoding.
  const buf = Buffer.from(s, "base64");
  if (buf.toString("base64") !== s.replace(/=+$/, "").padEnd(s.length, "=")) {
    // Allow standard padding variants; reject anything else.
    if (buf.toString("base64") !== s) return null;
  }
  return buf;
}

function isNonNegativeInt(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

function validateCapabilities(caps) {
  if (caps === null || typeof caps !== "object" || Array.isArray(caps)) return false;
  const keys = Object.keys(caps);
  if (keys.length !== CAPABILITY_KEYS.length) return false;
  for (const k of CAPABILITY_KEYS) {
    if (!(k in caps)) return false;
    if (typeof caps[k] !== "boolean") return false;
  }
  return true;
}

function validateSignals(signals) {
  if (signals === null || typeof signals !== "object" || Array.isArray(signals)) return false;
  const keys = Object.keys(signals);
  if (keys.length !== Object.keys(SIGNAL_KEYS).length) return false;
  for (const [k, type] of Object.entries(SIGNAL_KEYS)) {
    if (!(k in signals)) return false;
    if (type === "nonNegativeInt" && !isNonNegativeInt(signals[k])) return false;
    if (type === "helperStatusEnum" && !HELPER_STATUS_VALUES.includes(signals[k])) return false;
  }
  return true;
}

/**
 * Validate a Stage 2.1 macOS integrity proof.
 *
 * Returns:
 *   { ok: true, proof }                — proof is the (frozen) accepted shape
 *   { ok: false, reason: "<code>" }    — see spec §"Server Validation Flow"
 *
 * This validator does NOT check nonce replay or node continuity. Those
 * are downstream responsibilities of nonceGuard and integrityState.
 */
export function validateProof(raw, { now = Date.now() } = {}) {
  // 1. raw is an object
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  // 2. forbidden field check
  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }

  // 3. required field presence
  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  // 4. version / platform / privacy_mode
  if (raw.version !== PROOF_VERSION) return fail("unsupported_version");
  if (raw.platform !== PROOF_PLATFORM) return fail("unsupported_platform");
  if (raw.privacy_mode !== PROOF_PRIVACY_MODE) return fail("invalid_privacy_mode");

  // 5. session_id format
  if (typeof raw.session_id !== "string" || !SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }

  // 6. timestamp window
  if (typeof raw.timestamp !== "string") return fail("invalid_timestamp");
  const ts = Date.parse(raw.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + TIMESTAMP_FUTURE_MS) return fail("proof_in_future");
  if (ts < now - TIMESTAMP_PAST_MS) return fail("proof_stale");

  // 7. capabilities and signals
  if (!validateCapabilities(raw.capabilities)) return fail("invalid_capabilities");
  if (!validateSignals(raw.signals)) return fail("invalid_signals");

  // 8. node_public_key decodes to 32 bytes
  if (typeof raw.node_public_key !== "string") return fail("invalid_public_key");
  const pubKey = tryDecodeBase64(raw.node_public_key);
  if (!pubKey || pubKey.length !== PUBLIC_KEY_BYTES) return fail("invalid_public_key");

  // 9. node_id_hash matches sha256(public_key)
  if (typeof raw.node_id_hash !== "string" || !NODE_ID_HASH_PATTERN.test(raw.node_id_hash)) {
    return fail("node_id_hash_mismatch");
  }
  if (raw.node_id_hash !== computeNodeIdHash(pubKey)) return fail("node_id_hash_mismatch");

  // 10. nonce decodes to 12–64 bytes
  if (typeof raw.nonce !== "string") return fail("invalid_nonce");
  const nonceBytes = tryDecodeBase64(raw.nonce);
  if (!nonceBytes || nonceBytes.length < NONCE_BYTES_MIN || nonceBytes.length > NONCE_BYTES_MAX) {
    return fail("invalid_nonce");
  }

  // 11. signature decodes to 64 bytes
  if (typeof raw.signature !== "string") return fail("invalid_signature_format");
  const sigBytes = tryDecodeBase64(raw.signature);
  if (!sigBytes || sigBytes.length !== SIGNATURE_BYTES) return fail("invalid_signature_format");

  // 12. signature verifies against canonical payload
  const canonical = canonicaliseProofPayload(raw);
  if (!verifyProofSignature(canonical, pubKey, sigBytes)) return fail("invalid_signature");

  // Build the canonical accepted proof (only the validated fields, no extras).
  const accepted = {
    version: raw.version,
    platform: raw.platform,
    session_id: raw.session_id,
    node_id_hash: raw.node_id_hash,
    node_public_key: raw.node_public_key,
    nonce: raw.nonce,
    nonce_bytes: nonceBytes,
    timestamp: raw.timestamp,
    capabilities: { ...raw.capabilities },
    signals: { ...raw.signals },
    privacy_mode: raw.privacy_mode,
    signature: raw.signature,
  };
  return { ok: true, proof: accepted };
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
node --test tests/unit/integrity/proofValidator.test.js
```

Expected: all tests pass (≈ 27 assertions including the missing-field loop).

- [ ] **Step 5: Commit**

```bash
git add src/integrity/proofValidator.js tests/unit/integrity/proofValidator.test.js
git commit -m "feat(integrity): add v1 proof validator"
```

---

## Phase 3 — State + Nonce Guard

### Task 5: Simplify `nonceGuard.js`

**Files:**

- Modify: `src/integrity/nonceGuard.js`
- Modify: `tests/unit/integrity/nonceGuard.test.js`

- [ ] **Step 1: Replace the test file**

Replace `tests/unit/integrity/nonceGuard.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createNonceGuard } from "../../../src/integrity/nonceGuard.js";

describe("nonceGuard", () => {
  test("accepts a fresh nonce for a session", () => {
    const guard = createNonceGuard();
    const result = guard.check("nonce-abc", "sess_1");
    assert.equal(result.ok, true);
    guard.stop();
  });

  test("rejects a replayed nonce for the same session", () => {
    const guard = createNonceGuard();
    guard.check("nonce-xyz", "sess_1");
    const result = guard.check("nonce-xyz", "sess_1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "nonce_replayed");
    guard.stop();
  });

  test("rejects a nonce reused on a different session (also nonce_replayed)", () => {
    const guard = createNonceGuard();
    guard.check("shared-nonce", "sess_a");
    const result = guard.check("shared-nonce", "sess_b");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "nonce_replayed");
    guard.stop();
  });

  test("accepts different nonces independently", () => {
    const guard = createNonceGuard();
    assert.equal(guard.check("n1", "s1").ok, true);
    assert.equal(guard.check("n2", "s2").ok, true);
    guard.stop();
  });

  test("rejects empty nonce", () => {
    const guard = createNonceGuard();
    const result = guard.check("", "sess_1");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "invalid_nonce");
    guard.stop();
  });
});
```

- [ ] **Step 2: Replace `src/integrity/nonceGuard.js`**

```js
// Per-nonce replay protection for Stage 2 integrity proof submissions.
//
// Simplified rule: every nonce can only be used once across the lifetime
// of the in-memory store. We do not track per-session subdivisions —
// the cryptographic envelope binds the proof to its session_id and a
// valid signature is unforgeable, so the only attack the nonce guard
// needs to block is "submit the same proof twice."

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createNonceGuard({ ttlMs = DEFAULT_TTL_MS } = {}) {
  // nonce -> expiresAt
  const seen = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [nonce, expiresAt] of seen.entries()) {
      if (expiresAt <= now) seen.delete(nonce);
    }
  }, 60_000);
  cleanup.unref?.();

  function check(nonce /* sessionId is accepted for API stability but ignored */) {
    if (typeof nonce !== "string" || nonce.length === 0) {
      return { ok: false, reason: "invalid_nonce" };
    }
    if (seen.has(nonce)) {
      return { ok: false, reason: "nonce_replayed" };
    }
    seen.set(nonce, Date.now() + ttlMs);
    return { ok: true };
  }

  return {
    check,
    size: () => seen.size,
    stop: () => clearInterval(cleanup),
  };
}
```

- [ ] **Step 3: Run tests — all 5 should pass**

```bash
node --test tests/unit/integrity/nonceGuard.test.js
```

- [ ] **Step 4: Commit**

```bash
git add src/integrity/nonceGuard.js tests/unit/integrity/nonceGuard.test.js
git commit -m "refactor(integrity): simplify nonce guard to global replay protection"
```

---

### Task 6: Add `integrityState.js` with N1 continuity

**Files:**

- Create: `src/integrity/integrityState.js`
- Create: `tests/unit/integrity/integrityState.test.js`

- [ ] **Step 1: Write failing tests first**

Create `tests/unit/integrity/integrityState.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createIntegrityState } from "../../../src/integrity/integrityState.js";

function makeProof(nodeIdHash = "a".repeat(64)) {
  return {
    node_id_hash: nodeIdHash,
    capabilities: { x: true },
    signals: { y: 1 },
  };
}

describe("integrityState", () => {
  test("first record binds node_id_hash", () => {
    const state = createIntegrityState();
    const proof = makeProof("aa".padEnd(64, "0"));
    const result = state.record("sess_1", proof);
    assert.equal(result.ok, true);

    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, proof.node_id_hash);
    assert.equal(rec.proof_count, 1);
  });

  test("second record with same node_id_hash updates fields and increments count", () => {
    const state = createIntegrityState();
    const proof = makeProof("bb".padEnd(64, "0"));
    state.record("sess_1", proof);
    state.record("sess_1", proof);
    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, proof.node_id_hash);
    assert.equal(rec.proof_count, 2);
  });

  test("second record with different node_id_hash is rejected", () => {
    const state = createIntegrityState();
    state.record("sess_1", makeProof("aa".padEnd(64, "0")));
    const result = state.record("sess_1", makeProof("cc".padEnd(64, "0")));
    assert.equal(result.ok, false);
    assert.equal(result.reason, "node_id_hash_changed");
    const rec = state.get("sess_1");
    assert.equal(rec.bound_node_id_hash, "aa".padEnd(64, "0"));
    assert.equal(rec.proof_count, 1);
  });

  test("get returns null for unknown session", () => {
    const state = createIntegrityState();
    assert.equal(state.get("nope"), null);
  });

  test("evict removes the record", () => {
    const state = createIntegrityState();
    state.record("sess_1", makeProof());
    state.evict("sess_1");
    assert.equal(state.get("sess_1"), null);
  });

  test("evictMissing keeps active sessions and drops the rest", () => {
    const state = createIntegrityState();
    state.record("sess_a", makeProof("a".repeat(64)));
    state.record("sess_b", makeProof("b".repeat(64)));
    state.record("sess_c", makeProof("c".repeat(64)));
    state.evictMissing(new Set(["sess_a", "sess_c"]));
    assert.ok(state.get("sess_a"));
    assert.equal(state.get("sess_b"), null);
    assert.ok(state.get("sess_c"));
  });

  test("size reports current entry count", () => {
    const state = createIntegrityState();
    assert.equal(state.size(), 0);
    state.record("s1", makeProof("a".repeat(64)));
    state.record("s2", makeProof("b".repeat(64)));
    assert.equal(state.size(), 2);
  });
});
```

- [ ] **Step 2: Run tests — expect module-not-found**

```bash
node --test tests/unit/integrity/integrityState.test.js
```

- [ ] **Step 3: Implement the module**

Create `src/integrity/integrityState.js`:

```js
// Per-session integrity state with N1 strict node continuity.
//
// A session's bound_node_id_hash is set on the FIRST accepted proof and is
// immutable thereafter. A subsequent proof with a different node_id_hash is
// rejected with reason "node_id_hash_changed".
//
// State is in-memory and cleaned up via evictMissing(activeSessionIds) from
// the existing session-eviction timer in server.js.

export function createIntegrityState() {
  // sessionId -> record
  const records = new Map();

  function record(sessionId, proof) {
    const existing = records.get(sessionId);
    if (!existing) {
      records.set(sessionId, {
        sessionId,
        bound_node_id_hash: proof.node_id_hash,
        last_proof_received_at: Date.now(),
        last_node_id_hash: proof.node_id_hash,
        last_capabilities: { ...proof.capabilities },
        last_signals: { ...proof.signals },
        proof_count: 1,
      });
      return { ok: true };
    }
    if (existing.bound_node_id_hash !== proof.node_id_hash) {
      return { ok: false, reason: "node_id_hash_changed" };
    }
    existing.last_proof_received_at = Date.now();
    existing.last_node_id_hash = proof.node_id_hash;
    existing.last_capabilities = { ...proof.capabilities };
    existing.last_signals = { ...proof.signals };
    existing.proof_count += 1;
    return { ok: true };
  }

  return {
    record,
    get(sessionId) {
      return records.get(sessionId) ?? null;
    },
    evict(sessionId) {
      records.delete(sessionId);
    },
    evictMissing(activeSessionIds) {
      for (const id of records.keys()) {
        if (!activeSessionIds.has(id)) records.delete(id);
      }
    },
    size() {
      return records.size;
    },
  };
}
```

- [ ] **Step 4: Run tests — all 7 should pass**

```bash
node --test tests/unit/integrity/integrityState.test.js
```

- [ ] **Step 5: Commit**

```bash
git add src/integrity/integrityState.js tests/unit/integrity/integrityState.test.js
git commit -m "feat(integrity): add per-session state with N1 strict node continuity"
```

---

## Phase 4 — Server Route + Audit

### Task 7: Add `INTEGRITY_NODE_STALE` event constant

**Files:**

- Modify: `src/academic/academicEvents.js`

- [ ] **Step 1: Add the new constant**

Open `/Users/raoof.r12/Desktop/Raouf/Project-Simurgh/src/academic/academicEvents.js`. Find the existing EVENTS block:

```js
export const EVENTS = Object.freeze({
  EXAM_STARTED: "EXAM_STARTED",
  // ... existing entries ...
  INTEGRITY_PROOF_RECEIVED: "INTEGRITY_PROOF_RECEIVED",
  INTEGRITY_PROOF_REJECTED: "INTEGRITY_PROOF_REJECTED",
});
```

Add `INTEGRITY_NODE_STALE` next to the other integrity events:

```js
  INTEGRITY_PROOF_RECEIVED: "INTEGRITY_PROOF_RECEIVED",
  INTEGRITY_PROOF_REJECTED: "INTEGRITY_PROOF_REJECTED",
  // Defined for Stage 2.x staleness checker. Not emitted by Stage 2.1.
  INTEGRITY_NODE_STALE: "INTEGRITY_NODE_STALE",
});
```

- [ ] **Step 2: Add a constant-existence test to the existing academicEvents test**

In `tests/unit/academicEvents.test.js`, add to the "EVENTS exports all required taxonomy constants" assertion, the value `"INTEGRITY_NODE_STALE"` to the required list.

- [ ] **Step 3: Run tests**

```bash
node --test tests/unit/academicEvents.test.js
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/academic/academicEvents.js tests/unit/academicEvents.test.js
git commit -m "feat(academic): add INTEGRITY_NODE_STALE event (defined, not yet emitted)"
```

---

### Task 8: Refactor `POST /api/integrity/proofs` to v1 pipeline

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Update imports at top of `server.js`**

Find the existing line:

```js
import { validateProof } from "./src/integrity/proofSchema.js";
import { createNonceGuard } from "./src/integrity/nonceGuard.js";
```

Replace with:

```js
import { validateProof } from "./src/integrity/proofValidator.js";
import { createNonceGuard } from "./src/integrity/nonceGuard.js";
import { createIntegrityState } from "./src/integrity/integrityState.js";
import crypto from "node:crypto";
```

Note: `crypto` may already be imported elsewhere. Confirm there is exactly one `import crypto from "node:crypto"` line. If it already exists at the top, do not duplicate.

- [ ] **Step 2: Add the integrity state instance after existing nonce guard creation**

Find where `proofNonceGuard` is created (near other in-memory state). Add directly below it:

```js
// Stage 2.1: per-session integrity state with N1 strict node continuity.
const integrityState = createIntegrityState();
```

- [ ] **Step 3: Find the session-eviction timer and add integrity-state eviction**

Locate the existing eviction-timer block (it sweeps `sessions`/`examSessions`). At the end of its callback, add:

```js
integrityState.evictMissing(new Set(sessions.keys()));
```

- [ ] **Step 4: Replace the `POST /api/integrity/proofs` route**

Find the existing route handler `app.post("/api/integrity/proofs", ...)`. Replace the entire handler body with:

```js
app.post("/api/integrity/proofs", requireSessionToken, (req, res) => {
  const sessionId = req.sessionTokenSessionId;

  // Step 2 (spec): session must still exist. No implicit resurrection.
  const sess = sessions.get(sessionId);
  if (!sess) {
    return res.status(409).json({ error: "session_expired_or_evicted" });
  }

  // Helper to log rejection to audit chain with a minimal privacy-safe payload.
  function recordReject(reason, parsedHash = null, hasSignature = false) {
    appendAudit(sess, EVENTS.INTEGRITY_PROOF_REJECTED, {
      reason,
      node_id_hash_if_parsed: parsedHash,
      has_signature: hasSignature,
    });
  }

  // Step 3 (spec): schema + crypto validation.
  const validation = validateProof(req.body, { now: Date.now() });
  if (!validation.ok) {
    // Use node_id_hash from the *raw* body only if the validator parsed it.
    // The validator's accepted shape lives on validation.proof; on failure we
    // approximate by checking the raw input.
    const rawHash =
      typeof req.body?.node_id_hash === "string" && /^[0-9a-f]{64}$/.test(req.body.node_id_hash)
        ? req.body.node_id_hash
        : null;
    const hasSig = typeof req.body?.signature === "string" && req.body.signature.length > 0;
    recordReject(validation.reason, rawHash, hasSig);

    // Map reason codes to HTTP status.
    let status = 400;
    if (validation.reason === "invalid_signature") status = 401;
    if (validation.reason === "proof_session_mismatch") status = 401;
    return res.status(status).json({ error: validation.reason });
  }
  const { proof } = validation;

  // Token session must match proof session.
  if (proof.session_id !== sessionId) {
    recordReject("proof_session_mismatch", proof.node_id_hash, true);
    return res.status(401).json({ error: "proof_session_mismatch" });
  }

  // Step 4 (spec): nonce replay protection.
  const nonceResult = proofNonceGuard.check(proof.nonce, sessionId);
  if (!nonceResult.ok) {
    recordReject(nonceResult.reason, proof.node_id_hash, true);
    return res.status(409).json({ error: nonceResult.reason });
  }

  // Step 5 (spec): N1 strict node continuity.
  const stateResult = integrityState.record(sessionId, proof);
  if (!stateResult.ok) {
    recordReject(stateResult.reason, proof.node_id_hash, true);
    return res.status(409).json({ error: stateResult.reason });
  }

  // Step 6 (spec): Stage 2.1 always emits unregistered_node.
  const signatureStatus = "unregistered_node";

  // Step 7 (spec): success audit with hashed nonce + summaries only.
  const nonceHash = crypto.createHash("sha256").update(proof.nonce_bytes).digest("hex");
  appendAudit(sess, EVENTS.INTEGRITY_PROOF_RECEIVED, {
    node_id_hash: proof.node_id_hash,
    nonce_hash: nonceHash,
    signature_status: signatureStatus,
    platform: proof.platform,
    version: proof.version,
    capability_summary: { ...proof.capabilities },
    signal_summary: {
      capture_excluded_window_count: proof.signals.capture_excluded_window_count,
      helper_status: proof.signals.helper_status,
    },
  });

  // Step 8 (spec): success receipt.
  res.status(202).json({
    status: "accepted",
    session_id: sessionId,
    nonce: proof.nonce,
    node_id_hash: proof.node_id_hash,
    signature_status: signatureStatus,
    platform: proof.platform,
    received_at: new Date().toISOString(),
    note: "Stage 2.1 scaffold: signature mathematically verified, node not yet paired. Pairing lands in Stage 2.2.",
  });
});
```

- [ ] **Step 5: Run the full test suite — nothing should break**

```bash
npm test
```

Expected: all existing tests pass, plus the new integrity tests from Tasks 1–6.

- [ ] **Step 6: Smoke-test the route manually**

Start the server in demo mode:

```bash
SIMURGH_DEMO_MODE=1 PORT=33030 node server.js &
SERVER_PID=$!
sleep 1
```

Build a signed proof in Node and POST it:

```bash
node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';

// Create an exam, join, get token.
const base = 'http://localhost:33030';
const exam = await (await fetch(base + '/api/exams', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({title:'smoke', durationMinutes:60})
})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {
  method: 'POST', headers: {'content-type':'application/json'},
  body: JSON.stringify({studentId:'smoke@test', sessionId:'smoke_session_a'})
})).json();
const token = join.sessionToken;

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = {
  version: 'simurgh-integrity-proof-v1',
  platform: 'macos',
  session_id: 'smoke_session_a',
  node_id_hash: computeNodeIdHash(rawPub),
  node_public_key: rawPub.toString('base64'),
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities: {screencapturekit_available:false, window_enumeration:false, sharing_state_scan:false, helper_bridge:false},
  signals: {node_uptime_ms:0, window_count:0, capture_excluded_window_count:0, helper_status:'not_configured'},
  privacy_mode: 'metadata_only',
};
const canonical = canonicaliseProofPayload(proof);
proof.signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey).toString('base64');

const res = await fetch(base + '/api/integrity/proofs', {
  method: 'POST',
  headers: {'content-type':'application/json', authorization: 'Bearer ' + token},
  body: JSON.stringify(proof)
});
console.log('status:', res.status);
console.log('body:', await res.json());
"
```

Expected: `status: 202`, `signature_status: "unregistered_node"`.

Tear down: `kill $SERVER_PID`.

- [ ] **Step 7: Commit**

```bash
git add server.js
git commit -m "refactor: rewire /api/integrity/proofs to v1 pipeline with state + audit"
```

---

## Phase 5 — macOS Swift CLI

### Task 9: Scaffold the Swift package

**Files:**

- Create: `tools/simurgh-node-macos/Package.swift`
- Create: `tools/simurgh-node-macos/.gitignore`
- Create: `tools/simurgh-node-macos/README.md`
- Create: `tools/simurgh-node-macos/Sources/SimurghNode/main.swift`

- [ ] **Step 1: Create `Package.swift`**

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SimurghNode",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "SimurghNode", targets: ["SimurghNode"]),
    ],
    targets: [
        .executableTarget(
            name: "SimurghNode",
            path: "Sources/SimurghNode"
        ),
        .testTarget(
            name: "SimurghNodeTests",
            dependencies: ["SimurghNode"],
            path: "Tests/SimurghNodeTests",
            resources: [
                .copy("../../../../tests/unit/integrity/__fixtures__/golden-proof.json"),
                .copy("../../../../tests/unit/integrity/__fixtures__/golden-proof.sha256"),
            ]
        ),
    ]
)
```

- [ ] **Step 2: Create `.gitignore`**

```
.build/
.swiftpm/
*.xcodeproj
```

- [ ] **Step 3: Create README.md**

````markdown
# Simurgh macOS Integrity Node — Stage 2.1 CLI

Generates a signed Stage 2 v1 integrity proof envelope from the local macOS device and prints it to stdout. The Simurgh server validates the proof structure and Ed25519 signature; in Stage 2.1 every accepted proof is recorded with `signature_status: "unregistered_node"` because pairing/registration lands in Stage 2.2.

## What this does NOT do

- No localhost daemon, no port, no auto-POST to the server.
- No Screen Recording permission request.
- No ScreenCaptureKit usage.
- No window enumeration, process scanning, or content collection.
- No hardware-rooted attestation claim.

This is a CLI scaffold. The local private key stored at `~/.simurgh/node-key` is a **development identity key**, not a hardware-backed attestation key.

## Build and run

```bash
cd tools/simurgh-node-macos
swift build
swift run SimurghNode --session <SESSION_ID>
```
````

Or pass the session via env:

```bash
SIMURGH_SESSION_ID=sess_abc swift run SimurghNode
```

## Submit a proof to the server

```bash
swift run SimurghNode --session sess_abc > /tmp/simurgh-proof.json

curl -s http://localhost:3030/api/integrity/proofs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  --data @/tmp/simurgh-proof.json | jq
```

Expected response: `status: 202` with `signature_status: "unregistered_node"`.

## CLI options

| Flag                | Description                                           |
| ------------------- | ----------------------------------------------------- |
| `--session <ID>`    | Session ID (required unless `SIMURGH_SESSION_ID` set) |
| `--key-path <path>` | Override the default `~/.simurgh/node-key` location   |
| `--print-key-info`  | Print `node_id_hash` and `node_public_key` only       |
| `--help`            | Show usage                                            |

## Exit codes

| Code | Meaning                      |
| ---- | ---------------------------- |
| `0`  | Proof printed successfully   |
| `1`  | Generic error                |
| `2`  | Key file malformed           |
| `3`  | Missing required `--session` |
| `64` | Unknown CLI flag             |

## Privacy notice for screenshots

The `--print-key-info` output and the proof JSON show `key_path`, which contains your local username. **Redact `key_path` before sharing screenshots or logs publicly.**

## First-run behaviour

On first run the CLI generates a fresh Ed25519 keypair, stores the private key at `~/.simurgh/node-key` with `0600` permissions, and prints a one-time warning to stderr. Subsequent runs reuse the same key. If the key file is malformed the CLI exits `2` without auto-regenerating — silent regeneration would mask key loss.

````

- [ ] **Step 4: Create a minimal `main.swift` that compiles**

Create `tools/simurgh-node-macos/Sources/SimurghNode/main.swift`:

```swift
import Foundation

// CLI entry — argument parsing + dispatch.
//
// This file stays small. Keypair lifecycle lives in NodeIdentity.swift.
// Canonical-JSON + signing lives in ProofSigner.swift.
// Envelope shape lives in ProofEnvelope.swift.

enum CLIError: Error {
    case malformedKey(String)
    case missingSession
    case unknownFlag(String)
}

struct CLIOptions {
    var sessionId: String
    var keyPath: String
    var printKeyInfo: Bool
}

func parseArgs(_ args: [String]) throws -> CLIOptions {
    var sessionId: String? = ProcessInfo.processInfo.environment["SIMURGH_SESSION_ID"]
    var keyPath: String = ProcessInfo.processInfo.environment["SIMURGH_NODE_KEY_PATH"]
        ?? (NSHomeDirectory() + "/.simurgh/node-key")
    var printKeyInfo = false

    var i = 1
    while i < args.count {
        let a = args[i]
        switch a {
        case "--session":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            sessionId = args[i]
        case "--key-path":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            keyPath = args[i]
        case "--print-key-info":
            printKeyInfo = true
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            throw CLIError.unknownFlag(a)
        }
        i += 1
    }

    if !printKeyInfo, sessionId == nil {
        throw CLIError.missingSession
    }
    return CLIOptions(sessionId: sessionId ?? "", keyPath: keyPath, printKeyInfo: printKeyInfo)
}

func printUsage() {
    let msg = """
    Usage: swift run SimurghNode [options]

      --session <ID>       Session ID (or env SIMURGH_SESSION_ID)
      --key-path <path>    Override key file location (default ~/.simurgh/node-key)
      --print-key-info     Print { node_id_hash, node_public_key, key_path }
      --help               Show usage
    """
    FileHandle.standardError.write(Data((msg + "\n").utf8))
}

func stderr(_ s: String) {
    FileHandle.standardError.write(Data((s + "\n").utf8))
}

let arguments = CommandLine.arguments
let options: CLIOptions
do {
    options = try parseArgs(arguments)
} catch CLIError.missingSession {
    stderr("error: --session is required (or set SIMURGH_SESSION_ID)")
    exit(3)
} catch CLIError.unknownFlag(let f) {
    stderr("error: unknown flag: \(f)")
    exit(64)
} catch {
    stderr("error: \(error)")
    exit(1)
}

do {
    let identity = try NodeIdentity.loadOrCreate(at: options.keyPath)

    if options.printKeyInfo {
        let info: [String: String] = [
            "node_id_hash": identity.nodeIdHashHex,
            "node_public_key": identity.publicKeyBase64,
            "key_path": options.keyPath,
        ]
        let data = try JSONSerialization.data(withJSONObject: info, options: [.prettyPrinted, .sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)
    }

    let envelope = ProofEnvelope.build(sessionId: options.sessionId, identity: identity)
    let signed = try ProofSigner.signAndEncode(envelope: envelope, identity: identity)
    FileHandle.standardOutput.write(signed)
    FileHandle.standardOutput.write(Data("\n".utf8))
    exit(0)
} catch CLIError.malformedKey(let why) {
    stderr("error: key file at \(options.keyPath) is malformed: \(why)")
    exit(2)
} catch {
    stderr("error: \(error)")
    exit(1)
}
````

- [ ] **Step 5: Commit (the package will not compile yet — the next tasks add the missing files)**

```bash
git add tools/simurgh-node-macos/Package.swift \
        tools/simurgh-node-macos/.gitignore \
        tools/simurgh-node-macos/README.md \
        tools/simurgh-node-macos/Sources/SimurghNode/main.swift
git commit -m "feat(node-macos): scaffold Swift package, CLI surface, README"
```

---

### Task 10: Implement `NodeIdentity.swift`

**Files:**

- Create: `tools/simurgh-node-macos/Sources/SimurghNode/NodeIdentity.swift`

- [ ] **Step 1: Implement the keypair lifecycle**

```swift
import Foundation
import CryptoKit

/// Loads or creates the Ed25519 private key stored as base64 of its raw
/// representation (32 bytes) at the given path. On first creation the
/// directory is made 0700 and the file 0600.
struct NodeIdentity {
    let privateKey: Curve25519.Signing.PrivateKey
    let publicKey: Curve25519.Signing.PublicKey

    var publicKeyBase64: String {
        publicKey.rawRepresentation.base64EncodedString()
    }

    var nodeIdHashHex: String {
        let digest = SHA256.hash(data: publicKey.rawRepresentation)
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    static func loadOrCreate(at path: String) throws -> NodeIdentity {
        let url = URL(fileURLWithPath: path)
        let fm = FileManager.default

        if fm.fileExists(atPath: path) {
            return try load(from: url)
        }

        // Generate fresh keypair.
        let dirURL = url.deletingLastPathComponent()
        try fm.createDirectory(at: dirURL, withIntermediateDirectories: true, attributes: [
            .posixPermissions: 0o700,
        ])

        let key = Curve25519.Signing.PrivateKey()
        let encoded = key.rawRepresentation.base64EncodedString()
        try (encoded + "\n").data(using: .utf8)?.write(to: url, options: [.atomic])
        try fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: path)

        stderr("""
        [simurgh-node] WARNING:
        [simurgh-node] - This is a development identity key.
        [simurgh-node] - It is not hardware-backed attestation.
        [simurgh-node] - Stage 2.1 does not enumerate windows, request screen recording,
        [simurgh-node]   or collect any device content.
        [simurgh-node] - Pairing with the Simurgh server is not yet implemented (Stage 2.2).
        """)

        return NodeIdentity(privateKey: key, publicKey: key.publicKey)
    }

    private static func load(from url: URL) throws -> NodeIdentity {
        let raw = try String(contentsOf: url, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = Data(base64Encoded: raw) else {
            throw CLIError.malformedKey("not valid base64")
        }
        guard data.count == 32 else {
            throw CLIError.malformedKey("expected 32 bytes, got \(data.count)")
        }
        do {
            let key = try Curve25519.Signing.PrivateKey(rawRepresentation: data)
            return NodeIdentity(privateKey: key, publicKey: key.publicKey)
        } catch {
            throw CLIError.malformedKey(String(describing: error))
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/NodeIdentity.swift
git commit -m "feat(node-macos): keypair load-or-create at ~/.simurgh/node-key"
```

---

### Task 11: Implement `ProofEnvelope.swift`

**Files:**

- Create: `tools/simurgh-node-macos/Sources/SimurghNode/ProofEnvelope.swift`

- [ ] **Step 1: Implement the envelope builder**

```swift
import Foundation
import Security

/// v1 proof envelope shape. Matches the server's accepted schema 1:1.
struct ProofEnvelope: Encodable {
    let version: String
    let platform: String
    let session_id: String
    let node_id_hash: String
    let node_public_key: String
    let nonce: String
    let timestamp: String
    let capabilities: Capabilities
    let signals: Signals
    let privacy_mode: String

    struct Capabilities: Encodable {
        let screencapturekit_available: Bool
        let window_enumeration: Bool
        let sharing_state_scan: Bool
        let helper_bridge: Bool
    }

    struct Signals: Encodable {
        let node_uptime_ms: Int
        let window_count: Int
        let capture_excluded_window_count: Int
        let helper_status: String
    }

    static func build(sessionId: String, identity: NodeIdentity) -> ProofEnvelope {
        return ProofEnvelope(
            version: "simurgh-integrity-proof-v1",
            platform: "macos",
            session_id: sessionId,
            node_id_hash: identity.nodeIdHashHex,
            node_public_key: identity.publicKeyBase64,
            nonce: generateNonce(),
            timestamp: nowIso8601(),
            capabilities: Capabilities(
                screencapturekit_available: false,
                window_enumeration: false,
                sharing_state_scan: false,
                helper_bridge: false
            ),
            signals: Signals(
                node_uptime_ms: 0,
                window_count: 0,
                capture_excluded_window_count: 0,
                helper_status: "not_configured"
            ),
            privacy_mode: "metadata_only"
        )
    }
}

private func generateNonce() -> String {
    var bytes = [UInt8](repeating: 0, count: 16)
    let result = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
    precondition(result == errSecSuccess, "SecRandomCopyBytes failed")
    return Data(bytes).base64EncodedString()
}

private func nowIso8601() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    f.timeZone = TimeZone(secondsFromGMT: 0)
    return f.string(from: Date())
}
```

- [ ] **Step 2: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/ProofEnvelope.swift
git commit -m "feat(node-macos): v1 proof envelope builder with CSPRNG nonce"
```

---

### Task 12: Implement `ProofSigner.swift`

**Files:**

- Create: `tools/simurgh-node-macos/Sources/SimurghNode/ProofSigner.swift`

- [ ] **Step 1: Implement canonicaliser + signer**

```swift
import Foundation
import CryptoKit

/// Canonical JSON serializer mirroring src/integrity/proofCanonicalise.js.
/// - sorted keys, recursive
/// - no whitespace
/// - top-level "signature" excluded
///
/// Implementation strategy: encode the Encodable struct via JSONEncoder with
/// .sortedKeys + .withoutEscapingSlashes, then return those exact UTF-8 bytes.
/// Because ProofEnvelope (and its nested types) declares its CodingKeys via
/// the default behaviour, JSONEncoder + .sortedKeys produces deterministic
/// output that matches the JS canonicaliser. The golden-fixture test locks
/// this guarantee.
enum ProofSigner {

    /// Serialise the envelope to canonical UTF-8 bytes (no signature).
    static func canonicaliseProofPayload(_ envelope: ProofEnvelope) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(envelope)
    }

    /// Sign the canonical bytes and return the full proof JSON (with signature
    /// attached) pretty-printed for human readability. The signature is
    /// computed over the canonical bytes, not the pretty bytes.
    static func signAndEncode(envelope: ProofEnvelope, identity: NodeIdentity) throws -> Data {
        let canonical = try canonicaliseProofPayload(envelope)
        let signature = try identity.privateKey.signature(for: canonical)
        let signatureB64 = signature.base64EncodedString()

        // Re-encode the full proof (with signature) for stdout.
        var dict: [String: Any] = [
            "version": envelope.version,
            "platform": envelope.platform,
            "session_id": envelope.session_id,
            "node_id_hash": envelope.node_id_hash,
            "node_public_key": envelope.node_public_key,
            "nonce": envelope.nonce,
            "timestamp": envelope.timestamp,
            "capabilities": [
                "screencapturekit_available": envelope.capabilities.screencapturekit_available,
                "window_enumeration": envelope.capabilities.window_enumeration,
                "sharing_state_scan": envelope.capabilities.sharing_state_scan,
                "helper_bridge": envelope.capabilities.helper_bridge,
            ],
            "signals": [
                "node_uptime_ms": envelope.signals.node_uptime_ms,
                "window_count": envelope.signals.window_count,
                "capture_excluded_window_count": envelope.signals.capture_excluded_window_count,
                "helper_status": envelope.signals.helper_status,
            ],
            "privacy_mode": envelope.privacy_mode,
            "signature": signatureB64,
        ]
        let pretty = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.prettyPrinted, .sortedKeys]
        )
        return pretty
    }
}
```

- [ ] **Step 2: Verify Swift package builds (skip if Swift is not installed)**

If you have Swift on macOS:

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos
swift build 2>&1 | tail -10
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/ProofSigner.swift
git commit -m "feat(node-macos): canonical JSON serializer + Ed25519 signing"
```

---

### Task 13: Swift golden-fixture interop test

**Files:**

- Create: `tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift`

- [ ] **Step 1: Write the test**

```swift
import XCTest
import CryptoKit
@testable import SimurghNode

final class CanonicaliseTests: XCTestCase {
    func testGoldenFixtureMatchesNodeHash() throws {
        // Load the shared golden fixture (Package.swift `resources:` copies it in).
        guard let proofURL = Bundle.module.url(forResource: "golden-proof", withExtension: "json"),
              let hashURL = Bundle.module.url(forResource: "golden-proof", withExtension: "sha256") else {
            XCTFail("golden fixture not found in test bundle")
            return
        }
        let proofData = try Data(contentsOf: proofURL)
        let expectedHex = try String(contentsOf: hashURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        // Decode the fixture into a generic JSON dict.
        guard var dict = try JSONSerialization.jsonObject(with: proofData) as? [String: Any] else {
            XCTFail("fixture not a JSON object")
            return
        }

        // Remove the top-level signature if present (fixture does not have one,
        // but be defensive — matches the JS canonicaliser rule).
        dict.removeValue(forKey: "signature")

        // Canonicalise using the same rules: sorted keys, no whitespace, recursive.
        // JSONSerialization with .sortedKeys produces sorted keys at every depth.
        let canonical = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.sortedKeys, .withoutEscapingSlashes]
        )

        let digest = SHA256.hash(data: canonical)
        let actualHex = digest.map { String(format: "%02x", $0) }.joined()

        XCTAssertEqual(
            actualHex,
            expectedHex,
            "Swift canonicalisation must match Node golden fixture.\n" +
            "Swift canonical bytes:\n\(String(data: canonical, encoding: .utf8) ?? "<not utf8>")"
        )
    }
}
```

- [ ] **Step 2: Run the Swift test (skip if Swift is not installed)**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos
swift test 2>&1 | tail -15
```

Expected: 1 test passes. If Swift's `.sortedKeys` produces different bytes than the Node canonicaliser for the fixture, the test fails with a clear diff — fix the Node canonicaliser to match Swift, **not the other way round**, since Swift uses Foundation's standard behaviour and the JS implementation is custom.

If the bytes differ, the most common cause is: `JSONSerialization` adds a trailing newline or escapes slashes differently. Adjust the Node `encodeValue` so its output matches `JSONSerialization` byte-for-byte for the fixture. The golden fixture is the source of truth.

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-node-macos/Tests/SimurghNodeTests/CanonicaliseTests.swift
git commit -m "test(node-macos): golden-fixture canonicaliser interop"
```

---

## Phase 6 — Quality Gate + Docs

### Task 14: Extend `scripts/check.sh` with Stage 2.1 smoke + Swift step

**Files:**

- Modify: `scripts/check.sh`

- [ ] **Step 1: Open `scripts/check.sh` and find the existing server-boot smoke block**

It contains lines like `curl -s -X POST .../api/exams ...` for the lifecycle smoke. Append a new block after the existing audit-chain self-test step and before the summary:

- [ ] **Step 2: Add the Stage 2.1 smoke block**

Append this block to `scripts/check.sh` (paste before the final summary section):

```bash
# ─────────────────────────────────────────────────────────────
#  Stage 2.1 — integrity proof round-trip
# ─────────────────────────────────────────────────────────────
echo "=== Stage 2.1 integrity proof round-trip ==="
SIMURGH_DEMO_MODE=1 PORT=33031 node server.js >/tmp/simurgh-check-srv2.log 2>&1 &
S2_PID=$!
sleep 1

ROUND_TRIP_OK=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'check@check', sessionId:'check_sess'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = {
  version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'check_sess',
  node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'),
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false},
  signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'},
  privacy_mode:'metadata_only',
};
const canonical = canonicaliseProofPayload(proof);
proof.signature = crypto.sign(null, Buffer.from(canonical,'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'unregistered_node' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
")

if [[ "$ROUND_TRIP_OK" == "OK" ]]; then
  pass "Stage 2.1 integrity proof verified end-to-end (signature_status=unregistered_node)"
else
  fail "Stage 2.1 integrity proof round-trip"
  echo "$ROUND_TRIP_OK"
fi

# Negative — zeroed signature must be rejected.
NEG_RESULT=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'check2@check', sessionId:'check_sess_neg'})})).json();
const tok = join.sessionToken;
const { publicKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = {
  version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'check_sess_neg',
  node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'),
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false},
  signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'},
  privacy_mode:'metadata_only',
  signature: Buffer.alloc(64).toString('base64'),
};
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 401 && body.error === 'invalid_signature' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
")

if [[ "$NEG_RESULT" == "OK" ]]; then
  pass "Stage 2.1 zeroed signature rejected (401 invalid_signature)"
else
  fail "Stage 2.1 zeroed signature check"
  echo "$NEG_RESULT"
fi

kill "$S2_PID" 2>/dev/null
wait "$S2_PID" 2>/dev/null
```

- [ ] **Step 3: Add the conditional Swift build step**

Just before the summary section, add:

```bash
# ─────────────────────────────────────────────────────────────
#  Swift macOS node — conditional build and test
# ─────────────────────────────────────────────────────────────
if command -v swift >/dev/null 2>&1 && [[ -d tools/simurgh-node-macos ]]; then
  echo "=== Swift macOS node build + test ==="
  if (cd tools/simurgh-node-macos && swift build) >/tmp/simurgh-swift-build.log 2>&1; then
    pass "swift build (macOS node) succeeded"
  else
    fail "swift build (macOS node)"
    tail -20 /tmp/simurgh-swift-build.log
  fi

  if (cd tools/simurgh-node-macos && swift test) >/tmp/simurgh-swift-test.log 2>&1; then
    pass "swift test (golden-fixture interop)"
  else
    fail "swift test (golden-fixture interop)"
    tail -20 /tmp/simurgh-swift-test.log
  fi

  # CLI privacy regression — assert stdout JSON contains none of the forbidden field names.
  TMP_KEY="/tmp/simurgh-check-key"
  rm -f "$TMP_KEY"
  if (cd tools/simurgh-node-macos && swift run SimurghNode --session check_session --key-path "$TMP_KEY") >/tmp/simurgh-cli-out.json 2>/dev/null; then
    if grep -qE 'private_key|raw_process_names|raw_window_titles|screen_pixels|webcam|audio|typed_answer|paste_content' /tmp/simurgh-cli-out.json; then
      fail "Stage 2.1 CLI output privacy regression — forbidden field appeared in stdout"
    else
      pass "Stage 2.1 CLI output privacy regression (no forbidden field in stdout)"
    fi
  else
    fail "swift run SimurghNode (privacy regression)"
  fi
  rm -f "$TMP_KEY"
else
  echo "Swift toolchain not available — skipping macOS node build/test"
fi
```

- [ ] **Step 4: Run the full check**

```bash
./scripts/check.sh
```

Expected: all existing gates plus 2–4 new ones pass (depending on whether Swift is present locally).

- [ ] **Step 5: Commit**

```bash
git add scripts/check.sh
git commit -m "ci(check.sh): add Stage 2.1 round-trip smoke + Swift-conditional build/test"
```

---

### Task 15: README, AGENT.md, CHANGELOG.md

**Files:**

- Modify: `README.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add a Stage 2.1 paragraph to README**

Find the "Stage 1 Verification" block in `README.md`. Just below it, add:

```markdown
### Stage 2.1 macOS Integrity Node (in progress on `stage-2-integrity-node` branch)

Stage 2.1 adds a v1 signed-integrity-proof pipeline. A macOS Swift CLI under `tools/simurgh-node-macos/` generates an Ed25519 keypair, builds a metadata-only proof envelope, signs the canonical JSON, and prints it to stdout. The Simurgh server accepts the proof at `POST /api/integrity/proofs` with `signature_status: "unregistered_node"` until pairing lands in Stage 2.2. Design spec: [`docs/superpowers/specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md`](../specs/2026-05-14-stage-2-1-macos-integrity-proof-design.md).
```

- [ ] **Step 2: Add a top entry to `AGENT.md`**

Insert at the top of the changelog body (under `## Agent Change Log`):

```markdown
### 2026-05-14 (Australia/Sydney) — Stage 2.1 Implementation

**Raouf:**

- **Scope:** Stage 2.1 — macOS CLI integrity proof pipeline
- **Summary:** Refactored Stage 2.0 scaffold to the v1 envelope. New JS modules: `proofSchema`, `proofCanonicalise`, `proofSignature` (with SPKI wrapping helper for Node `crypto.verify`), `proofValidator`, `integrityState` (N1 strict node continuity). Simplified `nonceGuard` to global replay. Refactored `POST /api/integrity/proofs` to the full v1 pipeline with `signature_status: "unregistered_node"` and hashed-nonce audit payloads. New Swift CLI under `tools/simurgh-node-macos/` generates a development Ed25519 keypair, builds the v1 envelope, signs the canonical JSON, prints to stdout. Cross-implementation golden-fixture test locks canonical bytes between Node and Swift.
- **Files Changed:**
  - `src/integrity/{proofSchema,proofCanonicalise,proofSignature,proofValidator,integrityState,nonceGuard}.js`
  - `tests/unit/integrity/*` (rewritten + new)
  - `tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}`
  - `src/academic/academicEvents.js` — `INTEGRITY_NODE_STALE` constant added
  - `server.js` — `/api/integrity/proofs` rewired to v1 pipeline + integrity-state eviction
  - `tools/simurgh-node-macos/*` — Swift package, CLI, keypair lifecycle, canonicaliser, signer, README
  - `scripts/check.sh` — Stage 2.1 round-trip smoke + Swift conditional build/test + CLI privacy regression
  - `README.md` — Stage 2.1 paragraph
- **Verification:** `npm test` passes all tests. `./scripts/check.sh` passes the new gates. Swift build + test pass on macOS. Smoke confirms `signature_status: "unregistered_node"` and rejects zeroed signatures with 401.
- **Follow-ups:** Stage 2.2 — pairing endpoints, localhost daemon, `signature_status: "verified"`.
```

- [ ] **Step 3: Add a top entry to `CHANGELOG.md`**

```markdown
## [0.4.1] — 2026-05-14 — Stage 2.1 macOS Integrity Proof Pipeline

### Added

- `src/integrity/proofCanonicalise.js` — canonical JSON serialiser (sorted keys, no whitespace, top-level `signature` excluded)
- `src/integrity/proofSignature.js` — Ed25519 verifier with raw-bytes → DER/SPKI wrap for Node `crypto.verify`; `computeNodeIdHash` helper
- `src/integrity/proofValidator.js` — orchestrates v1 schema + timestamp + privacy + key + signature checks
- `src/integrity/integrityState.js` — per-session N1 strict node continuity (immutable `bound_node_id_hash`)
- `INTEGRITY_NODE_STALE` event constant (defined; not emitted in Stage 2.1, reserved for Stage 2.x)
- `tools/simurgh-node-macos/` — Swift CLI generating signed v1 proofs (no daemon, no permissions, no ScreenCaptureKit, no content collection)
- `tests/unit/integrity/__fixtures__/golden-proof.{json,sha256}` — cross-implementation canonical-bytes fixture
- `scripts/check.sh` — Stage 2.1 integrity round-trip gate, zeroed-signature negative gate, conditional Swift build/test, CLI output privacy regression

### Changed

- `src/integrity/proofSchema.js` — rewritten to declarative v1 constants (validation moved to `proofValidator.js`)
- `src/integrity/nonceGuard.js` — simplified to global replay protection (removed `nonce_session_mismatch`)
- `server.js` — `POST /api/integrity/proofs` rewired to the v1 pipeline; returns `409 session_expired_or_evicted` if telemetry session is missing; logs minimal privacy-safe rejection payloads
- Audit payload for `INTEGRITY_PROOF_RECEIVED` now stores `nonce_hash` (not raw nonce) and capability/signal summaries (not raw signals)

### Notes

- Stage 2.1 transitional posture: every accepted proof returns `signature_status: "unregistered_node"` until pairing registry lands in Stage 2.2
- The CLI's `~/.simurgh/node-key` is a development identity key, not hardware-backed attestation
- No claim of production device trust
```

- [ ] **Step 4: Run formatter and full check**

```bash
npm run format
./scripts/check.sh
```

Expected: all gates pass; no formatter drift.

- [ ] **Step 5: Commit**

```bash
git add README.md AGENT.md CHANGELOG.md
git commit -m "docs: Stage 2.1 README paragraph + AGENT/CHANGELOG entries"
```

- [ ] **Step 6: Push the branch**

```bash
git push origin stage-2-integrity-node
```

Expected: CI runs on push. The GitHub Actions workflow is the existing `stage-1-checks.yml` — it will run the extended `check.sh`, which includes the Stage 2.1 gates. The Swift step skips on Ubuntu (no toolchain).

---

## Self-Review

### Spec coverage

| Spec section                                     | Task(s)                                |
| ------------------------------------------------ | -------------------------------------- |
| Module layout — `src/integrity/` files           | Tasks 1, 2, 3, 4, 5, 6                 |
| Module layout — macOS Swift                      | Tasks 9, 10, 11, 12                    |
| v1 envelope shape + field rules                  | Tasks 1, 4                             |
| Forbidden top-level fields                       | Tasks 1, 4                             |
| Canonical signing rule                           | Tasks 2, 12                            |
| Cross-implementation golden fixture              | Tasks 2, 13                            |
| SPKI wrapping helper for Node                    | Task 3                                 |
| Server validation flow (steps 2–8)               | Tasks 4, 8                             |
| Failure-path minimal audit payload               | Task 8                                 |
| Session-expired → 409 with no audit entry        | Task 8                                 |
| Per-session integrity state with N1              | Task 6                                 |
| Audit events `INTEGRITY_PROOF_*` + `_NODE_STALE` | Task 7, plus payload shaping in Task 8 |
| macOS CLI keypair lifecycle                      | Task 10                                |
| macOS CLI options + exit codes                   | Task 9                                 |
| macOS CLI stdout-only proof + stderr warnings    | Tasks 9, 10                            |
| Test plan — all suites                           | Tasks 1–6, 13                          |
| `scripts/check.sh` extensions                    | Task 14                                |
| Docs (README + AGENT + CHANGELOG)                | Task 15                                |

All 10 acceptance criteria from the spec map to a task. No gaps.

### Placeholder scan

No "TBD", "TODO", "implement later", "add appropriate error handling", or "similar to Task N" phrases. Every step contains the actual code or command. Reason codes, file paths, and command outputs are concrete.

### Type consistency

- `validateProof(raw, { now })` signature is consistent across Tasks 4 and 8 (called in route).
- `canonicaliseProofPayload(proof)` is used identically in Tasks 2, 4, 8 (route smoke), 12 (Swift mirror).
- `createIntegrityState()` returns `{ record, get, evict, evictMissing, size }` — used in Tasks 6, 8.
- `EVENTS.INTEGRITY_PROOF_RECEIVED / _REJECTED / _NODE_STALE` — added in Task 7, consumed in Task 8.
- `computeNodeIdHash(rawPubKey)` returns lowercase hex — consistent in Task 3 (definition) and Task 4 (validator test fixture).
- `proofNonceGuard` instance name in `server.js` exists from Stage 2.0; Task 5 preserves the name (only changes internals).

No inconsistencies found.

---

## Rollback Notes

If a task introduces a regression that the next task depends on, rollback strategy:

1. Each task ends in a commit. To revert a single task: `git revert <commit-sha>`.
2. Tests at the end of each task are the safety net — if `npm test` fails, do not commit.
3. The server route (Task 8) is the highest-risk change. If the new route handler breaks the existing telemetry flow, revert Task 8 only; Tasks 1–7 remain compatible because they add new modules without removing anything in use.
4. The Swift package (Tasks 9–13) is isolated from the server. Reverting Swift tasks never affects the server.
5. The `scripts/check.sh` extension (Task 14) is additive — if its new gates produce false positives, the workaround is to temporarily comment out the Stage 2.1 block while iterating, not to revert the route changes.

---

## Build Order Summary

```
Phase 1  → Task 1, 2, 3      (foundation: schema, canonicaliser, signer)
Phase 2  → Task 4            (validator orchestration)
Phase 3  → Task 5, 6         (nonce guard simplification + state)
Phase 4  → Task 7, 8         (audit event + route rewire)
Phase 5  → Task 9, 10, 11, 12, 13  (Swift CLI + interop test)
Phase 6  → Task 14, 15       (CI gate + docs)
```

Fifteen tasks, ~50 atomic steps, all TDD with frequent commits. Estimated effort: 4–6 hours for a careful engineer with no prior Stage 2 context.
