# Stage 2.2 — macOS Node Pairing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind one browser exam session to one macOS node public key. After pairing, integrity proofs from the registered node return `signature_status: "verified"` instead of `"unregistered_node"`.

**Architecture:** Five focused JS modules under `src/integrity/` (`pairingSchema`, `pairingCanonicalise`, `pairingValidator`, `pairingRegistry`, plus an update to `proofValidator`) wire two new server routes (`POST /api/integrity/pairing/challenge` and `/complete`) and upgrade `POST /api/integrity/proofs`. The Swift CLI gains a `pair` subcommand. Cross-implementation byte equality is locked by a `golden-pairing-payload` fixture used by both the Node canonicaliser test and the new Swift `PairingCanonicaliseTests`. Stage 2.1 unpaired flow is preserved verbatim.

**Tech Stack:** Node.js 22 (ESM, `node:crypto`, `node:test`), Express 4, Swift 5.9+ with `CryptoKit` + `Foundation` (no external deps), Prettier 3.

**Design spec:** `docs/superpowers/specs/2026-05-14-stage-2-2-macos-node-pairing-design.md`

---

## File Structure

### Server (new + updated)

| File                                   | Status | Responsibility                                                                                                              |
| -------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/integrity/pairingSchema.js`       | new    | v1 pairing constants, REQUIRED_FIELDS (8 keys), FORBIDDEN_FIELDS (re-uses proof list), byte-length and regex constants      |
| `src/integrity/pairingCanonicalise.js` | new    | one-line re-export of `canonicaliseProofPayload` as `canonicalisePairingPayload`                                            |
| `src/integrity/pairingValidator.js`    | new    | `validatePairingProof(raw, { now, expectedSessionId })` — schema + crypto                                                   |
| `src/integrity/pairingRegistry.js`     | new    | `createPairingRegistry({ challengeTtlMs })`; injectable `now`; pending/paired state                                         |
| `src/integrity/proofValidator.js`      | modify | accepts `pairedNode` + `expectedSessionId`; returns `signature_status`; E1 strict triple check                              |
| `src/academic/academicEvents.js`       | modify | + `INTEGRITY_PAIRING_CHALLENGE_CREATED`, `INTEGRITY_NODE_PAIRED`, `INTEGRITY_PAIRING_REJECTED`                              |
| `server.js`                            | modify | new `/pairing/challenge` + `/pairing/complete` routes (rate-limited); `proofs` route uses registry; eviction timer extended |

### Server tests (new + updated)

| File                                                              | Status                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `tests/unit/integrity/pairingSchema.test.js`                      | new                                                   |
| `tests/unit/integrity/pairingCanonicalise.test.js`                | new                                                   |
| `tests/unit/integrity/pairingValidator.test.js`                   | new                                                   |
| `tests/unit/integrity/pairingRegistry.test.js`                    | new                                                   |
| `tests/unit/integrity/proofValidator.test.js`                     | extended (paired-session cases)                       |
| `tests/unit/academicEvents.test.js`                               | extended (3 new constants + audit-absence assertions) |
| `tests/unit/integrity/__fixtures__/golden-pairing-payload.json`   | new                                                   |
| `tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256` | new                                                   |

### macOS Swift CLI (new + updated)

| File                                                                                     | Status                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------- |
| `tools/simurgh-node-macos/Sources/SimurghNode/main.swift`                                | modify — strict subcommand dispatch    |
| `tools/simurgh-node-macos/Sources/SimurghNode/PairingEnvelope.swift`                     | new                                    |
| `tools/simurgh-node-macos/Sources/SimurghNode/PairingSigner.swift`                       | new                                    |
| `tools/simurgh-node-macos/Package.swift`                                                 | modify — add pairing fixture resources |
| `tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift`         | new                                    |
| `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json`   | new (synced copy)                      |
| `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256` | new (synced copy)                      |
| `tools/simurgh-node-macos/README.md`                                                     | modify — pair subcommand examples      |

### Tooling + docs

| File               | Status                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `scripts/check.sh` | extend — 4 new gates (pairing round-trip + paired/unpaired proof checks); golden fixture sync extended to both pairs |
| `README.md`        | add Stage 2.2 paragraph                                                                                              |
| `AGENT.md`         | add Stage 2.2 implementation entry                                                                                   |
| `CHANGELOG.md`     | add `0.4.2-stage-2-2-macos-node-pairing` entry                                                                       |

---

## Phase 1 — Pairing Schema + Canonicaliser + Registry

### Task 1: `pairingSchema.js`

**Files:**

- Create: `src/integrity/pairingSchema.js`
- Create: `tests/unit/integrity/pairingSchema.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/integrity/pairingSchema.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PAIRING_VERSION,
  PAIRING_PLATFORM,
  PAIRING_REQUIRED_FIELDS,
  PAIRING_FORBIDDEN_FIELDS,
  PAIRING_TIMESTAMP_PAST_MS,
  PAIRING_TIMESTAMP_FUTURE_MS,
  PAIRING_PUBLIC_KEY_BYTES,
  PAIRING_CHALLENGE_BYTES,
  PAIRING_SIGNATURE_BYTES,
  PAIRING_SESSION_ID_PATTERN,
  PAIRING_NODE_ID_HASH_PATTERN,
} from "../../../src/integrity/pairingSchema.js";
import { FORBIDDEN_FIELDS as PROOF_FORBIDDEN } from "../../../src/integrity/proofSchema.js";

describe("pairingSchema constants", () => {
  test("version and platform are pairing-v1 / macos", () => {
    assert.equal(PAIRING_VERSION, "simurgh-pairing-proof-v1");
    assert.equal(PAIRING_PLATFORM, "macos");
  });

  test("REQUIRED_FIELDS lists exactly the 8 v1 top-level fields", () => {
    assert.equal(PAIRING_REQUIRED_FIELDS.length, 8);
    for (const f of [
      "version",
      "platform",
      "session_id",
      "node_id_hash",
      "node_public_key",
      "challenge",
      "timestamp",
      "signature",
    ]) {
      assert.ok(PAIRING_REQUIRED_FIELDS.includes(f), `missing required: ${f}`);
    }
  });

  test("FORBIDDEN_FIELDS reuses the proof forbidden list", () => {
    for (const f of PROOF_FORBIDDEN) {
      assert.ok(PAIRING_FORBIDDEN_FIELDS.has(f), `missing forbidden: ${f}`);
    }
  });

  test("timestamp windows match proof (30s past, 5s future)", () => {
    assert.equal(PAIRING_TIMESTAMP_PAST_MS, 30_000);
    assert.equal(PAIRING_TIMESTAMP_FUTURE_MS, 5_000);
  });

  test("byte-length constants: public_key 32, challenge 32, signature 64", () => {
    assert.equal(PAIRING_PUBLIC_KEY_BYTES, 32);
    assert.equal(PAIRING_CHALLENGE_BYTES, 32);
    assert.equal(PAIRING_SIGNATURE_BYTES, 64);
  });

  test("regex patterns match expected formats", () => {
    assert.ok(PAIRING_SESSION_ID_PATTERN.test("sess_abc"));
    assert.ok(!PAIRING_SESSION_ID_PATTERN.test("../etc/passwd"));
    assert.ok(PAIRING_NODE_ID_HASH_PATTERN.test("a".repeat(64)));
    assert.ok(!PAIRING_NODE_ID_HASH_PATTERN.test("A".repeat(64)));
  });
});
```

- [ ] **Step 2: Run test — expect module-not-found**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh && node --test tests/unit/integrity/pairingSchema.test.js 2>&1 | tail -5
```

- [ ] **Step 3: Create the module**

Create `src/integrity/pairingSchema.js`:

```js
// Stage 2.2 v1 pairing schema constants — purely declarative.
// Validation logic lives in pairingValidator.js.
import { FORBIDDEN_FIELDS as PROOF_FORBIDDEN_FIELDS } from "./proofSchema.js";

export const PAIRING_VERSION = "simurgh-pairing-proof-v1";
export const PAIRING_PLATFORM = "macos";

// Same timestamp tolerances as integrity proofs.
export const PAIRING_TIMESTAMP_PAST_MS = 30_000;
export const PAIRING_TIMESTAMP_FUTURE_MS = 5_000;

// Pairing envelope is strict: exactly these 8 top-level fields.
export const PAIRING_REQUIRED_FIELDS = Object.freeze([
  "version",
  "platform",
  "session_id",
  "node_id_hash",
  "node_public_key",
  "challenge",
  "timestamp",
  "signature",
]);

// Same blocklist as integrity proofs — pairing should never carry user content.
export const PAIRING_FORBIDDEN_FIELDS = new Set(PROOF_FORBIDDEN_FIELDS);

// Byte-length rules (decoded bytes, not string lengths).
export const PAIRING_PUBLIC_KEY_BYTES = 32;
export const PAIRING_CHALLENGE_BYTES = 32;
export const PAIRING_SIGNATURE_BYTES = 64;

// Regexes shared with proof validator.
export const PAIRING_SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
export const PAIRING_NODE_ID_HASH_PATTERN = /^[0-9a-f]{64}$/;
```

- [ ] **Step 4: Run tests — all 6 pass**

```bash
node --test tests/unit/integrity/pairingSchema.test.js 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add src/integrity/pairingSchema.js tests/unit/integrity/pairingSchema.test.js
git commit -m "feat(integrity): add pairing v1 schema constants"
```

---

### Task 2: `pairingCanonicalise.js` + golden fixture

**Files:**

- Create: `src/integrity/pairingCanonicalise.js`
- Create: `tests/unit/integrity/pairingCanonicalise.test.js`
- Create: `tests/unit/integrity/__fixtures__/golden-pairing-payload.json`
- Create: `tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256`

- [ ] **Step 1: Write failing test**

Create `tests/unit/integrity/pairingCanonicalise.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { canonicalisePairingPayload } from "../../../src/integrity/pairingCanonicalise.js";
import { canonicaliseProofPayload } from "../../../src/integrity/proofCanonicalise.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("pairingCanonicalise", () => {
  test("re-exports the proof canonicaliser by reference identity", () => {
    assert.equal(canonicalisePairingPayload, canonicaliseProofPayload);
  });

  test("golden-pairing-payload SHA-256 matches expected hex", () => {
    const fixturePath = join(__dirname, "__fixtures__", "golden-pairing-payload.json");
    const expectedPath = join(__dirname, "__fixtures__", "golden-pairing-payload.sha256");
    const payload = JSON.parse(readFileSync(fixturePath, "utf8"));
    const expected = readFileSync(expectedPath, "utf8").trim();

    const canonical = canonicalisePairingPayload(payload);
    const actual = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");

    assert.equal(actual, expected, `canonical: ${canonical}`);
  });
});
```

- [ ] **Step 2: Create the re-export module**

Create `src/integrity/pairingCanonicalise.js`:

```js
// src/integrity/pairingCanonicalise.js
//
// Pairing payloads use the same canonical signing rules as integrity proof payloads:
// top-level `signature` stripped, keys lex-sorted at every depth, no whitespace,
// UTF-8 bytes. We re-export the proof helper rather than duplicate it — fewer
// places for the canonical wire format to drift between modules.
export { canonicaliseProofPayload as canonicalisePairingPayload } from "./proofCanonicalise.js";
```

- [ ] **Step 3: Create the golden fixture JSON**

Create `tests/unit/integrity/__fixtures__/golden-pairing-payload.json`:

```json
{
  "version": "simurgh-pairing-proof-v1",
  "platform": "macos",
  "session_id": "sess_pairing_golden_001",
  "node_id_hash": "5a1c8d2cae3c7c1f0a8b9d4f5e2c1a7b6d3e9f0c4b8a1d2e5f7c3b9a0e1d2f3a",
  "node_public_key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  "challenge": "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBA=",
  "timestamp": "2026-05-14T00:00:00.000Z"
}
```

- [ ] **Step 4: Generate the expected SHA-256 from your own canonicaliser**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh && node --input-type=module -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import crypto from 'node:crypto';
const payload = JSON.parse(readFileSync('tests/unit/integrity/__fixtures__/golden-pairing-payload.json', 'utf8'));
const canonical = canonicalisePairingPayload(payload);
const hex = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
writeFileSync('tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256', hex + '\n');
console.log('canonical:', canonical);
console.log('sha256:', hex);
"
```

Capture the resulting SHA-256 value — it will need to be mirrored into the Swift fixture in Task 14.

- [ ] **Step 5: Run tests — 2 pass**

```bash
node --test tests/unit/integrity/pairingCanonicalise.test.js 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/integrity/pairingCanonicalise.js \
        tests/unit/integrity/pairingCanonicalise.test.js \
        tests/unit/integrity/__fixtures__/golden-pairing-payload.json \
        tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256
git commit -m "feat(integrity): re-export proof canonicaliser as pairing canonicaliser + golden fixture"
```

---

### Task 3: `pairingValidator.js`

**Files:**

- Create: `src/integrity/pairingValidator.js`
- Create: `tests/unit/integrity/pairingValidator.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/integrity/pairingValidator.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validatePairingProof } from "../../../src/integrity/pairingValidator.js";
import { canonicalisePairingPayload } from "../../../src/integrity/pairingCanonicalise.js";
import { computeNodeIdHash } from "../../../src/integrity/proofSignature.js";

const NOW = Date.parse("2026-05-14T12:00:00.000Z");

function freshSignedPairing(overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPub = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  const base = {
    version: "simurgh-pairing-proof-v1",
    platform: "macos",
    session_id: "sess_abc",
    node_id_hash: computeNodeIdHash(rawPub),
    node_public_key: rawPub.toString("base64"),
    challenge: crypto.randomBytes(32).toString("base64"),
    timestamp: new Date(NOW).toISOString(),
    ...overrides,
  };
  const canonical = canonicalisePairingPayload(base);
  const sig = crypto.sign(null, Buffer.from(canonical, "utf8"), privateKey);
  base.signature = sig.toString("base64");
  return base;
}

describe("validatePairingProof — happy path", () => {
  test("accepts well-formed pairing", () => {
    const payload = freshSignedPairing();
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.payload.version, "simurgh-pairing-proof-v1");
    assert.ok(Buffer.isBuffer(result.payload.challenge_bytes), "exposes raw challenge_bytes");
  });
});

describe("validatePairingProof — required field checks", () => {
  for (const field of [
    "version",
    "platform",
    "session_id",
    "node_id_hash",
    "node_public_key",
    "challenge",
    "timestamp",
    "signature",
  ]) {
    test(`rejects missing ${field}`, () => {
      const payload = freshSignedPairing();
      delete payload[field];
      const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`missing_field:${field}|invalid_`));
    });
  }
});

describe("validatePairingProof — strict 8-key enforcement", () => {
  test("rejects unknown extra field", () => {
    const payload = freshSignedPairing({ extra: "no" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, false);
    assert.match(result.reason, /unknown_field:extra/);
  });
});

describe("validatePairingProof — forbidden fields", () => {
  for (const field of ["screen_pixels", "typed_answer", "paste_content", "webcam"]) {
    test(`rejects forbidden ${field}`, () => {
      const payload = freshSignedPairing({ [field]: "x" });
      const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
      assert.equal(result.ok, false);
      assert.match(result.reason, new RegExp(`forbidden_field:${field}|unknown_field`));
    });
  }
});

describe("validatePairingProof — version/platform/session", () => {
  test("rejects unsupported version", () => {
    const payload = freshSignedPairing({ version: "simurgh-pairing-proof-v9" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "unsupported_version");
  });

  test("rejects non-macos platform", () => {
    const payload = freshSignedPairing({ platform: "linux" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "unsupported_platform");
  });

  test("rejects invalid session_id format", () => {
    const payload = freshSignedPairing({ session_id: "../../etc/passwd" });
    const result = validatePairingProof(payload, {
      now: NOW,
      expectedSessionId: "../../etc/passwd",
    });
    assert.equal(result.reason, "invalid_session_id");
  });

  test("rejects session_id mismatch with expectedSessionId", () => {
    const payload = freshSignedPairing({ session_id: "sess_abc" });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_xyz" });
    assert.equal(result.reason, "proof_session_mismatch");
  });
});

describe("validatePairingProof — timestamp window", () => {
  test("accepts 25s past", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW - 25_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true);
  });

  test("rejects 60s past as pairing_stale", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW - 60_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "pairing_stale");
  });

  test("rejects 60s future as pairing_in_future", () => {
    const payload = freshSignedPairing({ timestamp: new Date(NOW + 60_000).toISOString() });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "pairing_in_future");
  });
});

describe("validatePairingProof — public key + node_id_hash", () => {
  test("rejects 31-byte public key", () => {
    const payload = freshSignedPairing({ node_public_key: Buffer.alloc(31).toString("base64") });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_public_key");
  });

  test("rejects mismatched node_id_hash", () => {
    const payload = freshSignedPairing({ node_id_hash: "0".repeat(64) });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "node_id_hash_mismatch");
  });
});

describe("validatePairingProof — challenge + signature format", () => {
  test("rejects 31-byte challenge", () => {
    const payload = freshSignedPairing({ challenge: Buffer.alloc(31).toString("base64") });
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_challenge_format");
  });

  test("rejects 63-byte signature", () => {
    const payload = freshSignedPairing();
    payload.signature = Buffer.alloc(63).toString("base64");
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_signature_format");
  });
});

describe("validatePairingProof — signature verification", () => {
  test("rejects zeroed signature with invalid_signature", () => {
    const payload = freshSignedPairing();
    payload.signature = Buffer.alloc(64).toString("base64");
    const result = validatePairingProof(payload, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.reason, "invalid_signature");
  });

  test("reordered keys still verify (canonicaliser sorts)", () => {
    const payload = freshSignedPairing();
    const reordered = Object.fromEntries(Object.entries(payload).reverse());
    const result = validatePairingProof(reordered, { now: NOW, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true);
  });
});
```

- [ ] **Step 2: Run test — expect module-not-found**

```bash
node --test tests/unit/integrity/pairingValidator.test.js 2>&1 | tail -8
```

- [ ] **Step 3: Implement the validator**

Create `src/integrity/pairingValidator.js`:

```js
import { canonicalisePairingPayload } from "./pairingCanonicalise.js";
import { verifyProofSignature, computeNodeIdHash } from "./proofSignature.js";
import {
  PAIRING_VERSION,
  PAIRING_PLATFORM,
  PAIRING_REQUIRED_FIELDS,
  PAIRING_FORBIDDEN_FIELDS,
  PAIRING_PUBLIC_KEY_BYTES,
  PAIRING_CHALLENGE_BYTES,
  PAIRING_SIGNATURE_BYTES,
  PAIRING_TIMESTAMP_PAST_MS,
  PAIRING_TIMESTAMP_FUTURE_MS,
  PAIRING_SESSION_ID_PATTERN,
  PAIRING_NODE_ID_HASH_PATTERN,
} from "./pairingSchema.js";

function fail(reason) {
  return { ok: false, reason };
}

function tryDecodeBase64(s) {
  if (typeof s !== "string") return null;
  const buf = Buffer.from(s, "base64");
  if (buf.toString("base64") !== s) return null;
  return buf;
}

/**
 * Validate a Stage 2.2 macOS pairing proof.
 *
 * Returns:
 *   { ok: true, payload }            — payload includes decoded challenge_bytes Buffer
 *   { ok: false, reason: "<code>" }  — see spec §"Reason code → HTTP status map"
 *
 * Crypto: schema → forbidden fields → strict 8 keys → version/platform → session
 * → timestamp window → public key bytes → node_id_hash match → challenge bytes
 * → signature bytes → Ed25519 verify against embedded public key.
 */
export function validatePairingProof(raw, { now = Date.now(), expectedSessionId = null } = {}) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  // 1. forbidden fields
  for (const field of PAIRING_FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }

  // 2. exactly 8 top-level fields (strict)
  const keys = Object.keys(raw);
  for (const k of keys) {
    if (!PAIRING_REQUIRED_FIELDS.includes(k)) return fail(`unknown_field:${k}`);
  }
  for (const field of PAIRING_REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  // 3. version / platform
  if (raw.version !== PAIRING_VERSION) return fail("unsupported_version");
  if (raw.platform !== PAIRING_PLATFORM) return fail("unsupported_platform");

  // 4. session_id format + match
  if (typeof raw.session_id !== "string" || !PAIRING_SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }
  if (expectedSessionId !== null && raw.session_id !== expectedSessionId) {
    return fail("proof_session_mismatch");
  }

  // 5. timestamp window
  if (typeof raw.timestamp !== "string") return fail("invalid_timestamp");
  const ts = Date.parse(raw.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + PAIRING_TIMESTAMP_FUTURE_MS) return fail("pairing_in_future");
  if (ts < now - PAIRING_TIMESTAMP_PAST_MS) return fail("pairing_stale");

  // 6. public key 32 bytes
  const pubKey = tryDecodeBase64(raw.node_public_key);
  if (!pubKey || pubKey.length !== PAIRING_PUBLIC_KEY_BYTES) return fail("invalid_public_key");

  // 7. node_id_hash matches
  if (
    typeof raw.node_id_hash !== "string" ||
    !PAIRING_NODE_ID_HASH_PATTERN.test(raw.node_id_hash)
  ) {
    return fail("node_id_hash_mismatch");
  }
  if (raw.node_id_hash !== computeNodeIdHash(pubKey)) return fail("node_id_hash_mismatch");

  // 8. challenge 32 bytes
  const challengeBytes = tryDecodeBase64(raw.challenge);
  if (!challengeBytes || challengeBytes.length !== PAIRING_CHALLENGE_BYTES) {
    return fail("invalid_challenge_format");
  }

  // 9. signature 64 bytes
  const sigBytes = tryDecodeBase64(raw.signature);
  if (!sigBytes || sigBytes.length !== PAIRING_SIGNATURE_BYTES) {
    return fail("invalid_signature_format");
  }

  // 10. canonicalise + verify against embedded key
  const canonical = canonicalisePairingPayload(raw);
  if (!verifyProofSignature(canonical, pubKey, sigBytes)) return fail("invalid_signature");

  return {
    ok: true,
    payload: {
      version: raw.version,
      platform: raw.platform,
      session_id: raw.session_id,
      node_id_hash: raw.node_id_hash,
      node_public_key: raw.node_public_key,
      challenge: raw.challenge,
      challenge_bytes: challengeBytes,
      timestamp: raw.timestamp,
      signature: raw.signature,
    },
  };
}
```

- [ ] **Step 4: Run tests — all pass (~25 assertions)**

```bash
node --test tests/unit/integrity/pairingValidator.test.js 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/integrity/pairingValidator.js tests/unit/integrity/pairingValidator.test.js
git commit -m "feat(integrity): add pairing proof validator"
```

---

### Task 4: `pairingRegistry.js`

**Files:**

- Create: `src/integrity/pairingRegistry.js`
- Create: `tests/unit/integrity/pairingRegistry.test.js`

- [ ] **Step 1: Write failing tests**

Create `tests/unit/integrity/pairingRegistry.test.js`:

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createPairingRegistry } from "../../../src/integrity/pairingRegistry.js";

const T0 = 1_000_000_000_000;

describe("pairingRegistry — createChallenge", () => {
  test("creates a 32-byte base64 challenge for a fresh session", () => {
    const r = createPairingRegistry({ challengeTtlMs: 60_000 });
    const result = r.createChallenge("sess_a", T0);
    assert.equal(result.ok, true);
    assert.equal(Buffer.from(result.challenge, "base64").length, 32);
    assert.equal(result.expires_at, T0 + 60_000);
  });

  test("createChallenge replaces an unconsumed pending challenge", () => {
    const r = createPairingRegistry();
    const first = r.createChallenge("sess_a", T0);
    const second = r.createChallenge("sess_a", T0 + 5_000);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.notEqual(first.challenge, second.challenge);
    assert.equal(r.getChallenge("sess_a").challenge, second.challenge);
  });

  test("rejects createChallenge if already paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    const second = r.createChallenge("sess_a", T0 + 2_000);
    assert.equal(second.ok, false);
    assert.equal(second.reason, "node_already_paired");
  });
});

describe("pairingRegistry — completePairing", () => {
  test("happy path moves pending → paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "hash1", node_public_key: "key1" },
      T0 + 1_000
    );
    assert.equal(result.ok, true);
    assert.equal(result.paired_at, T0 + 1_000);
    assert.deepEqual(r.getPairedNode("sess_a"), {
      node_id_hash: "hash1",
      node_public_key: "key1",
      paired_at: T0 + 1_000,
    });
    assert.equal(r.getChallenge("sess_a"), null);
  });

  test("rejects when no pending challenge", () => {
    const r = createPairingRegistry();
    const result = r.completePairing(
      "sess_a",
      { challenge: "x", node_id_hash: "h", node_public_key: "k" },
      T0
    );
    assert.equal(result.reason, "challenge_not_found");
  });

  test("rejects expired challenge", () => {
    const r = createPairingRegistry({ challengeTtlMs: 60_000 });
    const c = r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 60_001
    );
    assert.equal(result.reason, "challenge_expired");
  });

  test("rejects challenge mismatch", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    const result = r.completePairing(
      "sess_a",
      { challenge: "wrong-challenge", node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    assert.equal(result.reason, "challenge_mismatch");
  });

  test("rejects second pairing as node_already_paired", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 1_000
    );
    const result = r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h2", node_public_key: "k2" },
      T0 + 2_000
    );
    assert.equal(result.reason, "node_already_paired");
  });
});

describe("pairingRegistry — accessors + lifecycle", () => {
  test("getPairedNode null before pairing", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    assert.equal(r.getPairedNode("sess_a"), null);
  });

  test("isPaired booleans", () => {
    const r = createPairingRegistry();
    const c = r.createChallenge("sess_a", T0);
    assert.equal(r.isPaired("sess_a"), false);
    r.completePairing(
      "sess_a",
      { challenge: c.challenge, node_id_hash: "h", node_public_key: "k" },
      T0 + 100
    );
    assert.equal(r.isPaired("sess_a"), true);
  });

  test("evict removes session entry", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    r.evict("sess_a");
    assert.equal(r.getChallenge("sess_a"), null);
    assert.equal(r.size(), 0);
  });

  test("evictMissing keeps active sessions", () => {
    const r = createPairingRegistry();
    r.createChallenge("sess_a", T0);
    r.createChallenge("sess_b", T0);
    r.createChallenge("sess_c", T0);
    r.evictMissing(new Set(["sess_a", "sess_c"]));
    assert.ok(r.getChallenge("sess_a"));
    assert.equal(r.getChallenge("sess_b"), null);
    assert.ok(r.getChallenge("sess_c"));
  });

  test("size reports total entries", () => {
    const r = createPairingRegistry();
    assert.equal(r.size(), 0);
    r.createChallenge("s1", T0);
    r.createChallenge("s2", T0);
    assert.equal(r.size(), 2);
  });

  test("getChallenge null when no entry", () => {
    const r = createPairingRegistry();
    assert.equal(r.getChallenge("unknown"), null);
  });
});
```

- [ ] **Step 2: Run test — expect module-not-found**

```bash
node --test tests/unit/integrity/pairingRegistry.test.js 2>&1 | tail -5
```

- [ ] **Step 3: Implement the registry**

Create `src/integrity/pairingRegistry.js`:

```js
import crypto from "node:crypto";

const DEFAULT_TTL_MS = 60_000;
const CHALLENGE_BYTES = 32;

/**
 * Per-session pairing state machine.
 *
 * State per session:
 *   none         → no entry
 *   pending      → challenge issued, awaiting completePairing
 *   paired       → node bound; immutable for the session lifetime
 */
export function createPairingRegistry({ challengeTtlMs = DEFAULT_TTL_MS } = {}) {
  // sessionId -> record
  const records = new Map();

  function ensureRecord(sessionId) {
    let rec = records.get(sessionId);
    if (!rec) {
      rec = { sessionId, pending: null, paired: null };
      records.set(sessionId, rec);
    }
    return rec;
  }

  function createChallenge(sessionId, now = Date.now()) {
    const rec = ensureRecord(sessionId);
    if (rec.paired) return { ok: false, reason: "node_already_paired" };

    const raw = crypto.randomBytes(CHALLENGE_BYTES);
    const challenge = raw.toString("base64");
    const challenge_hash = crypto.createHash("sha256").update(raw).digest("hex");
    rec.pending = {
      challenge,
      challenge_hash,
      challenge_created_at: now,
      challenge_expires_at: now + challengeTtlMs,
    };
    return {
      ok: true,
      challenge,
      challenge_hash,
      expires_at: rec.pending.challenge_expires_at,
    };
  }

  function getChallenge(sessionId) {
    const rec = records.get(sessionId);
    if (!rec || !rec.pending) return null;
    return {
      challenge: rec.pending.challenge,
      expires_at: rec.pending.challenge_expires_at,
    };
  }

  function completePairing(
    sessionId,
    { challenge, node_id_hash, node_public_key },
    now = Date.now()
  ) {
    const rec = records.get(sessionId);
    if (!rec) return { ok: false, reason: "challenge_not_found" };
    if (rec.paired) return { ok: false, reason: "node_already_paired" };
    if (!rec.pending) return { ok: false, reason: "challenge_not_found" };
    if (rec.pending.challenge_expires_at < now) return { ok: false, reason: "challenge_expired" };
    if (rec.pending.challenge !== challenge) return { ok: false, reason: "challenge_mismatch" };

    rec.paired = {
      node_id_hash,
      node_public_key,
      paired_at: now,
    };
    // Consume the challenge.
    rec.pending = null;
    return { ok: true, paired_at: now };
  }

  function getPairedNode(sessionId) {
    const rec = records.get(sessionId);
    if (!rec || !rec.paired) return null;
    return { ...rec.paired };
  }

  function isPaired(sessionId) {
    return !!records.get(sessionId)?.paired;
  }

  function evict(sessionId) {
    records.delete(sessionId);
  }

  function evictMissing(activeSessionIds) {
    for (const id of records.keys()) {
      if (!activeSessionIds.has(id)) records.delete(id);
    }
  }

  return {
    createChallenge,
    getChallenge,
    completePairing,
    getPairedNode,
    isPaired,
    evict,
    evictMissing,
    size: () => records.size,
  };
}
```

- [ ] **Step 4: Run tests — all pass (~14 assertions)**

```bash
node --test tests/unit/integrity/pairingRegistry.test.js 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/integrity/pairingRegistry.js tests/unit/integrity/pairingRegistry.test.js
git commit -m "feat(integrity): add pairing registry with injectable now"
```

---

## Phase 2 — Proof Validator Upgrade

### Task 5: Extend `proofValidator.js` with `pairedNode` + `expectedSessionId`

**Files:**

- Modify: `src/integrity/proofValidator.js`
- Modify: `tests/unit/integrity/proofValidator.test.js`

- [ ] **Step 1: Append new tests to `tests/unit/integrity/proofValidator.test.js`**

Add at the bottom of the file (before the closing of any outer block):

```js
describe("validateProof — paired session (Stage 2.2)", () => {
  test("returns signature_status: 'verified' when pairedNode matches", () => {
    const proof = freshSignedProof();
    const pairedNode = {
      node_id_hash: proof.node_id_hash,
      node_public_key: proof.node_public_key,
      paired_at: NOW - 1000,
    };
    const result = validateProof(proof, { now: NOW, pairedNode, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, true);
    assert.equal(result.signature_status, "verified");
  });

  test("unpaired session returns signature_status: 'unregistered_node'", () => {
    const proof = freshSignedProof();
    const result = validateProof(proof, {
      now: NOW,
      pairedNode: null,
      expectedSessionId: "sess_abc",
    });
    assert.equal(result.ok, true);
    assert.equal(result.signature_status, "unregistered_node");
  });

  test("paired_node_mismatch when node_id_hash differs", () => {
    const proof = freshSignedProof();
    const pairedNode = {
      node_id_hash: "f".repeat(64),
      node_public_key: proof.node_public_key,
      paired_at: NOW - 1000,
    };
    const result = validateProof(proof, { now: NOW, pairedNode, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "paired_node_mismatch");
  });

  test("paired_public_key_mismatch when public key string differs but hash matches", () => {
    const proof = freshSignedProof();
    const pairedNode = {
      node_id_hash: proof.node_id_hash,
      node_public_key: "different-base64-key",
      paired_at: NOW - 1000,
    };
    const result = validateProof(proof, { now: NOW, pairedNode, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "paired_public_key_mismatch");
  });

  test("registered_signature_invalid when paired but signature is zeroed", () => {
    const proof = freshSignedProof();
    proof.signature = Buffer.alloc(64).toString("base64");
    const pairedNode = {
      node_id_hash: proof.node_id_hash,
      node_public_key: proof.node_public_key,
      paired_at: NOW - 1000,
    };
    const result = validateProof(proof, { now: NOW, pairedNode, expectedSessionId: "sess_abc" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "registered_signature_invalid");
  });

  test("expectedSessionId mismatch returns proof_session_mismatch", () => {
    const proof = freshSignedProof();
    const result = validateProof(proof, { now: NOW, expectedSessionId: "sess_other" });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "proof_session_mismatch");
  });
});
```

- [ ] **Step 2: Run tests — expect 6 new failures**

```bash
node --test tests/unit/integrity/proofValidator.test.js 2>&1 | tail -15
```

- [ ] **Step 3: Update `src/integrity/proofValidator.js`**

Open `src/integrity/proofValidator.js`. Replace the existing `validateProof` function entirely with this version:

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
  const buf = Buffer.from(s, "base64");
  if (buf.toString("base64") !== s) return null;
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
 * Validate a Stage 2.x macOS integrity proof.
 *
 * @param {object} raw                      — incoming proof body
 * @param {object} opts
 * @param {number} [opts.now]               — clock injection for tests
 * @param {object|null} [opts.pairedNode]   — { node_id_hash, node_public_key, paired_at } from pairingRegistry; null for unpaired sessions
 * @param {string|null} [opts.expectedSessionId] — session ID from the auth token; enforces proof_session_mismatch
 *
 * Returns:
 *   { ok: true, proof, signature_status }   where signature_status ∈ {"verified", "unregistered_node"}
 *   { ok: false, reason }                   see spec for reason → HTTP map
 */
export function validateProof(
  raw,
  { now = Date.now(), pairedNode = null, expectedSessionId = null } = {}
) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("proof_not_an_object");
  }

  for (const field of FORBIDDEN_FIELDS) {
    if (field in raw) return fail(`forbidden_field:${field}`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in raw) || raw[field] === null || raw[field] === undefined) {
      return fail(`missing_field:${field}`);
    }
  }

  if (raw.version !== PROOF_VERSION) return fail("unsupported_version");
  if (raw.platform !== PROOF_PLATFORM) return fail("unsupported_platform");
  if (raw.privacy_mode !== PROOF_PRIVACY_MODE) return fail("invalid_privacy_mode");

  if (typeof raw.session_id !== "string" || !SESSION_ID_PATTERN.test(raw.session_id)) {
    return fail("invalid_session_id");
  }
  if (expectedSessionId !== null && raw.session_id !== expectedSessionId) {
    return fail("proof_session_mismatch");
  }

  if (typeof raw.timestamp !== "string") return fail("invalid_timestamp");
  const ts = Date.parse(raw.timestamp);
  if (!Number.isFinite(ts)) return fail("invalid_timestamp");
  if (ts > now + TIMESTAMP_FUTURE_MS) return fail("proof_in_future");
  if (ts < now - TIMESTAMP_PAST_MS) return fail("proof_stale");

  if (!validateCapabilities(raw.capabilities)) return fail("invalid_capabilities");
  if (!validateSignals(raw.signals)) return fail("invalid_signals");

  if (typeof raw.node_public_key !== "string") return fail("invalid_public_key");
  const pubKey = tryDecodeBase64(raw.node_public_key);
  if (!pubKey || pubKey.length !== PUBLIC_KEY_BYTES) return fail("invalid_public_key");

  if (typeof raw.node_id_hash !== "string" || !NODE_ID_HASH_PATTERN.test(raw.node_id_hash)) {
    return fail("node_id_hash_mismatch");
  }
  if (raw.node_id_hash !== computeNodeIdHash(pubKey)) return fail("node_id_hash_mismatch");

  // Stage 2.2 paired-session checks (E1 strict triple check) — only if pairedNode supplied.
  if (pairedNode) {
    if (raw.node_id_hash !== pairedNode.node_id_hash) return fail("paired_node_mismatch");
    if (raw.node_public_key !== pairedNode.node_public_key)
      return fail("paired_public_key_mismatch");
  }

  if (typeof raw.nonce !== "string") return fail("invalid_nonce");
  const nonceBytes = tryDecodeBase64(raw.nonce);
  if (!nonceBytes || nonceBytes.length < NONCE_BYTES_MIN || nonceBytes.length > NONCE_BYTES_MAX) {
    return fail("invalid_nonce");
  }

  if (typeof raw.signature !== "string") return fail("invalid_signature_format");
  const sigBytes = tryDecodeBase64(raw.signature);
  if (!sigBytes || sigBytes.length !== SIGNATURE_BYTES) return fail("invalid_signature_format");

  const canonical = canonicaliseProofPayload(raw);

  let signature_status;
  if (pairedNode) {
    const registeredKey = tryDecodeBase64(pairedNode.node_public_key);
    if (!registeredKey || registeredKey.length !== PUBLIC_KEY_BYTES) {
      // Shouldn't happen if registry is healthy, but be defensive.
      return fail("registered_signature_invalid");
    }
    if (!verifyProofSignature(canonical, registeredKey, sigBytes)) {
      return fail("registered_signature_invalid");
    }
    signature_status = "verified";
  } else {
    if (!verifyProofSignature(canonical, pubKey, sigBytes)) return fail("invalid_signature");
    signature_status = "unregistered_node";
  }

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
  return { ok: true, proof: accepted, signature_status };
}
```

- [ ] **Step 4: Run tests — all original Stage 2.1 tests still pass, plus 6 new pass**

```bash
node --test tests/unit/integrity/proofValidator.test.js 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add src/integrity/proofValidator.js tests/unit/integrity/proofValidator.test.js
git commit -m "feat(integrity): proofValidator accepts pairedNode + expectedSessionId; returns signature_status"
```

---

## Phase 3 — Audit Events + Server Routes

### Task 6: Add three pairing event constants

**Files:**

- Modify: `src/academic/academicEvents.js`
- Modify: `tests/unit/academicEvents.test.js`

- [ ] **Step 1: Update the constants**

Open `src/academic/academicEvents.js`. Find the existing EVENTS object. Add three new entries after `INTEGRITY_NODE_STALE`:

```js
  INTEGRITY_NODE_STALE: "INTEGRITY_NODE_STALE",
  // Stage 2.2 — pairing events
  INTEGRITY_PAIRING_CHALLENGE_CREATED: "INTEGRITY_PAIRING_CHALLENGE_CREATED",
  INTEGRITY_NODE_PAIRED: "INTEGRITY_NODE_PAIRED",
  INTEGRITY_PAIRING_REJECTED: "INTEGRITY_PAIRING_REJECTED",
```

- [ ] **Step 2: Update `tests/unit/academicEvents.test.js`**

Find the test that lists required EVENTS. Add the three new constants to the `required` array:

```js
const required = [
  // ... existing ones ...
  "INTEGRITY_PROOF_RECEIVED",
  "INTEGRITY_PROOF_REJECTED",
  "INTEGRITY_NODE_STALE",
  "INTEGRITY_PAIRING_CHALLENGE_CREATED",
  "INTEGRITY_NODE_PAIRED",
  "INTEGRITY_PAIRING_REJECTED",
];
```

- [ ] **Step 3: Run tests**

```bash
node --test tests/unit/academicEvents.test.js 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/academic/academicEvents.js tests/unit/academicEvents.test.js
git commit -m "feat(academic): add 3 pairing event constants for Stage 2.2"
```

---

### Task 7: Wire pairing registry into `server.js` (instance + eviction)

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Add imports**

Open `server.js`. Find the existing block of `src/integrity/...` imports. After `import { createIntegrityState } from "./src/integrity/integrityState.js";`, add:

```js
import { validatePairingProof } from "./src/integrity/pairingValidator.js";
import { createPairingRegistry } from "./src/integrity/pairingRegistry.js";
```

- [ ] **Step 2: Add registry instance**

Find the line `const integrityState = createIntegrityState();`. Immediately below it, add:

```js
// Stage 2.2: per-session pairing registry (challenge + paired node).
const pairingRegistry = createPairingRegistry({ challengeTtlMs: 60_000 });
```

- [ ] **Step 3: Extend the existing examSessions eviction timer**

Find the existing `examEvictionTimer` block. Inside its callback, find the line `integrityState.evictMissing(new Set(sessions.keys()));`. Replace that single line with:

```js
const activeIds = new Set(sessions.keys());
integrityState.evictMissing(activeIds);
pairingRegistry.evictMissing(activeIds);
```

- [ ] **Step 4: Verify the file parses**

```bash
node --check server.js && echo "ok"
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "feat(server): wire pairing registry + add to session eviction"
```

---

### Task 8: Add per-route rate limiters

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Add limiter declarations**

In `server.js`, find the block where existing rate limiters are declared (look for `createRateLimiter` calls). After the last `createRateLimiter` call in that block, add:

```js
// Stage 2.2: pairing endpoints — per-session-token rate limits.
const limitPairingChallenge = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  keyFn: keyByInstructorToken,
  name: "pairing_challenge",
});
const limitPairingComplete = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyFn: keyByInstructorToken,
  name: "pairing_complete",
});
```

Note: `keyByInstructorToken` is the existing helper that reads the `Authorization: Bearer …` header — it works for student session tokens as well because both are sent as bearer tokens.

- [ ] **Step 2: Verify file parses**

```bash
node --check server.js && echo "ok"
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(server): add rate limiters for pairing challenge + complete"
```

---

### Task 9: Add `POST /api/integrity/pairing/challenge` route

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Add the route**

Find the existing `POST /api/integrity/proofs` route. Just **before** it (so the file is read top-down: challenge → complete → proofs), add the new challenge route. The exact placement: search for `app.post("/api/integrity/proofs"` and insert immediately above that line:

```js
// Stage 2.2: pairing — issue a one-time challenge for the authenticated session.
app.post(
  "/api/integrity/pairing/challenge",
  limitPairingChallenge,
  requireSessionToken,
  (req, res) => {
    const sessionId = req.sessionTokenSessionId;
    const sess = sessions.get(sessionId);
    if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });

    const result = pairingRegistry.createChallenge(sessionId, Date.now());
    if (!result.ok) {
      // Only failure path here is node_already_paired.
      return res.status(409).json({ error: result.reason });
    }

    appendAudit(sess, EVENTS.INTEGRITY_PAIRING_CHALLENGE_CREATED, {
      challenge_hash: result.challenge_hash,
      expires_at: new Date(result.expires_at).toISOString(),
      platform: "macos",
    });

    return res.status(200).json({
      status: "challenge_created",
      session_id: sessionId,
      challenge: result.challenge,
      expires_at: new Date(result.expires_at).toISOString(),
      note: "Sign this challenge with the macOS Simurgh node and POST the result to /api/integrity/pairing/complete. Expires in 60 s.",
    });
  }
);
```

- [ ] **Step 2: Smoke test**

```bash
SIMURGH_DEMO_MODE=1 PORT=33032 node server.js > /tmp/srv-pair.log 2>&1 &
SERVER_PID=$!
sleep 1

# Create exam + session + token
EXAM=$(curl -s -X POST http://localhost:33032/api/exams -H 'Content-Type: application/json' -d '{"title":"chal smoke","durationMinutes":60}')
EXAM_ID=$(echo $EXAM | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{process.stdout.write(JSON.parse(d).id)})')
JOIN=$(curl -s -X POST "http://localhost:33032/api/exams/$EXAM_ID/join" \
  -H 'Content-Type: application/json' \
  -d '{"studentId":"chal@test","sessionId":"chal_test"}')
TOK=$(echo $JOIN | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{process.stdout.write(JSON.parse(d).sessionToken)})')

# Call challenge endpoint
curl -s -X POST http://localhost:33032/api/integrity/pairing/challenge \
  -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d '{}' | node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  const r=JSON.parse(d);
  console.log("status:", r.status);
  console.log("challenge bytes:", Buffer.from(r.challenge, "base64").length);
})'

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
```

Expected output:

```
status: challenge_created
challenge bytes: 32
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(server): add POST /api/integrity/pairing/challenge"
```

---

### Task 10: Add `POST /api/integrity/pairing/complete` route

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Add the route immediately after the challenge route**

In `server.js`, locate the closing `);` of the challenge route added in Task 9. On the next line, add the complete route:

```js
// Stage 2.2: pairing — verify a node-signed pairing payload and bind the node to the session.
app.post(
  "/api/integrity/pairing/complete",
  limitPairingComplete,
  requireSessionToken,
  (req, res) => {
    const sessionId = req.sessionTokenSessionId;
    const sess = sessions.get(sessionId);
    if (!sess) return res.status(409).json({ error: "session_expired_or_evicted" });

    function recordReject(reason, parsedHash = null, parsedChallengeHash = null, hasSig = false) {
      appendAudit(sess, EVENTS.INTEGRITY_PAIRING_REJECTED, {
        reason,
        node_id_hash_if_parsed: parsedHash,
        challenge_hash_if_parsed: parsedChallengeHash,
        has_signature: hasSig,
      });
    }

    // Early bail-out: don't waste an Ed25519 verify on a session that cannot pair.
    if (pairingRegistry.isPaired(sessionId)) {
      recordReject(
        "node_already_paired",
        typeof req.body?.node_id_hash === "string" && /^[0-9a-f]{64}$/.test(req.body.node_id_hash)
          ? req.body.node_id_hash
          : null,
        null,
        typeof req.body?.signature === "string" && req.body.signature.length > 0
      );
      return res.status(409).json({ error: "node_already_paired" });
    }

    const validation = validatePairingProof(req.body, {
      now: Date.now(),
      expectedSessionId: sessionId,
    });

    if (!validation.ok) {
      const rawHash =
        typeof req.body?.node_id_hash === "string" && /^[0-9a-f]{64}$/.test(req.body.node_id_hash)
          ? req.body.node_id_hash
          : null;
      const hasSig = typeof req.body?.signature === "string" && req.body.signature.length > 0;
      recordReject(validation.reason, rawHash, null, hasSig);

      let status = 400;
      if (validation.reason === "invalid_signature") status = 401;
      if (validation.reason === "proof_session_mismatch") status = 401;
      return res.status(status).json({ error: validation.reason });
    }

    const { payload } = validation;
    const challengeHash = crypto.createHash("sha256").update(payload.challenge_bytes).digest("hex");

    // Cross-route N1 consistency: if integrityState has already bound a different
    // node_id_hash for this session via prior unpaired telemetry proofs, refuse to pair.
    const existingIntegrity = integrityState.get(sessionId);
    if (
      existingIntegrity?.bound_node_id_hash &&
      existingIntegrity.bound_node_id_hash !== payload.node_id_hash
    ) {
      recordReject("node_id_hash_changed", payload.node_id_hash, challengeHash, true);
      return res.status(409).json({ error: "node_id_hash_changed" });
    }

    const state = pairingRegistry.completePairing(
      sessionId,
      {
        challenge: payload.challenge,
        node_id_hash: payload.node_id_hash,
        node_public_key: payload.node_public_key,
      },
      Date.now()
    );
    if (!state.ok) {
      recordReject(state.reason, payload.node_id_hash, challengeHash, true);
      return res.status(409).json({ error: state.reason });
    }

    appendAudit(sess, EVENTS.INTEGRITY_NODE_PAIRED, {
      node_id_hash: payload.node_id_hash,
      challenge_hash: challengeHash,
      platform: "macos",
      signature_status: "verified",
    });

    return res.status(200).json({
      status: "paired",
      session_id: sessionId,
      node_id_hash: payload.node_id_hash,
      signature_status: "verified",
      paired_at: new Date(state.paired_at).toISOString(),
      note: "Subsequent /api/integrity/proofs submissions for this session must be signed by the registered node and will return signature_status: verified.",
    });
  }
);
```

- [ ] **Step 2: Smoke test the full pairing round-trip**

```bash
SIMURGH_DEMO_MODE=1 PORT=33032 node server.js > /tmp/srv-pair.log 2>&1 &
SERVER_PID=$!
sleep 1

node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';

const base = 'http://localhost:33032';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'pair',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'p@t',sessionId:'pair_smoke'})})).json();
const tok = join.sessionToken;

const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
console.log('challenge:', ch.status, 'len:', Buffer.from(ch.challenge,'base64').length);

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const payload = {
  version: 'simurgh-pairing-proof-v1',
  platform: 'macos',
  session_id: 'pair_smoke',
  node_id_hash: computeNodeIdHash(rawPub),
  node_public_key: rawPub.toString('base64'),
  challenge: ch.challenge,
  timestamp: new Date().toISOString(),
};
const canonical = canonicalisePairingPayload(payload);
payload.signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey).toString('base64');

const res = await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(payload)});
const body = await res.json();
console.log('complete:', res.status, body.status, body.signature_status);
"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
```

Expected:

```
challenge: challenge_created len: 32
complete: 200 paired verified
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(server): add POST /api/integrity/pairing/complete with audit + N1 cross-route check"
```

---

### Task 11: Upgrade `POST /api/integrity/proofs` route to use pairing registry

**Files:**

- Modify: `server.js`

- [ ] **Step 1: Update the proofs route**

In `server.js`, find the existing `app.post("/api/integrity/proofs", …)` handler. Inside the handler, locate the lines that compute the validation result and the signature status. Apply these changes:

Find:

```js
const validation = validateProof(req.body, { now: Date.now() });
```

Replace with:

```js
const pairedNode = pairingRegistry.getPairedNode(sessionId);
const validation = validateProof(req.body, {
  now: Date.now(),
  pairedNode,
  expectedSessionId: sessionId,
});
```

Then in the same handler, find the existing reason-code → status mapping that says:

```js
let status = 400;
if (validation.reason === "invalid_signature") status = 401;
if (validation.reason === "proof_session_mismatch") status = 401;
```

Add three more mapping lines so the block becomes:

```js
let status = 400;
if (validation.reason === "invalid_signature") status = 401;
if (validation.reason === "registered_signature_invalid") status = 401;
if (validation.reason === "proof_session_mismatch") status = 401;
if (validation.reason === "paired_node_mismatch") status = 409;
if (validation.reason === "paired_public_key_mismatch") status = 409;
```

Then find the line that extracts the proof:

```js
const { proof } = validation;
```

Replace with:

```js
const { proof, signature_status } = validation;
```

Find the constant assignment of `signatureStatus`:

```js
const signatureStatus = "unregistered_node";
```

Delete that line entirely. Replace all subsequent uses of `signatureStatus` in the audit and response with `signature_status`. The two specific edits:

In the audit call, change:

```js
    signature_status: signatureStatus,
```

to:

```js
    signature_status,
```

In the response body, change:

```js
    signature_status: signatureStatus,
```

to:

```js
    signature_status,
```

Finally, update the `note` field. Find:

```js
    note: "Stage 2.1 scaffold: signature mathematically verified, node not yet paired. Pairing lands in Stage 2.2.",
```

Replace with:

```js
    note:
      signature_status === "verified"
        ? "Signature verified against the node registered to this session."
        : "Signature mathematically verified, node not yet paired. Submit /api/integrity/pairing/challenge to pair.",
```

- [ ] **Step 2: Smoke test paired-session proof returns verified**

```bash
SIMURGH_DEMO_MODE=1 PORT=33032 node server.js > /tmp/srv-pair.log 2>&1 &
SERVER_PID=$!
sleep 1

node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';

const base = 'http://localhost:33032';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'pp',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'pp@t',sessionId:'pp_smoke'})})).json();
const tok = join.sessionToken;

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const nodeIdHash = computeNodeIdHash(rawPub);
const nodePub = rawPub.toString('base64');

// Pair
const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pairPayload = {
  version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'pp_smoke',
  node_id_hash: nodeIdHash, node_public_key: nodePub,
  challenge: ch.challenge, timestamp: new Date().toISOString(),
};
const pCanon = canonicalisePairingPayload(pairPayload);
pairPayload.signature = crypto.sign(null, Buffer.from(pCanon,'utf8'), privateKey).toString('base64');
await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pairPayload)});

// Submit proof from same node
const proof = {
  version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'pp_smoke',
  node_id_hash: nodeIdHash, node_public_key: nodePub,
  nonce: crypto.randomBytes(16).toString('base64'),
  timestamp: new Date().toISOString(),
  capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false},
  signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'},
  privacy_mode:'metadata_only',
};
const c = canonicaliseProofPayload(proof);
proof.signature = crypto.sign(null, Buffer.from(c,'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
console.log('proof:', res.status, body.signature_status);
"

kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null
```

Expected:

```
proof: 202 verified
```

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "feat(server): proofs route uses pairing registry; returns verified status for paired sessions"
```

---

## Phase 4 — macOS CLI

### Task 12: Add `PairingEnvelope.swift`

**Files:**

- Create: `tools/simurgh-node-macos/Sources/SimurghNode/PairingEnvelope.swift`

- [ ] **Step 1: Write the envelope struct**

Create the file with:

```swift
import Foundation

/// Stage 2.2 v1 pairing envelope (8 fields).
struct PairingEnvelope: Encodable {
    let version: String
    let platform: String
    let session_id: String
    let node_id_hash: String
    let node_public_key: String
    let challenge: String
    let timestamp: String

    static func build(sessionId: String, challenge: String, identity: NodeIdentity, timestamp: String) -> PairingEnvelope {
        return PairingEnvelope(
            version: "simurgh-pairing-proof-v1",
            platform: "macos",
            session_id: sessionId,
            node_id_hash: identity.nodeIdHashHex,
            node_public_key: identity.publicKeyBase64,
            challenge: challenge,
            timestamp: timestamp
        )
    }
}

func currentIso8601() -> String {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    f.timeZone = TimeZone(secondsFromGMT: 0)
    return f.string(from: Date())
}
```

(`currentIso8601()` is duplicated in `ProofEnvelope.swift` — pull it into a shared place ONLY if Swift compiler complains about duplicate symbols; current ProofEnvelope keeps it private, so a sibling private copy here is fine. If the existing one isn't private, namespace this one as a static method instead.)

- [ ] **Step 2: Verify Package.swift builds (test target still works)**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos && swift build 2>&1 | tail -10
```

Expected: build succeeds (or fails with errors about `PairingSigner` — that's expected; Task 13 adds it).

If the build fails specifically because `currentIso8601()` is duplicated with `ProofEnvelope.swift`, open `PairingEnvelope.swift` and either:

- Remove the helper from this file (it lives in `ProofEnvelope.swift` already), OR
- Rename one of them (e.g. `pairingIso8601()`).

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/PairingEnvelope.swift
git commit -m "feat(node-macos): v1 pairing envelope struct"
```

---

### Task 13: Add `PairingSigner.swift`

**Files:**

- Create: `tools/simurgh-node-macos/Sources/SimurghNode/PairingSigner.swift`

- [ ] **Step 1: Write the signer**

Create the file with:

```swift
import Foundation
import CryptoKit

/// Canonicalise + Ed25519 sign for Stage 2.2 v1 pairing envelopes.
///
/// Mirrors ProofSigner: encode with .sortedKeys + .withoutEscapingSlashes for
/// the canonical bytes, sign those bytes, then emit a pretty-printed JSON
/// (with signature attached) for stdout.
enum PairingSigner {

    static func canonicalisePairingPayload(_ envelope: PairingEnvelope) throws -> Data {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return try encoder.encode(envelope)
    }

    static func signAndEncode(envelope: PairingEnvelope, identity: NodeIdentity) throws -> Data {
        let canonical = try canonicalisePairingPayload(envelope)
        let signature = try identity.privateKey.signature(for: canonical)
        let signatureB64 = signature.base64EncodedString()

        let dict: [String: Any] = [
            "version": envelope.version,
            "platform": envelope.platform,
            "session_id": envelope.session_id,
            "node_id_hash": envelope.node_id_hash,
            "node_public_key": envelope.node_public_key,
            "challenge": envelope.challenge,
            "timestamp": envelope.timestamp,
            "signature": signatureB64,
        ]
        return try JSONSerialization.data(
            withJSONObject: dict,
            options: [.prettyPrinted, .sortedKeys]
        )
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd tools/simurgh-node-macos && swift build 2>&1 | tail -10
```

Expected: builds successfully.

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/PairingSigner.swift
git commit -m "feat(node-macos): pairing canonicaliser + Ed25519 signer"
```

---

### Task 14: Update `main.swift` with `pair` subcommand + strict unknown-subcommand handling

**Files:**

- Modify: `tools/simurgh-node-macos/Sources/SimurghNode/main.swift`

- [ ] **Step 1: Rewrite `parseArgs` + dispatch logic**

Replace the entire current `main.swift` contents with:

```swift
import Foundation

// CLI entry — subcommand dispatch with strict unknown-arg handling.

enum CLIError: Error {
    case malformedKey(String)
    case missingSession
    case missingChallenge
    case unknownFlag(String)
    case unknownSubcommand(String)
}

enum CLIMode {
    case proof
    case pair
    case printKeyInfo
}

struct CLIOptions {
    var mode: CLIMode
    var sessionId: String
    var challenge: String?
    var keyPath: String
}

func parseArgs(_ args: [String]) throws -> CLIOptions {
    var sessionId: String? = ProcessInfo.processInfo.environment["SIMURGH_SESSION_ID"]
    var keyPath: String = ProcessInfo.processInfo.environment["SIMURGH_NODE_KEY_PATH"]
        ?? (NSHomeDirectory() + "/.simurgh/node-key")
    var challenge: String? = nil
    var mode: CLIMode = .proof

    var i = 1
    // First positional argument may be a subcommand: proof | pair
    // Anything else that doesn't start with "-" is an unknown subcommand → exit 64.
    if args.count > 1 && !args[1].hasPrefix("-") {
        switch args[1] {
        case "proof": mode = .proof; i = 2
        case "pair":  mode = .pair;  i = 2
        default: throw CLIError.unknownSubcommand(args[1])
        }
    }

    while i < args.count {
        let a = args[i]
        switch a {
        case "--session":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            sessionId = args[i]
        case "--challenge":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            challenge = args[i]
        case "--key-path":
            i += 1
            guard i < args.count else { throw CLIError.unknownFlag(a) }
            keyPath = args[i]
        case "--print-key-info":
            mode = .printKeyInfo
        case "--help", "-h":
            printUsage()
            exit(0)
        default:
            throw CLIError.unknownFlag(a)
        }
        i += 1
    }

    if mode != .printKeyInfo, sessionId == nil {
        throw CLIError.missingSession
    }
    if mode == .pair, (challenge == nil || challenge!.isEmpty) {
        throw CLIError.missingChallenge
    }
    return CLIOptions(mode: mode, sessionId: sessionId ?? "", challenge: challenge, keyPath: keyPath)
}

func printUsage() {
    let msg = """
    Usage: swift run SimurghNode [proof|pair] [options]

      proof                    Emit a Stage 2 integrity proof (default if no subcommand)
      pair                     Emit a Stage 2.2 pairing payload signed against --challenge

    Options:
      --session <ID>           Session ID (or env SIMURGH_SESSION_ID)
      --challenge <BASE64>     32-byte server challenge (pair mode only)
      --key-path <path>        Override key file location (default ~/.simurgh/node-key)
      --print-key-info         Print { node_id_hash, node_public_key, key_path } and exit
      --help                   Show usage
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
} catch CLIError.missingChallenge {
    stderr("error: pair mode requires --challenge")
    exit(4)
} catch CLIError.unknownSubcommand(let s) {
    stderr("error: unknown subcommand: \(s)")
    exit(64)
} catch CLIError.unknownFlag(let f) {
    stderr("error: unknown flag: \(f)")
    exit(64)
} catch {
    stderr("error: \(error)")
    exit(1)
}

do {
    let identity = try NodeIdentity.loadOrCreate(at: options.keyPath)

    switch options.mode {
    case .printKeyInfo:
        let info: [String: String] = [
            "node_id_hash": identity.nodeIdHashHex,
            "node_public_key": identity.publicKeyBase64,
            "key_path": options.keyPath,
        ]
        let data = try JSONSerialization.data(withJSONObject: info, options: [.prettyPrinted, .sortedKeys])
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)

    case .proof:
        let envelope = ProofEnvelope.build(sessionId: options.sessionId, identity: identity)
        let signed = try ProofSigner.signAndEncode(envelope: envelope, identity: identity)
        FileHandle.standardOutput.write(signed)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)

    case .pair:
        let envelope = PairingEnvelope.build(
            sessionId: options.sessionId,
            challenge: options.challenge!,
            identity: identity,
            timestamp: currentIso8601()
        )
        let signed = try PairingSigner.signAndEncode(envelope: envelope, identity: identity)
        FileHandle.standardOutput.write(signed)
        FileHandle.standardOutput.write(Data("\n".utf8))
        exit(0)
    }
} catch CLIError.malformedKey(let why) {
    stderr("error: key file at \(options.keyPath) is malformed: \(why)")
    exit(2)
} catch {
    stderr("error: \(error)")
    exit(1)
}
```

If `currentIso8601()` is already declared in `ProofEnvelope.swift`, Swift will fail with a duplicate symbol error. Resolve by moving it into `PairingEnvelope.swift` or by renaming there to e.g. `pairingNowIso8601()`.

- [ ] **Step 2: Build + run smoke**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos
swift build 2>&1 | tail -5
swift run SimurghNode pair --session smoke_sess --challenge AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= --key-path /tmp/test-key 2>/dev/null | head -20
```

Expected: a pretty-printed JSON with exactly 8 fields (`version`, `platform`, `session_id`, `node_id_hash`, `node_public_key`, `challenge`, `timestamp`, `signature`).

```bash
swift run SimurghNode prrof --session x 2>&1 | head -2
echo "exit=$?"
```

Expected:

```
error: unknown subcommand: prrof
exit=64
```

- [ ] **Step 3: Commit**

```bash
git add tools/simurgh-node-macos/Sources/SimurghNode/main.swift
git commit -m "feat(node-macos): add pair subcommand with strict unknown-subcommand handling"
```

---

### Task 15: Add Swift golden-pairing interop test

**Files:**

- Modify: `tools/simurgh-node-macos/Package.swift`
- Create: `tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift`
- Create: `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json`
- Create: `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256`

- [ ] **Step 1: Copy the Node fixture into the Swift test directory**

```bash
cp /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tests/unit/integrity/__fixtures__/golden-pairing-payload.json \
   /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json
cp /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256 \
   /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256
```

- [ ] **Step 2: Update `Package.swift` to ship the new fixture resources**

Open `tools/simurgh-node-macos/Package.swift`. Find the existing `resources:` array under the testTarget. Replace it with:

```swift
            resources: [
                .copy("Fixtures/golden-proof.json"),
                .copy("Fixtures/golden-proof.sha256"),
                .copy("Fixtures/golden-pairing-payload.json"),
                .copy("Fixtures/golden-pairing-payload.sha256"),
            ]
```

- [ ] **Step 3: Create the Swift test**

Create `tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift`:

```swift
import XCTest
import CryptoKit
@testable import SimurghNode

final class PairingCanonicaliseTests: XCTestCase {
    func testGoldenPairingFixtureMatchesNodeHash() throws {
        guard let payloadURL = Bundle.module.url(forResource: "golden-pairing-payload", withExtension: "json"),
              let hashURL = Bundle.module.url(forResource: "golden-pairing-payload", withExtension: "sha256") else {
            XCTFail("golden pairing fixture not found in test bundle")
            return
        }
        let payloadData = try Data(contentsOf: payloadURL)
        let expectedHex = try String(contentsOf: hashURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard var dict = try JSONSerialization.jsonObject(with: payloadData) as? [String: Any] else {
            XCTFail("fixture not a JSON object")
            return
        }
        dict.removeValue(forKey: "signature")

        let canonical = try JSONSerialization.data(
            withJSONObject: dict,
            options: [.sortedKeys, .withoutEscapingSlashes]
        )
        let actualHex = SHA256.hash(data: canonical).map { String(format: "%02x", $0) }.joined()

        XCTAssertEqual(
            actualHex,
            expectedHex,
            "Swift pairing canonicalisation must match Node golden fixture.\n" +
            "Swift canonical bytes:\n\(String(data: canonical, encoding: .utf8) ?? "<not utf8>")"
        )
    }
}
```

- [ ] **Step 4: Run `swift test`**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh/tools/simurgh-node-macos && swift test 2>&1 | tail -15
```

Expected: 2 tests pass (existing `CanonicaliseTests.testGoldenFixtureMatchesNodeHash` + new pairing test).

- [ ] **Step 5: Commit**

```bash
git add tools/simurgh-node-macos/Package.swift \
        tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift \
        tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json \
        tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256
git commit -m "test(node-macos): golden-pairing-payload canonicaliser interop"
```

---

## Phase 5 — Quality Gate + Docs

### Task 16: Extend `scripts/check.sh` with Stage 2.2 gates

**Files:**

- Modify: `scripts/check.sh`

- [ ] **Step 1: Extend the golden fixture sync check**

Find the existing "Golden fixture sync" step. Replace the body of that step (after the `step "Golden fixture sync"` line) with:

```bash
SYNC_OK=true
if ! diff -q tests/unit/integrity/__fixtures__/golden-proof.json \
            tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-proof.json >/dev/null 2>&1 \
   || ! diff -q tests/unit/integrity/__fixtures__/golden-proof.sha256 \
                tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-proof.sha256 >/dev/null 2>&1; then
  SYNC_OK=false
fi
if ! diff -q tests/unit/integrity/__fixtures__/golden-pairing-payload.json \
            tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.json >/dev/null 2>&1 \
   || ! diff -q tests/unit/integrity/__fixtures__/golden-pairing-payload.sha256 \
                tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/golden-pairing-payload.sha256 >/dev/null 2>&1; then
  SYNC_OK=false
fi
if [[ "$SYNC_OK" == "true" ]]; then
  pass "Node + Swift golden fixtures are identical (proof + pairing)"
else
  fail "Golden fixture drift between Node and Swift copies — keep them in sync"
fi
```

- [ ] **Step 2: Append the new Stage 2.2 gates inside the server-boot smoke block**

In `scripts/check.sh`, find the existing "Stage 2.1 — integrity proof round-trip" block. Immediately AFTER its closing `fi` (after the negative-result check), insert this block before the `kill "$S2_PID"` lines:

```bash
# ─────────────────────────────────────────────────────────────
#  Stage 2.2 — pairing round-trip + verified proof status
# ─────────────────────────────────────────────────────────────
PAIR_RT=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'pair_check',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'p@c',sessionId:'pair_check'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const nodeIdHash = computeNodeIdHash(rawPub);
const nodePub = rawPub.toString('base64');

const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'pair_check', node_id_hash: nodeIdHash, node_public_key: nodePub, challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), privateKey).toString('base64');
const cmp = await (await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)})).json();
process.stdout.write(cmp.status === 'paired' && cmp.signature_status === 'verified' ? 'OK' : 'FAIL:' + JSON.stringify(cmp));
" 2>&1)
if [[ "$PAIR_RT" == "OK" ]]; then
  pass "Stage 2.2 pairing round-trip (signature_status: verified)"
else
  fail "Stage 2.2 pairing round-trip"
  echo "$PAIR_RT"
fi

PAIRED_PROOF=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'paired_proof',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'pp@c',sessionId:'paired_proof'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const nodeIdHash = computeNodeIdHash(rawPub);
const nodePub = rawPub.toString('base64');

const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'paired_proof', node_id_hash: nodeIdHash, node_public_key: nodePub, challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), privateKey).toString('base64');
await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)});

const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'paired_proof', node_id_hash: nodeIdHash, node_public_key: nodePub, nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'verified' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1)
if [[ "$PAIRED_PROOF" == "OK" ]]; then
  pass "Stage 2.2 paired-session proof returns verified"
else
  fail "Stage 2.2 paired-session proof"
  echo "$PAIRED_PROOF"
fi

PAIRED_REJECT=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicalisePairingPayload } from './src/integrity/pairingCanonicalise.js';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'paired_reject',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'pr@c',sessionId:'paired_reject'})})).json();
const tok = join.sessionToken;
const a = crypto.generateKeyPairSync('ed25519');
const b = crypto.generateKeyPairSync('ed25519');
const rawA = Buffer.from(a.publicKey.export({format:'jwk'}).x, 'base64url');
const rawB = Buffer.from(b.publicKey.export({format:'jwk'}).x, 'base64url');

const ch = await (await fetch(base + '/api/integrity/pairing/challenge', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:'{}'})).json();
const pair = { version:'simurgh-pairing-proof-v1', platform:'macos', session_id:'paired_reject', node_id_hash: computeNodeIdHash(rawA), node_public_key: rawA.toString('base64'), challenge: ch.challenge, timestamp: new Date().toISOString() };
pair.signature = crypto.sign(null, Buffer.from(canonicalisePairingPayload(pair),'utf8'), a.privateKey).toString('base64');
await fetch(base + '/api/integrity/pairing/complete', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(pair)});

const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'paired_reject', node_id_hash: computeNodeIdHash(rawB), node_public_key: rawB.toString('base64'), nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), b.privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 409 && body.error === 'paired_node_mismatch' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1)
if [[ "$PAIRED_REJECT" == "OK" ]]; then
  pass "Stage 2.2 paired-session rejects different node (409 paired_node_mismatch)"
else
  fail "Stage 2.2 paired-session rejection"
  echo "$PAIRED_REJECT"
fi

UNPAIRED=$(node --input-type=module -e "
import crypto from 'node:crypto';
import { canonicaliseProofPayload } from './src/integrity/proofCanonicalise.js';
import { computeNodeIdHash } from './src/integrity/proofSignature.js';
const base = 'http://localhost:33031';
const exam = await (await fetch(base + '/api/exams', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title:'unpaired',durationMinutes:60})})).json();
const join = await (await fetch(base + '/api/exams/' + exam.id + '/join', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({studentId:'u@c',sessionId:'unpaired_check'})})).json();
const tok = join.sessionToken;
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const rawPub = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url');
const proof = { version:'simurgh-integrity-proof-v1', platform:'macos', session_id:'unpaired_check', node_id_hash: computeNodeIdHash(rawPub), node_public_key: rawPub.toString('base64'), nonce: crypto.randomBytes(16).toString('base64'), timestamp: new Date().toISOString(), capabilities:{screencapturekit_available:false,window_enumeration:false,sharing_state_scan:false,helper_bridge:false}, signals:{node_uptime_ms:0,window_count:0,capture_excluded_window_count:0,helper_status:'not_configured'}, privacy_mode:'metadata_only' };
proof.signature = crypto.sign(null, Buffer.from(canonicaliseProofPayload(proof),'utf8'), privateKey).toString('base64');
const res = await fetch(base + '/api/integrity/proofs', {method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(proof)});
const body = await res.json();
process.stdout.write(res.status === 202 && body.signature_status === 'unregistered_node' ? 'OK' : 'FAIL:' + res.status + ':' + JSON.stringify(body));
" 2>&1)
if [[ "$UNPAIRED" == "OK" ]]; then
  pass "Stage 2.2 unpaired-session proof still returns unregistered_node (backward compat)"
else
  fail "Stage 2.2 unpaired-session backward compat"
  echo "$UNPAIRED"
fi
```

- [ ] **Step 3: Run the full check on macOS**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh && ./scripts/check.sh 2>&1 | grep -E "━━━|✓|✗|Summary|Passed|Failed" | tail -30
```

Expected: 31/31 gates pass (was 27 in Stage 2.1; +4 new gates).

- [ ] **Step 4: Commit**

```bash
git add scripts/check.sh
git commit -m "ci(check.sh): add Stage 2.2 pairing gates (27 → 31)"
```

---

### Task 17: Update README + AGENT.md + CHANGELOG.md

**Files:**

- Modify: `README.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`
- Modify: `tools/simurgh-node-macos/README.md`

- [ ] **Step 1: Add Stage 2.2 paragraph to README**

Find the existing "Stage 2.1 macOS Integrity Node" paragraph in `README.md`. Immediately after it, add:

```markdown
### Stage 2.2 macOS Node Pairing (in progress on `stage-2-2-macos-node-pairing` branch)

Stage 2.2 binds a browser exam session to a macOS node public key. The server issues a one-time 32-byte challenge via `POST /api/integrity/pairing/challenge`; the macOS CLI's new `pair` subcommand signs the canonical pairing payload; `POST /api/integrity/pairing/complete` records the node's public key. Subsequent integrity proofs from the registered node return `signature_status: "verified"`. Stage 2.1 unpaired flow remains backward-compatible. Design spec: [`docs/superpowers/specs/2026-05-14-stage-2-2-macos-node-pairing-design.md`](docs/superpowers/specs/2026-05-14-stage-2-2-macos-node-pairing-design.md).
```

- [ ] **Step 2: Add AGENT.md entry**

Insert at the top of the changelog body in `AGENT.md`:

```markdown
### 2026-05-14 (Australia/Sydney) — Stage 2.2 Implementation

**Raouf:**

- **Scope:** Stage 2.2 — macOS node pairing (Tasks 1–17)
- **Summary:** Five new JS modules: `pairingSchema` (constants), `pairingCanonicalise` (re-export of proof canonicaliser), `pairingValidator` (schema + crypto), `pairingRegistry` (in-memory state machine with injectable now), plus an update to `proofValidator` that accepts `pairedNode` + `expectedSessionId` and returns `signature_status`. Two new server routes: `POST /api/integrity/pairing/challenge` and `/complete`, both rate-limited (10/min and 20/min per session token). The proofs route now looks up the paired node and returns `signature_status: "verified"` when paired. Cross-route N1 consistency check refuses pairing if `integrityState.bound_node_id_hash` already differs. Three new audit event constants emitted with privacy-safe payloads (hashed nonce, challenge_hash, never raw key/signature). macOS Swift CLI gains a `pair` subcommand with strict unknown-subcommand handling (exit 64). Cross-implementation golden pairing fixture locks Swift `JSONEncoder.sortedKeys` byte-equal to Node canonicaliser.
- **Files Changed:**
  - `src/integrity/{pairingSchema,pairingCanonicalise,pairingValidator,pairingRegistry}.js` (new)
  - `src/integrity/proofValidator.js` (pairedNode + expectedSessionId)
  - `src/academic/academicEvents.js` (3 new constants)
  - `server.js` (pairing registry instance, eviction, 2 new routes, proofs route upgrade)
  - `tools/simurgh-node-macos/Sources/SimurghNode/{PairingEnvelope,PairingSigner}.swift` (new)
  - `tools/simurgh-node-macos/Sources/SimurghNode/main.swift` (pair subcommand)
  - `tools/simurgh-node-macos/Tests/SimurghNodeTests/PairingCanonicaliseTests.swift` (new)
  - `tests/unit/integrity/__fixtures__/golden-pairing-payload.{json,sha256}` (new)
  - `scripts/check.sh` (4 new gates: 27 → 31)
- **Verification:** `npm test` (target ≈ 200 pass). `./scripts/check.sh` (full) → 31/31 gates pass on macOS. `swift build` + `swift test` pass on macOS. Smoke round-trip returns `signature_status: "verified"`. Different-node proofs rejected with 409 `paired_node_mismatch`. Unpaired baseline still returns `"unregistered_node"`. `npm audit --audit-level=high` clean.
- **What this does NOT do:** No localhost daemon (Stage 2.3). No browser SDK (Stage 2.4). No ScreenCaptureKit (Stage 2.5). No risk-score integration. No hardware attestation. No persistence across server restarts.
- **Follow-ups:** Open draft PR `stage-2-2-macos-node-pairing` → `main`; tag `v0.4.2-stage-2-2-macos-node-pairing` after merge.
```

- [ ] **Step 3: Add CHANGELOG.md entry**

At the top of `CHANGELOG.md`:

```markdown
## [0.4.2] — 2026-05-14 — Stage 2.2 macOS Node Pairing

### Added

- `src/integrity/pairingSchema.js` — v1 pairing envelope constants (8 required fields, reused forbidden-field blocklist)
- `src/integrity/pairingCanonicalise.js` — re-exports the proof canonicaliser as `canonicalisePairingPayload` (single source of truth for the wire format)
- `src/integrity/pairingValidator.js` — orchestrates v1 schema + timestamp + key/hash + signature checks
- `src/integrity/pairingRegistry.js` — per-session state machine (pending → paired) with injectable `now` for deterministic tests
- `POST /api/integrity/pairing/challenge` — 32-byte CSPRNG challenge, 60 s TTL, 10/min/session-token rate limit
- `POST /api/integrity/pairing/complete` — verifies Ed25519-signed pairing payload, stores node public key for the session, 20/min rate limit
- Three new audit event constants: `INTEGRITY_PAIRING_CHALLENGE_CREATED`, `INTEGRITY_NODE_PAIRED`, `INTEGRITY_PAIRING_REJECTED`; payloads carry only hashes, never raw challenge/public-key/signature
- macOS Swift CLI `pair` subcommand with strict unknown-subcommand handling (exit 64)
- `PairingEnvelope.swift` + `PairingSigner.swift` mirror their proof counterparts
- Cross-implementation golden pairing fixture (`golden-pairing-payload.{json,sha256}`)
- 4 new `scripts/check.sh` gates: pairing round-trip, paired-proof verified, paired-session rejects different node, unpaired backward compat — gate count 27 → 31

### Changed

- `src/integrity/proofValidator.js` — `validateProof(raw, { now, pairedNode, expectedSessionId })`; returns `{ ok, proof, signature_status }`. Paired sessions get `signature_status: "verified"` via E1 strict triple check (hash + public-key string + signature using registered key).
- `server.js` — `POST /api/integrity/proofs` looks up `pairingRegistry.getPairedNode(sessionId)` and forwards it to the validator; new reason codes mapped to 401/409
- `examEvictionTimer` callback now evicts pairing registry entries alongside integrity state
- macOS Swift CLI — `main.swift` rewritten for subcommand dispatch; bare `--session` still defaults to `proof`

### Notes

- Stage 2.2 transitional posture preserved: unpaired Stage 2.1 sessions still return `signature_status: "unregistered_node"`
- Pairing registry is in-memory only; server restart loses all pairings (matches session lifecycle)
- Pairing is immutable per session; `/challenge` and `/complete` both reject 409 `node_already_paired` after pairing
- Cross-route N1 consistency: `/pairing/complete` refuses to pair if `integrityState.bound_node_id_hash` already differs from the pairing payload
- SwiftPM cannot reference resources outside the package, so the golden pairing fixture is duplicated under `tools/simurgh-node-macos/Tests/SimurghNodeTests/Fixtures/`; sync enforced by the `check.sh` "Golden fixture sync" gate
- The CLI's `~/.simurgh/node-key` remains a development identity key, not hardware-backed attestation

### Verified

- `npm test` — all tests pass
- `./scripts/check.sh` (full) — 31/31 gates pass on macOS
- `swift build` + `swift test` — pass on macOS
- `npm audit --audit-level=high` — 0 vulnerabilities
```

- [ ] **Step 4: Update macOS CLI README**

Open `tools/simurgh-node-macos/README.md`. Find the "Build and run" section. After the existing build/run examples, append:

````markdown
### Pair with a session (Stage 2.2)

```bash
# 1. Server issues a challenge
curl -s -X POST http://localhost:3030/api/integrity/pairing/challenge \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq -r .challenge > /tmp/simurgh-challenge.txt

# 2. Node signs the challenge
swift run SimurghNode pair --session sess_abc --challenge "$(cat /tmp/simurgh-challenge.txt)" > /tmp/simurgh-pair.json

# 3. Submit the signed pairing payload
curl -s -X POST http://localhost:3030/api/integrity/pairing/complete \
  -H "Authorization: Bearer <SESSION_TOKEN>" \
  -H 'Content-Type: application/json' \
  --data @/tmp/simurgh-pair.json | jq
```
````

Expected response: `status: "paired"` with `signature_status: "verified"`. Subsequent proof submissions for this session now return `signature_status: "verified"`.

The `pair` subcommand prints exactly 8 fields to stdout: `version`, `platform`, `session_id`, `node_id_hash`, `node_public_key`, `challenge`, `timestamp`, `signature`. No private key. No content. No raw process names or window titles.

````

- [ ] **Step 5: Format and run final check**

```bash
npm run format 2>&1 | tail -3
./scripts/check.sh 2>&1 | grep -E "Summary|Passed|Failed" | tail -3
````

Expected: 31/31 pass.

- [ ] **Step 6: Commit**

```bash
git add README.md AGENT.md CHANGELOG.md tools/simurgh-node-macos/README.md
git commit -m "docs: Stage 2.2 README + AGENT/CHANGELOG 0.4.2 entries + macOS pair examples"
```

---

### Task 18: Push branch + final verification

**Files:** (no file changes)

- [ ] **Step 1: Run the full check one last time**

```bash
cd /Users/raoof.r12/Desktop/Raouf/Project-Simurgh && ./scripts/check.sh 2>&1 | tail -10
```

Expected: 31/31 gates pass.

- [ ] **Step 2: Run all unit tests**

```bash
npm test 2>&1 | tail -8
```

Expected: 0 fails.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin stage-2-2-macos-node-pairing 2>&1 | tail -3
```

- [ ] **Step 4: Watch CI**

```bash
sleep 6
gh run list --limit 1 --branch stage-2-2-macos-node-pairing
```

The workflow `.github/workflows/stage-1-checks.yml` already triggers on PRs to main. CI should run on push and during the PR. On Linux runners the Swift block is skipped (CryptoKit is Apple-only). The four new Stage 2.2 gates all run on Linux (pure Node + curl + Ed25519 via `node:crypto`).

If the workflow's branch filter doesn't include `stage-2-2-macos-node-pairing`, open `.github/workflows/stage-1-checks.yml` and add the branch under `on.push.branches`, then push again. Stage 2.1 already established this pattern.

- [ ] **Step 5: Open the draft PR (when ready)**

```bash
gh pr create \
  --base main \
  --head stage-2-2-macos-node-pairing \
  --draft \
  --title "Stage 2.2: macOS node pairing" \
  --body "Implements browser-session ↔ macOS node key binding. See \`docs/superpowers/specs/2026-05-14-stage-2-2-macos-node-pairing-design.md\` for the approved design."
```

---

## Self-Review

### Spec coverage

| Spec section / requirement                       | Task(s)                              |
| ------------------------------------------------ | ------------------------------------ |
| Module layout — `src/integrity/pairing*` files   | Tasks 1, 2, 3, 4                     |
| Module layout — macOS Swift                      | Tasks 12, 13, 14, 15                 |
| v1 pairing envelope shape + field rules          | Tasks 1, 3                           |
| Forbidden fields reuse                           | Task 1                               |
| Canonical signing rule (re-export)               | Task 2                               |
| Cross-implementation golden fixture              | Tasks 2, 15                          |
| Pairing registry state machine + injectable now  | Task 4                               |
| Server validation flow (challenge)               | Task 9                               |
| Server validation flow (complete)                | Task 10                              |
| Cross-route N1 consistency                       | Task 10                              |
| Rate limits (10/min, 20/min)                     | Tasks 8, 9, 10                       |
| Failure-path minimal audit payload               | Task 10                              |
| Per-session integrity state with N1              | Task 5 (validator) + Task 10 (route) |
| Audit events (3 new constants)                   | Task 6                               |
| macOS CLI subcommands + strict unknown handling  | Task 14                              |
| macOS CLI Stage 2.1 backward compat              | Task 14                              |
| Test plan — schemas                              | Tasks 1, 6                           |
| Test plan — validator                            | Tasks 3, 5                           |
| Test plan — registry                             | Task 4                               |
| Test plan — Swift interop                        | Task 15                              |
| `scripts/check.sh` extensions (27 → 31)          | Task 16                              |
| Docs (README + AGENT + CHANGELOG + macOS README) | Task 17                              |

All 19 acceptance criteria from the spec map to tasks.

### Placeholder scan

No "TBD", "TODO", "implement later", or "similar to Task N". Every step contains the actual code or command. Reason codes, file paths, and HTTP status codes are concrete.

### Type consistency

- `validatePairingProof(raw, { now, expectedSessionId })` signature matches across Tasks 3, 10.
- `createPairingRegistry({ challengeTtlMs })` matches across Tasks 4, 7.
- `validateProof(raw, { now, pairedNode, expectedSessionId })` matches across Tasks 5, 11.
- `signature_status` values (`"verified"`, `"unregistered_node"`) consistent in Tasks 5, 10, 11.
- `EVENTS.INTEGRITY_PAIRING_*` constant names match Task 6 (definition) and Tasks 9, 10 (emission).
- `pairingRegistry.completePairing` returns `{ ok, paired_at, reason }` consistent in Tasks 4, 10.
- `payload.challenge_bytes` (Buffer) is produced by validator (Task 3) and consumed by route (Task 10).
- `canonicalisePairingPayload` referenced identically in Tasks 2, 3, 15.

No inconsistencies found.

---

## Rollback Notes

Each task ends in a commit. To revert a single task: `git revert <commit-sha>`. Tests at the end of each task are the safety net — if `node --test` fails, do not commit. Highest-risk changes:

- **Task 11** (proofs route upgrade) is the most behaviour-changing. If it breaks the existing demo, revert it; Tasks 1–10 add new modules and routes without touching the existing proofs flow contract.
- **Task 5** (`proofValidator` signature change) is depended on by Task 11 but does not break Stage 2.1 callers that don't pass `pairedNode`/`expectedSessionId` (both default to null).
- **Tasks 12–15** (Swift CLI) are isolated from the server. Reverting Swift tasks never affects server behaviour.
- **Task 16** (`scripts/check.sh`) is additive. If a new gate produces false positives, temporarily comment out the offending block while iterating; the existing 27 gates remain.

---

## Build Order Summary

```
Phase 1  → Tasks 1, 2, 3, 4   (foundation: schema, canonicaliser, validator, registry)
Phase 2  → Task 5             (proofValidator upgrade)
Phase 3  → Tasks 6, 7, 8, 9, 10, 11   (event constants, server wiring, two new routes + proofs upgrade)
Phase 4  → Tasks 12, 13, 14, 15   (Swift CLI + interop test)
Phase 5  → Tasks 16, 17, 18   (CI gates + docs + push)
```

Eighteen tasks. ~70 atomic steps. All TDD with frequent commits. Estimated effort: 5–7 hours for a careful engineer with no prior Stage 2 context, less if executed by subagents with the Stage 2.1 patterns already in muscle memory.
