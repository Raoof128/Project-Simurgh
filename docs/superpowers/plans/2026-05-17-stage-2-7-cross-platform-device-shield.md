# Stage 2.7 Cross-Platform Device Shield Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the macOS and Windows Device Shield surface under one documented proof, scanner, risk, report, dashboard, privacy, and audit contract — by **extracting** existing scattered logic into shared modules and adding cross-platform smoke + audit coverage. No native daemon code changes.

**Architecture:** The current code in `src/device/daemonProof.js` already supports both platforms. Stage 2.7 extracts three shared modules — `forbiddenLocalFields.js`, `platformScannerSchema.js`, `scannerRiskPolicy.js` — and refactors the existing consumers (`daemonProof.js`, `daemonState.js`, `riskScoring.js`, `reportBuilder.js`, `tools/privacy-audit.mjs`) to delegate to them. The browser SDK gains a UX-only `getDeviceShieldStatus()` accessor. A new E2E smoke covers Scenarios A–G across both platforms, and a new security audit gate locks the unified negative-test surface.

**Tech Stack:** Node.js ≥ 22 (ESM), `node:test`, `node:crypto`, `node:assert/strict`. Express 4 server. Prettier formatting. Bash smoke scripts. Existing canonicalisation contract (`canonicaliseDaemonPayload`) and P-256 SPKI signatures must not change byte-for-byte.

**Spec:** `docs/superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md`

**Baseline:** `v0.4.12-stage-2-6-windows-display-affinity-scanner` on `main` (commit `642ff41`).

**Target tag:** `v0.4.13-stage-2-7-cross-platform-device-shield`.

---

## File Structure (locked decomposition)

**Create (server modules + tests):**

- `src/device/forbiddenLocalFields.js` — single source of forbidden raw field names + recursive deep-check helper.
- `src/device/platformScannerSchema.js` — supported-platform list, scanner-field schema validation, scanner defaults.
- `src/device/scannerRiskPolicy.js` — mapping from scanner summary → risk level + manual-review wording.
- `tests/unit/forbiddenLocalFields.test.js`
- `tests/unit/platformScannerSchema.test.js`
- `tests/unit/scannerRiskPolicy.test.js`
- `tests/unit/reportBuilderDeviceShield.test.js`
- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`
- `tests/security/stage27_cross_platform_security_audit.test.js`

**Create (scripts):**

- `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`
- `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`

**Create (docs):**

- `docs/DEVICE_SHIELD_CONTRACT.md`
- `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`
- `docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`
- `docs/STAGE_2_7_REVIEWER_CHECKLIST.md`
- `docs/schemas/daemon-proof.schema.json`
- `docs/schemas/device-scanner-result.schema.json`

**Modify (refactor consumers — no behaviour change):**

- `src/device/daemonProof.js` — import from shared modules instead of inlining the lists/validators.
- `src/device/daemonState.js` — `platform` default no longer hard-coded to `"macos"` in `baseRecord`; use `"unknown"`.
- `src/academic/riskScoring.js` — pull daemon-risk policy from `scannerRiskPolicy.js` (light touch; `riskScoring` already consumes `helperInfo.daemonRisk` from `scoreDaemonRisk`).
- `src/academic/reportBuilder.js` — `buildDeviceIntegritySection` renames `platform` → adds `daemon_platform` alongside `platform` (back-compat); imports manual-review wording from `scannerRiskPolicy.js`.
- `tools/privacy-audit.mjs` — import `FORBIDDEN_LOCAL_FIELD_NAMES` from shared module.
- `public/sdk/simurgh-browser-sdk.js` — add `getDeviceShieldStatus()` returning UX-only platform/scanner status from last observed daemon `/status` response. Add `daemonPlatform`, `scannerState`, `scannerVersion` to the state object.
- `scripts/check.sh` — append Stage 2.7 smoke + audit invocations.
- `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `AGENT.md`, `CHANGELOG.md` — Stage 2.7 entries / status updates.
- `docs/STAGE_2_5_TECHNICAL_BRIEF.md` — add historical-scope footnote.
- `docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md` — Stage 2.7 unification cross-reference.

---

## Conventions

- **Working directory:** project root `C:\Users\raoof\Desktop\Projects\Project-Simurgh`. All shell commands run from there.
- **Shell:** PowerShell available; bash also available via Git for Windows. Smoke scripts use bash (`#!/usr/bin/env bash`).
- **Test runner:** `npm test` runs `node --test tests/unit/*.test.js tests/unit/**/*.test.js`. Single-file runs: `node --test tests/unit/<file>.test.js`.
- **Commit cadence:** one commit per task. Co-author trailer: `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>`.
- **TDD discipline:** every new module starts with a failing test. Refactors keep all existing tests green (run `npm test` before and after).
- **Negative-test invariant:** any rejection reason code present today (e.g., `forbidden_local_field`, `invalid_scanner_version`, `unsupported_platform`) must still emit the same code after refactor. The full test suite enforces this — do not loosen any test.

---

## Task 1: Pre-flight and branch

**Files:**

- None changed; verification only.

- [ ] **Step 1: Confirm clean baseline**

```bash
git status
git log --oneline -1
```

Expected: clean working tree; HEAD at `2591cb5 docs(stage-2-7): add cross-platform Device Shield unification design spec` (or later — the spec was just committed on `main`).

- [ ] **Step 2: Run all current verification gates**

```bash
npm install
npm test
npm audit --audit-level=high
node tools/privacy-audit.mjs
bash scripts/smoke-stage-2-2-2-3.sh
bash scripts/smoke-stage-2-4-2-5.sh
bash scripts/security-audit-stage-2-4-2-5.sh
bash scripts/smoke-stage-2-6-windows-scanner.sh
bash scripts/check.sh
```

Expected: all pass. (Per README: 239 Node tests, 11 .NET, 44 quality gate checks.) If any fail, **STOP** and report — the baseline is not what we think.

- [ ] **Step 3: Create the Stage 2.7 branch**

```bash
git checkout -b stage-2-7-cross-platform-device-shield
git push -u origin stage-2-7-cross-platform-device-shield
```

- [ ] **Step 4: Commit the branch creation point (empty commit acceptable for clarity)**

Skip — branch creation is enough; no commit needed yet.

---

## Task 2: Doc scaffolding — contract, matrix, schemas, stage doc, reviewer checklist

**Files:**

- Create: `docs/DEVICE_SHIELD_CONTRACT.md`
- Create: `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`
- Create: `docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`
- Create: `docs/STAGE_2_7_REVIEWER_CHECKLIST.md`
- Create: `docs/schemas/daemon-proof.schema.json`
- Create: `docs/schemas/device-scanner-result.schema.json`

These ship docs-first so subsequent code tasks can point at them.

- [ ] **Step 1: Create `docs/DEVICE_SHIELD_CONTRACT.md`**

Source the section headings and content from spec §4, §5, §6, §7. Sections:

```
1. Overview
2. Supported Platforms
3. Daemon Endpoints (/status, /pair, /proof — see existing macOS daemon README for canonical descriptions)
4. Pairing Flow (reference src/device/daemonProof.js:validateDaemonPairingPayload)
5. Proof Flow (reference src/device/daemonProof.js:validateDaemonProof)
6. Scanner Schema (links to docs/schemas/device-scanner-result.schema.json)
7. Platform-Specific Scanner Mapping
8. Risk Mapping (table from spec §6.2)
9. Privacy Contract (link to src/device/forbiddenLocalFields.js)
10. Report/Dashboard Contract (link to src/academic/reportBuilder.js)
11. Audit Events
12. Error Codes (enumerate every fail() reason from daemonProof.js)
13. Non-Claims (from spec §13)
14. Verification Matrix (links to smoke + audit scripts)
```

The document is the authoritative contract — it must enumerate **every** `fail("...")` reason currently produced by `validateDaemonProof` (lines 76, 254-316 in `src/device/daemonProof.js`). To enumerate them, grep:

```bash
grep -n 'return fail' src/device/daemonProof.js
```

List each reason code with one-line meaning.

- [ ] **Step 2: Create `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`**

Use the matrix from spec §2 verbatim (the capability table covering Browser telemetry, Localhost daemon, Signed P-256 daemon proof, Metadata-only scanner, Display-affinity detection, Real-device validation, Production installer, Hardware attestation, Automatic misconduct decision rows × macOS/Windows/Linux columns).

- [ ] **Step 3: Create `docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`**

Stage-doc style matching `docs/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`. Sections: Goal, Scope, Out-of-Scope, Architecture, Acceptance Criteria, Non-Claims. Cross-link the contract, matrix, schemas, and the spec file.

- [ ] **Step 4: Create `docs/STAGE_2_7_REVIEWER_CHECKLIST.md`**

A flat checklist matching the acceptance criteria from spec §12. Reviewers tick boxes.

- [ ] **Step 5: Create `docs/schemas/daemon-proof.schema.json`**

JSON Schema draft-07 style. Required properties listed in `src/device/daemonProof.js:11-24` (`PROOF_REQUIRED_FIELDS`). Optional scanner fields from `validateScannerFields` (lines 109-199). Enum for `platform`: `["macos", "windows"]`. Enum for `scanner_state`: copy from `daemonProof.js:59-67` (`SCANNER_STATES`). Enum for `helper_state`: copy from `daemonProof.js:58` (`HELPER_STATES`). `privacy_mode`: const `"metadata_only"`. `additionalProperties: false`. Add `"$comment"` on each field briefly describing its meaning.

- [ ] **Step 6: Create `docs/schemas/device-scanner-result.schema.json`**

JSON Schema draft-07. Required: `platform`, `scanner_state`, `scanner_version`, `privacy_mode`. Optional: all other counters. Same enums for `platform` and `scanner_state` as the proof schema. Document that all top-level keys are emitted by every supported platform; platforms emit `0` for counters that don't apply.

- [ ] **Step 7: Format and commit**

```bash
npm run format
git add docs/DEVICE_SHIELD_CONTRACT.md docs/DEVICE_SHIELD_PLATFORM_MATRIX.md docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md docs/STAGE_2_7_REVIEWER_CHECKLIST.md docs/schemas/daemon-proof.schema.json docs/schemas/device-scanner-result.schema.json
git commit -m "$(cat <<'EOF'
docs(stage-2-7): add cross-platform Device Shield contract, matrix, schemas

Documents the unified macOS+Windows Device Shield surface ahead of code
extraction. Schemas enumerate the proof and scanner result shapes that
src/device/daemonProof.js already accepts; this commit codifies them.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extract `forbiddenLocalFields.js` with TDD

**Files:**

- Create: `src/device/forbiddenLocalFields.js`
- Create: `tests/unit/forbiddenLocalFields.test.js`

The current forbidden-field list lives in two places: `src/device/daemonProof.js:26-56` (29 names) and `tools/privacy-audit.mjs:14-52` (38 names — a superset that includes telemetry-side fields). We unify on the **superset** as the canonical list, since rejecting a field in a proof that the privacy audit would also flag is consistent and strictly safer.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/forbiddenLocalFields.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  FORBIDDEN_LOCAL_FIELD_NAMES,
  containsForbiddenLocalFieldDeep,
} from "../../src/device/forbiddenLocalFields.js";

test("FORBIDDEN_LOCAL_FIELD_NAMES is the union of proof and privacy-audit lists", () => {
  // Names currently in daemonProof.js FORBIDDEN_FIELDS
  const proofNames = [
    "device_serial",
    "serial_number",
    "mac_address",
    "username",
    "home_directory",
    "process_name",
    "process_id",
    "window_title",
    "raw_window_title",
    "window_handle",
    "hwnd",
    "screenshot",
    "screen_pixels",
    "screen_frame",
    "raw_window",
    "raw_process",
    "raw_process_name",
    "pid",
    "process_identifier",
    "bundle_path",
    "executable_path",
    "file_path",
    "microphone",
    "audio",
    "webcam",
    "typed_content",
    "paste_content",
    "answer_text",
    "answer_content",
  ];
  // Additional names currently in tools/privacy-audit.mjs FORBIDDEN_FIELDS
  const privacyAuditExtras = [
    "screen_data",
    "webcam_frame",
    "audio_data",
    "face",
    "face_data",
    "biometric",
    "biometric_data",
    "raw_student_name",
    "student_name",
  ];
  for (const n of proofNames) assert.ok(FORBIDDEN_LOCAL_FIELD_NAMES.includes(n), `missing: ${n}`);
  for (const n of privacyAuditExtras)
    assert.ok(FORBIDDEN_LOCAL_FIELD_NAMES.includes(n), `missing: ${n}`);
});

test("FORBIDDEN_LOCAL_FIELD_NAMES is frozen and contains no duplicates", () => {
  assert.ok(Object.isFrozen(FORBIDDEN_LOCAL_FIELD_NAMES));
  const unique = new Set(FORBIDDEN_LOCAL_FIELD_NAMES);
  assert.equal(unique.size, FORBIDDEN_LOCAL_FIELD_NAMES.length);
});

test("containsForbiddenLocalFieldDeep finds top-level forbidden key", () => {
  assert.equal(containsForbiddenLocalFieldDeep({ pid: 123 }), "pid");
});

test("containsForbiddenLocalFieldDeep finds deeply-nested forbidden key", () => {
  assert.equal(containsForbiddenLocalFieldDeep({ debug: { scanner: { hwnd: "0x123" } } }), "hwnd");
});

test("containsForbiddenLocalFieldDeep finds forbidden key inside array", () => {
  assert.equal(
    containsForbiddenLocalFieldDeep({ items: [{ ok: 1 }, { process_name: "x" }] }),
    "process_name"
  );
});

test("containsForbiddenLocalFieldDeep returns null on clean payload", () => {
  assert.equal(
    containsForbiddenLocalFieldDeep({
      session_id: "sess_1",
      capture_excluded_window_count: 0,
      window_fingerprint_hashes: [],
    }),
    null
  );
});

test("containsForbiddenLocalFieldDeep handles null and primitives", () => {
  assert.equal(containsForbiddenLocalFieldDeep(null), null);
  assert.equal(containsForbiddenLocalFieldDeep("hwnd"), null);
  assert.equal(containsForbiddenLocalFieldDeep(42), null);
});

test("containsForbiddenLocalFieldDeep is allowed-hash-suffix aware", () => {
  // _hash, _sha256, _digest suffixes should be allowed even if root name is forbidden-like.
  // e.g. node_id_hash is fine even though "id" would otherwise be neutral.
  assert.equal(containsForbiddenLocalFieldDeep({ process_name_hash: "x" }), null);
  assert.equal(containsForbiddenLocalFieldDeep({ window_title_sha256: "x" }), null);
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
node --test tests/unit/forbiddenLocalFields.test.js
```

Expected: FAIL with `Cannot find module ... forbiddenLocalFields.js`.

- [ ] **Step 3: Implement the module**

Create `src/device/forbiddenLocalFields.js`:

```js
// Single source of truth for forbidden raw local field names across the
// Stage 2.7 cross-platform Device Shield surface. Consumed by:
//  - src/device/daemonProof.js  (daemon proof + pairing payload rejection)
//  - tools/privacy-audit.mjs    (JSON-on-disk scanner)
//  - tests/security/*           (negative-test surface)
//
// Hash-suffixed counterparts (e.g. node_id_hash, window_title_sha256) are
// explicitly allowed — they are the privacy-preserving alternatives.

export const FORBIDDEN_LOCAL_FIELD_NAMES = Object.freeze([
  // Identity / device
  "device_serial",
  "serial_number",
  "mac_address",
  "username",
  "home_directory",
  // Process / window enumeration
  "process_name",
  "raw_process_name",
  "process_id",
  "process_identifier",
  "pid",
  "window_title",
  "raw_window_title",
  "window_handle",
  "hwnd",
  "raw_window",
  "raw_process",
  // Filesystem paths
  "bundle_path",
  "executable_path",
  "file_path",
  // Pixel / frame
  "screenshot",
  "screen_pixels",
  "screen_frame",
  "screen_data",
  // Webcam / mic
  "webcam",
  "webcam_frame",
  "audio",
  "audio_data",
  "microphone",
  // Biometric
  "face",
  "face_data",
  "biometric",
  "biometric_data",
  // Identity (student-facing)
  "raw_student_name",
  "student_name",
  // Content
  "typed_content",
  "paste_content",
  "answer_text",
  "answer_content",
]);

const ALLOWED_HASH_SUFFIXES = ["_hash", "_sha256", "_digest"];

function isAllowedHashField(key) {
  return ALLOWED_HASH_SUFFIXES.some((s) => key.endsWith(s));
}

export function containsForbiddenLocalFieldDeep(value) {
  if (value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = containsForbiddenLocalFieldDeep(item);
      if (nested) return nested;
    }
    return null;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_LOCAL_FIELD_NAMES.includes(key) && !isAllowedHashField(key)) {
      return key;
    }
    const nested = containsForbiddenLocalFieldDeep(nestedValue);
    if (nested) return nested;
  }
  return null;
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
node --test tests/unit/forbiddenLocalFields.test.js
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run full unit suite to confirm no regression**

```bash
npm test
```

Expected: all green. (`daemonProof.js` still uses its own list; that's Task 4.)

- [ ] **Step 6: Format and commit**

```bash
npm run format
git add src/device/forbiddenLocalFields.js tests/unit/forbiddenLocalFields.test.js
git commit -m "$(cat <<'EOF'
feat(device): extract shared forbiddenLocalFields module (Stage 2.7)

Adds src/device/forbiddenLocalFields.js as the single source of truth for
forbidden raw local field names. Canonical list is the union of the
previous daemonProof and privacy-audit lists; hash-suffixed counterparts
remain explicitly allowed.

No consumer migrated yet — that's the next commits.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Refactor `src/device/daemonProof.js` to consume `forbiddenLocalFields`

**Files:**

- Modify: `src/device/daemonProof.js:1-92` (imports + delete inlined `FORBIDDEN_FIELDS` + `findForbiddenField`)

Pure refactor — no behaviour change. All `daemonProof*.test.js` and `daemonProofScanner.test.js` must remain green.

- [ ] **Step 1: Snapshot baseline test status**

```bash
npm test -- 2>&1 | tail -5
```

Expected: pass count noted; will compare after refactor.

- [ ] **Step 2: Edit `src/device/daemonProof.js`**

Replace lines 1-92 region. The changes:

- Add import line at top: `import { FORBIDDEN_LOCAL_FIELD_NAMES, containsForbiddenLocalFieldDeep } from "./forbiddenLocalFields.js";`
- Delete the inline `const FORBIDDEN_FIELDS = [...]` array (lines 26-56).
- Delete the inline `function findForbiddenField(...)` (lines 77-92).
- Replace all internal references: `FORBIDDEN_FIELDS.includes(key)` → `FORBIDDEN_LOCAL_FIELD_NAMES.includes(key)`; `findForbiddenField(raw)` → `containsForbiddenLocalFieldDeep(raw)`.

There are exactly two `findForbiddenField` call sites (currently lines 246 and 357). Both stay; just rename.

- [ ] **Step 3: Run all daemon-proof tests**

```bash
node --test tests/unit/daemonProof.test.js tests/unit/daemonProofScanner.test.js tests/unit/daemonPairing.test.js
```

Expected: all PASS.

- [ ] **Step 4: Run full unit suite**

```bash
npm test
```

Expected: same number of pass/fail as Step 1 baseline.

- [ ] **Step 5: Commit**

```bash
git add src/device/daemonProof.js
git commit -m "$(cat <<'EOF'
refactor(device): daemonProof consumes shared forbiddenLocalFields (Stage 2.7)

No behaviour change. All daemonProof / daemonProofScanner / daemonPairing
unit tests remain green. forbidden_local_field reason code unchanged.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Refactor `tools/privacy-audit.mjs` to consume `forbiddenLocalFields`

**Files:**

- Modify: `tools/privacy-audit.mjs:14-52` (delete inline list, import shared)

- [ ] **Step 1: Edit `tools/privacy-audit.mjs`**

Replace lines 14-52 with:

```js
import { FORBIDDEN_LOCAL_FIELD_NAMES } from "../src/device/forbiddenLocalFields.js";

const FORBIDDEN_FIELDS = new Set(FORBIDDEN_LOCAL_FIELD_NAMES);
```

Keep `ALLOWED_HASH_SUFFIXES` and `isAllowedHashField` as-is (the audit-side suffix list is intentionally identical; leaving it inline keeps the script self-contained for forensic CLI use).

- [ ] **Step 2: Run privacy audit**

```bash
node tools/privacy-audit.mjs
```

Expected: same output as before — passes with N files scanned.

- [ ] **Step 3: Run full unit suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add tools/privacy-audit.mjs
git commit -m "$(cat <<'EOF'
refactor(privacy): privacy-audit consumes shared forbiddenLocalFields (Stage 2.7)

The forbidden-name set is now sourced from src/device/forbiddenLocalFields.js.
Hash-suffix allowlist remains inline so the script stays self-contained for
forensic CLI use.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Extract `platformScannerSchema.js` with TDD

**Files:**

- Create: `src/device/platformScannerSchema.js`
- Create: `tests/unit/platformScannerSchema.test.js`

This extracts the per-platform scanner version map, supported-platform list, scanner-state enum, and the `validateScannerFields` body from `src/device/daemonProof.js:109-199`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/platformScannerSchema.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPPORTED_DEVICE_PLATFORMS,
  PLANNED_DEVICE_PLATFORMS,
  SCANNER_STATES,
  getExpectedScannerVersion,
  isSupportedPlatform,
  getPlatformScannerDefaults,
  validateScannerSummary,
} from "../../src/device/platformScannerSchema.js";

test("SUPPORTED_DEVICE_PLATFORMS contains macos and windows only", () => {
  assert.deepEqual([...SUPPORTED_DEVICE_PLATFORMS].sort(), ["macos", "windows"]);
});

test("PLANNED_DEVICE_PLATFORMS contains linux", () => {
  assert.ok(PLANNED_DEVICE_PLATFORMS.includes("linux"));
});

test("isSupportedPlatform accepts macos and windows, rejects linux/unknown", () => {
  assert.equal(isSupportedPlatform("macos"), true);
  assert.equal(isSupportedPlatform("windows"), true);
  assert.equal(isSupportedPlatform("linux"), false);
  assert.equal(isSupportedPlatform("unknown"), false);
  assert.equal(isSupportedPlatform(""), false);
  assert.equal(isSupportedPlatform(null), false);
});

test("getExpectedScannerVersion returns 2.5.0 for macos and 2.6.0 for windows", () => {
  assert.equal(getExpectedScannerVersion("macos"), "2.5.0");
  assert.equal(getExpectedScannerVersion("windows"), "2.6.0");
});

test("SCANNER_STATES is the canonical enum used across platforms", () => {
  assert.ok(SCANNER_STATES.has("healthy"));
  assert.ok(SCANNER_STATES.has("risk_detected"));
  assert.ok(SCANNER_STATES.has("restricted_detected"));
  assert.ok(SCANNER_STATES.has("scanner_unavailable"));
  assert.ok(SCANNER_STATES.has("permission_denied"));
  assert.ok(SCANNER_STATES.has("scan_error"));
  assert.ok(SCANNER_STATES.has("unsupported_macos_version"));
});

test("getPlatformScannerDefaults returns zeroed counters for macos", () => {
  const d = getPlatformScannerDefaults("macos");
  assert.equal(d.scanner_state, "healthy");
  assert.equal(d.capture_restricted_window_count, 0);
  assert.equal(d.monitor_only_window_count, 0);
  assert.equal(d.privacy_mode, "metadata_only");
});

test("validateScannerSummary accepts a healthy macos summary", () => {
  const raw = {
    platform: "macos",
    capture_excluded_window_count: 0,
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 8,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 12,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, true);
  assert.equal(r.fields.scanner_state, "healthy");
});

test("validateScannerSummary rejects mismatched scanner_version for platform", () => {
  const raw = {
    platform: "windows",
    capture_excluded_window_count: 0,
    scanner_state: "healthy",
    scanner_version: "2.5.0", // wrong for windows
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_scanner_version");
});

test("validateScannerSummary returns defaults when no scanner fields present", () => {
  // Backward-compat: pre-scanner proofs (Stage 2.3 era) had no scanner keys.
  const raw = { platform: "macos", capture_excluded_window_count: 0 };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, true);
  assert.equal(r.fields.scanner_state, "healthy");
  assert.equal(r.fields.privacy_mode, "metadata_only");
});

test("validateScannerSummary rejects suspicious_window_count below capture_excluded+monitor_only", () => {
  const raw = {
    platform: "windows",
    capture_excluded_window_count: 1,
    scanner_state: "risk_detected",
    scanner_version: "2.6.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0, // inconsistent
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 1,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_suspicious_window_count");
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
node --test tests/unit/platformScannerSchema.test.js
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/device/platformScannerSchema.js`**

```js
// Shared platform/scanner schema. Lifts validateScannerFields out of
// src/device/daemonProof.js so both the proof validator and any future
// scanner-only consumers share one truth.

export const SUPPORTED_DEVICE_PLATFORMS = Object.freeze(["macos", "windows"]);
export const PLANNED_DEVICE_PLATFORMS = Object.freeze(["linux"]);

export const SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "restricted_detected",
  "scanner_unavailable",
  "permission_denied",
  "scan_error",
  "unsupported_macos_version",
]);

const SCANNER_VERSION_BY_PLATFORM = Object.freeze({
  macos: "2.5.0",
  windows: "2.6.0",
});

const FINGERPRINT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function fail(reason) {
  return { ok: false, reason };
}

function isNonNegativeInt(value, max = 100_000) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

export function isSupportedPlatform(platform) {
  return typeof platform === "string" && SUPPORTED_DEVICE_PLATFORMS.includes(platform);
}

export function getExpectedScannerVersion(platform) {
  return SCANNER_VERSION_BY_PLATFORM[platform] ?? null;
}

export function getPlatformScannerDefaults(platform) {
  return Object.freeze({
    platform,
    scanner_state: "healthy",
    scanner_version: SCANNER_VERSION_BY_PLATFORM[platform] ?? null,
    scan_timestamp: null,
    scan_duration_ms: null,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    capture_excluded_window_count: 0,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  });
}

// Verbatim port of the body of validateScannerFields(raw) from
// src/device/daemonProof.js (lines 109-199). Behaviour MUST be identical;
// every fail() reason code preserved.
export function validateScannerSummary(raw) {
  const scannerKeys = [
    "scanner_state",
    "scanner_version",
    "scan_timestamp",
    "scan_duration_ms",
    "scan_error_count",
    "suspicious_window_count",
    "visible_window_count",
    "capture_restricted_window_count",
    "monitor_only_window_count",
    "privacy_mode",
    "window_fingerprint_hashes",
  ];
  const hasScannerFields = scannerKeys.some((key) => key in raw);
  if (!hasScannerFields) {
    return {
      ok: true,
      fields: {
        scanner_state: raw.capture_excluded_window_count > 0 ? "risk_detected" : "healthy",
        scanner_version: null,
        scan_timestamp: null,
        scan_duration_ms: null,
        scan_error_count: 0,
        suspicious_window_count: raw.capture_excluded_window_count,
        visible_window_count: null,
        capture_restricted_window_count: 0,
        monitor_only_window_count: 0,
        privacy_mode: "metadata_only",
        window_fingerprint_hashes: [],
      },
    };
  }
  if (typeof raw.scanner_state !== "string" || !SCANNER_STATES.has(raw.scanner_state)) {
    return fail("invalid_scanner_state");
  }
  const expectedScannerVersion = getExpectedScannerVersion(raw.platform);
  if (typeof raw.scanner_version !== "string" || raw.scanner_version !== expectedScannerVersion) {
    return fail("invalid_scanner_version");
  }
  const scanTs = Date.parse(raw.scan_timestamp);
  if (typeof raw.scan_timestamp !== "string" || !Number.isFinite(scanTs)) {
    return fail("invalid_scan_timestamp");
  }
  if (!isNonNegativeInt(raw.scan_duration_ms, 60_000)) {
    return fail("invalid_scan_duration_ms");
  }
  if (!isNonNegativeInt(raw.scan_error_count, 256)) return fail("invalid_scan_error_count");
  if (!isNonNegativeInt(raw.suspicious_window_count, 256)) {
    return fail("invalid_suspicious_window_count");
  }
  if (!isNonNegativeInt(raw.visible_window_count, 10_000)) {
    return fail("invalid_visible_window_count");
  }
  const captureRestrictedWindowCount = raw.capture_restricted_window_count ?? 0;
  const monitorOnlyWindowCount = raw.monitor_only_window_count ?? 0;
  if (!isNonNegativeInt(captureRestrictedWindowCount, 256)) {
    return fail("invalid_capture_restricted_window_count");
  }
  if (!isNonNegativeInt(monitorOnlyWindowCount, 256)) {
    return fail("invalid_monitor_only_window_count");
  }
  if (raw.privacy_mode !== "metadata_only") return fail("invalid_privacy_mode");
  if (!Array.isArray(raw.window_fingerprint_hashes) || raw.window_fingerprint_hashes.length > 256) {
    return fail("invalid_window_fingerprint_hashes");
  }
  for (const hash of raw.window_fingerprint_hashes) {
    if (typeof hash !== "string" || !FINGERPRINT_HASH_PATTERN.test(hash)) {
      return fail("invalid_window_fingerprint_hashes");
    }
  }
  if (raw.suspicious_window_count < raw.capture_excluded_window_count + monitorOnlyWindowCount) {
    return fail("invalid_suspicious_window_count");
  }
  return {
    ok: true,
    fields: {
      scanner_state: raw.scanner_state,
      scanner_version: raw.scanner_version,
      scan_timestamp: raw.scan_timestamp,
      scan_duration_ms: raw.scan_duration_ms,
      scan_error_count: raw.scan_error_count,
      suspicious_window_count: raw.suspicious_window_count,
      visible_window_count: raw.visible_window_count,
      capture_restricted_window_count: captureRestrictedWindowCount,
      monitor_only_window_count: monitorOnlyWindowCount,
      privacy_mode: raw.privacy_mode,
      window_fingerprint_hashes: [...raw.window_fingerprint_hashes],
    },
  };
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
node --test tests/unit/platformScannerSchema.test.js
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Run full unit suite (no consumer migrated yet)**

```bash
npm test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/device/platformScannerSchema.js tests/unit/platformScannerSchema.test.js
git commit -m "$(cat <<'EOF'
feat(device): extract shared platformScannerSchema module (Stage 2.7)

Lifts validateScannerFields, SCANNER_STATES, and the per-platform scanner
version map out of src/device/daemonProof.js. Behaviour identical — same
fail() reason codes, same accepted/rejected inputs. Consumer migration in
the next commit.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Refactor `src/device/daemonProof.js` to consume `platformScannerSchema`

**Files:**

- Modify: `src/device/daemonProof.js` — delete inlined `validateScannerFields`, `SCANNER_STATES`, `SUPPORTED_DAEMON_PLATFORMS`, `FINGERPRINT_HASH_PATTERN`, the `expectedScannerVersion` per-platform branch; import from `./platformScannerSchema.js`.

- [ ] **Step 1: Edit `src/device/daemonProof.js`**

At top, add:

```js
import { SUPPORTED_DEVICE_PLATFORMS, validateScannerSummary } from "./platformScannerSchema.js";
```

Remove:

- `const SUPPORTED_DAEMON_PLATFORMS = new Set(["macos", "windows"]);` (line 9) → replace usages with `SUPPORTED_DEVICE_PLATFORMS.includes(raw.platform)` and `SUPPORTED_DEVICE_PLATFORMS.includes(signed_payload.platform)`.
- `const SCANNER_STATES = new Set([...]);` (lines 59-67).
- `const FINGERPRINT_HASH_PATTERN = ...` (line 71) — only if no other reference; otherwise leave.
- The entire body of `function validateScannerFields(raw) { ... }` (lines 109-199). Replace with: `function validateScannerFields(raw) { return validateScannerSummary(raw); }` — or simply call `validateScannerSummary(raw)` directly at the existing call site (line 301) and remove the local wrapper.

**Recommended:** call `validateScannerSummary(raw)` directly at the call site; delete the local `validateScannerFields` wrapper entirely.

- [ ] **Step 2: Run all daemon-proof and scanner tests**

```bash
node --test tests/unit/daemonProof.test.js tests/unit/daemonProofScanner.test.js tests/unit/daemonPairing.test.js
```

Expected: all PASS.

- [ ] **Step 3: Run full unit suite**

```bash
npm test
```

Expected: all green; same pass count as before.

- [ ] **Step 4: Commit**

```bash
git add src/device/daemonProof.js
git commit -m "$(cat <<'EOF'
refactor(device): daemonProof consumes shared platformScannerSchema (Stage 2.7)

Pure delegation: SUPPORTED_DAEMON_PLATFORMS, SCANNER_STATES, and the
per-platform scanner-version branch now come from platformScannerSchema.js.
All fail() reason codes preserved; full daemonProof / daemonProofScanner /
daemonPairing test surfaces remain green.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Extract `scannerRiskPolicy.js` with TDD

**Files:**

- Create: `src/device/scannerRiskPolicy.js`
- Create: `tests/unit/scannerRiskPolicy.test.js`

This extracts the daemon-risk mapping currently in `src/device/daemonState.js:scoreDaemonRisk` (lines 64-87) and the manual-review wording currently duplicated across `riskScoring.js` and `reportBuilder.js`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/scannerRiskPolicy.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  mapScannerSummaryToRisk,
  getManualReviewReason,
} from "../../src/device/scannerRiskPolicy.js";

test("capture_excluded > 0 yields Critical floor", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "risk_detected",
    capture_excluded_window_count_max: 1,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "risk_detected",
  });
  assert.equal(r.daemon_risk, 100);
  assert.equal(r.forceCritical, true);
});

test("monitor_only > 0 yields Warning (40, not Critical)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 1,
    scanner_state: "healthy",
  });
  assert.equal(r.daemon_risk, 40);
  assert.equal(r.forceCritical, false);
});

test("capture_restricted > 0 yields Warning", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 1,
    monitor_only_window_count_max: 0,
    scanner_state: "restricted_detected",
  });
  assert.equal(r.daemon_risk, 40);
});

test("scanner_unavailable / permission_denied / scan_error yield Warning", () => {
  for (const s of ["scanner_unavailable", "permission_denied", "scan_error"]) {
    const r = mapScannerSummaryToRisk({
      daemon_state: "healthy",
      capture_excluded_window_count_max: 0,
      capture_restricted_window_count_max: 0,
      monitor_only_window_count_max: 0,
      scanner_state: s,
    });
    assert.equal(r.daemon_risk, 40, `state ${s}`);
  }
});

test("daemon_state untrusted/unpaired/stale/missing map to documented partial risks", () => {
  const base = {
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "unknown",
  };
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "untrusted" }).daemon_risk, 50);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "unpaired" }).daemon_risk, 25);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "stale" }).daemon_risk, 20);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "missing" }).daemon_risk, 15);
});

test("healthy clean record yields zero risk", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "healthy",
  });
  assert.equal(r.daemon_risk, 0);
  assert.equal(r.forceCritical, false);
});

test("getManualReviewReason returns documented wording for Critical/Warning/Safe", () => {
  assert.equal(
    getManualReviewReason("Critical"),
    "Manual review required. No automatic misconduct finding."
  );
  assert.equal(
    getManualReviewReason("Warning"),
    "Manual review recommended. No automatic misconduct finding."
  );
  assert.equal(getManualReviewReason("Safe"), "No anomalies detected.");
});

test("getManualReviewReason device-integrity variant", () => {
  // Used by reportBuilder.buildDeviceIntegritySection
  assert.equal(
    getManualReviewReason("Critical", { context: "device_integrity" }),
    "Manual review recommended. No automatic misconduct finding."
  );
  assert.equal(
    getManualReviewReason("Safe", { context: "device_integrity" }),
    "No device-integrity anomaly detected."
  );
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
node --test tests/unit/scannerRiskPolicy.test.js
```

Expected: FAIL — module missing.

- [ ] **Step 3: Implement `src/device/scannerRiskPolicy.js`**

```js
// Shared risk policy mapping daemon/scanner state → risk numeric + manual-
// review wording. Verbatim port of the current behaviour in
//   src/device/daemonState.js:scoreDaemonRisk (lines 64-87)
//   src/academic/riskScoring.js:recommendation (lines 104-109)
//   src/academic/reportBuilder.js:buildDeviceIntegritySection wording

const DAEMON_STATES = Object.freeze({
  RISK_DETECTED: "risk_detected",
  UNTRUSTED: "untrusted",
  UNPAIRED: "unpaired",
  STALE: "stale",
  MISSING: "missing",
});

export function mapScannerSummaryToRisk(record) {
  const state = record?.daemon_state ?? DAEMON_STATES.MISSING;
  const maxExcluded = record?.capture_excluded_window_count_max ?? 0;
  const maxRestricted = record?.capture_restricted_window_count_max ?? 0;
  const maxMonitorOnly = record?.monitor_only_window_count_max ?? 0;
  if (maxExcluded > 0 || state === DAEMON_STATES.RISK_DETECTED) {
    return { daemon_risk: 100, forceCritical: true };
  }
  if (maxRestricted > 0 || maxMonitorOnly > 0 || record?.scanner_state === "restricted_detected") {
    return { daemon_risk: 40, forceCritical: false };
  }
  if (
    record?.scanner_state === "scanner_unavailable" ||
    record?.scanner_state === "permission_denied" ||
    record?.scanner_state === "scan_error"
  ) {
    return { daemon_risk: 40, forceCritical: false };
  }
  if (state === DAEMON_STATES.UNTRUSTED) return { daemon_risk: 50, forceCritical: false };
  if (state === DAEMON_STATES.UNPAIRED) return { daemon_risk: 25, forceCritical: false };
  if (state === DAEMON_STATES.STALE) return { daemon_risk: 20, forceCritical: false };
  if (state === DAEMON_STATES.MISSING) return { daemon_risk: 15, forceCritical: false };
  return { daemon_risk: 0, forceCritical: false };
}

export function getManualReviewReason(riskLevel, { context = "session" } = {}) {
  if (context === "device_integrity") {
    return riskLevel === "Safe"
      ? "No device-integrity anomaly detected."
      : "Manual review recommended. No automatic misconduct finding.";
  }
  if (riskLevel === "Critical") {
    return "Manual review required. No automatic misconduct finding.";
  }
  if (riskLevel === "Warning") {
    return "Manual review recommended. No automatic misconduct finding.";
  }
  return "No anomalies detected.";
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
node --test tests/unit/scannerRiskPolicy.test.js
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run full unit suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/device/scannerRiskPolicy.js tests/unit/scannerRiskPolicy.test.js
git commit -m "$(cat <<'EOF'
feat(device): extract shared scannerRiskPolicy module (Stage 2.7)

Lifts the daemon-risk mapping currently in daemonState.scoreDaemonRisk and
the manual-review wording from riskScoring + reportBuilder into one module.
No consumer migrated yet — that's the next two commits.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Refactor `src/device/daemonState.js` to consume `scannerRiskPolicy`

**Files:**

- Modify: `src/device/daemonState.js:64-87` (delete inline `scoreDaemonRisk` body, delegate to shared module)
- Modify: `src/device/daemonState.js:20` (`platform: "macos"` default → `"unknown"`)

- [ ] **Step 1: Edit `daemonState.js` to import and delegate**

Add at top of the file (after existing line 1 `export const DAEMON_STATES = ...`):

```js
import { mapScannerSummaryToRisk } from "./scannerRiskPolicy.js";
```

Replace `scoreDaemonRisk` body (lines 64-87) with:

```js
export function scoreDaemonRisk(record) {
  return mapScannerSummaryToRisk(record);
}
```

Change line 20 from `platform: "macos",` to `platform: "unknown",`. This is the **one substantive change in this refactor** — the previous default of `"macos"` predated Stage 2.6. With Windows now first-class, the default should be `"unknown"` until a paired daemon reports its actual platform via `recordPaired`. Verify the test suite still passes; if `tests/unit/daemonState.test.js` asserts the macos default explicitly, update that single assertion (most tests use `recordPaired({ platform: "macos" })` or `recordPaired({ platform: "windows" })` explicitly).

- [ ] **Step 2: Run daemon-state and risk tests**

```bash
node --test tests/unit/daemonState.test.js tests/unit/daemonScannerRisk.test.js tests/unit/riskScoring.test.js
```

Expected: all PASS. If `daemonState.test.js` fails on the platform default, update the assertion to `"unknown"` (verify no integration test relies on the old default).

- [ ] **Step 3: Run full unit suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/device/daemonState.js tests/unit/daemonState.test.js
git commit -m "$(cat <<'EOF'
refactor(device): daemonState delegates risk to scannerRiskPolicy + neutral platform default (Stage 2.7)

scoreDaemonRisk now delegates to mapScannerSummaryToRisk in
scannerRiskPolicy.js. baseRecord platform default changed from "macos" to
"unknown" so unpaired sessions don't implicitly claim a platform —
recordPaired sets the real value once a daemon pairs.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Refactor `src/academic/reportBuilder.js` to consume `scannerRiskPolicy` + add `daemon_platform`

**Files:**

- Modify: `src/academic/reportBuilder.js:66-99` (`buildDeviceIntegritySection`)
- Create: `tests/unit/reportBuilderDeviceShield.test.js`

The current section emits `platform`. Per spec §7.1, Stage 2.7 adds `daemon_platform` as the canonical key while keeping `platform` as a back-compat alias for at least this release.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/reportBuilderDeviceShield.test.js`:

```js
import assert from "node:assert/strict";
import test from "node:test";

import { buildReport } from "../../src/academic/reportBuilder.js";

function baseSession() {
  return {
    sessionRecord: {
      id: "sess_1",
      examId: "exam_1",
      studentIdHash: "sha256:abc",
      startedAt: 1_700_000_000_000,
      submittedAt: 1_700_000_600_000,
      createdAt: 1_700_000_000_000,
    },
    sessionData: { latest: null, affinity: null, daemon: null },
    eventList: [],
    auditChainValid: true,
  };
}

test("device_integrity includes daemon_platform alongside back-compat platform key", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "windows",
    scanner_state: "healthy",
    scanner_version: "2.6.0",
    proofs_verified: 4,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(r.device_integrity.daemon_platform, "windows");
  assert.equal(r.device_integrity.platform, "windows"); // back-compat alias preserved
});

test("device_integrity manual_review_recommendation uses scannerRiskPolicy wording", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "risk_detected",
    platform: "macos",
    scanner_state: "risk_detected",
    capture_excluded_window_count_max: 1,
    proofs_verified: 2,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(
    r.device_integrity.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("device_integrity safe wording when no anomaly", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "macos",
    scanner_state: "healthy",
    proofs_verified: 5,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(
    r.device_integrity.manual_review_recommendation,
    "No device-integrity anomaly detected."
  );
});

test("device_integrity daemon_platform defaults to unknown when daemon missing", () => {
  const s = baseSession();
  s.sessionData.daemon = null;
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(r.device_integrity.daemon_platform, "unknown");
});

test("device_integrity emits same top-level key set for macOS and Windows", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "macos",
    scanner_state: "healthy",
    proofs_verified: 3,
  };
  const macKeys = Object.keys(
    buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid).device_integrity
  ).sort();

  s.sessionData.daemon.platform = "windows";
  const winKeys = Object.keys(
    buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid).device_integrity
  ).sort();

  assert.deepEqual(macKeys, winKeys);
});
```

- [ ] **Step 2: Run test, verify it fails on at least the `daemon_platform` assertion**

```bash
node --test tests/unit/reportBuilderDeviceShield.test.js
```

Expected: FAIL on `daemon_platform`.

- [ ] **Step 3: Edit `src/academic/reportBuilder.js`**

Add import at top:

```js
import { getManualReviewReason } from "../device/scannerRiskPolicy.js";
```

Replace `buildDeviceIntegritySection` (lines 66-99) with:

```js
function buildDeviceIntegritySection(daemon) {
  const state = daemon ?? {};
  const anomaly =
    state.daemon_state === "untrusted" ||
    state.daemon_state === "risk_detected" ||
    state.scanner_state === "scanner_unavailable" ||
    state.scanner_state === "permission_denied" ||
    state.scanner_state === "scan_error" ||
    (state.proofs_rejected ?? 0) > 0 ||
    (state.capture_excluded_window_count_max ?? 0) > 0 ||
    (state.capture_restricted_window_count_max ?? 0) > 0 ||
    (state.monitor_only_window_count_max ?? 0) > 0;
  const platform = state.platform ?? "unknown";
  return {
    daemon_required: state.daemon_required ?? true,
    daemon_final_state: state.daemon_state ?? "missing",
    daemon_platform: platform,
    platform, // back-compat alias; remove in Stage 2.8 or later
    node_id_hash: state.node_id_hash ?? null,
    daemon_version: state.daemon_version ?? null,
    scanner_final_state: state.scanner_state ?? "unknown",
    scanner_version: state.scanner_version ?? null,
    proofs_verified: state.proofs_verified ?? 0,
    scanner_scans_verified: state.scanner_scans_verified ?? 0,
    proofs_rejected: state.proofs_rejected ?? 0,
    stale_periods: state.stale_periods ?? 0,
    capture_excluded_window_count_max: state.capture_excluded_window_count_max ?? 0,
    capture_restricted_window_count_max: state.capture_restricted_window_count_max ?? 0,
    monitor_only_window_count_max: state.monitor_only_window_count_max ?? 0,
    scanner_error_count: state.scanner_error_count ?? 0,
    permission_denied_count: state.permission_denied_count ?? 0,
    manual_review_recommendation: getManualReviewReason(anomaly ? "Warning" : "Safe", {
      context: "device_integrity",
    }),
  };
}
```

- [ ] **Step 4: Run the new test and existing report-builder tests**

```bash
node --test tests/unit/reportBuilderDeviceShield.test.js tests/unit/reportBuilder.test.js tests/unit/reportBuilderScanner.test.js
```

Expected: all PASS. If `reportBuilder.test.js` or `reportBuilderScanner.test.js` snapshots the old key set strictly, update those assertions to include `daemon_platform`.

- [ ] **Step 5: Run full unit suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 6: Commit**

```bash
npm run format
git add src/academic/reportBuilder.js tests/unit/reportBuilderDeviceShield.test.js tests/unit/reportBuilder.test.js tests/unit/reportBuilderScanner.test.js
git commit -m "$(cat <<'EOF'
refactor(report): device_integrity adds daemon_platform + delegates wording (Stage 2.7)

- Adds device_integrity.daemon_platform as the canonical platform key.
- Keeps device_integrity.platform as a back-compat alias (planned removal: Stage 2.8+).
- manual_review_recommendation now sourced from scannerRiskPolicy.getManualReviewReason.
- Same top-level key set emitted for macOS and Windows sessions.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Browser SDK `getDeviceShieldStatus()` UX accessor

**Files:**

- Modify: `public/sdk/simurgh-browser-sdk.js`
- Modify: `tests/unit/browserSdk.test.js` (add new tests for the accessor)

The accessor exposes platform/scanner state from the last observed daemon `/status` payload **for UX only**. The SDK doc-comment must state explicitly that the server trusts only signed `daemon_proof` — never the SDK's reported platform.

- [ ] **Step 1: Read existing SDK to find where `/status` is consumed**

```bash
grep -n "status\|daemonState\|reachable" public/sdk/simurgh-browser-sdk.js
```

Identify the function that fetches `/status` from the daemon (likely named `discoverDaemon` or `refreshStatus`). Note the state-update pattern (`setState({...})`).

- [ ] **Step 2: Write failing tests in `tests/unit/browserSdk.test.js`**

Append:

```js
test("getDeviceShieldStatus returns UX-only status with platform and scanner state", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/status")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          state: "paired",
          platform: "windows",
          scanner_state: "healthy",
          scanner_version: "2.6.0",
          privacy_mode: "metadata_only",
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const client = createSimurghClient({ fetchImpl, serverBaseUrl: "http://srv" });
  await client.discoverDaemon();
  const status = client.getDeviceShieldStatus();
  assert.equal(status.available, true);
  assert.equal(status.platform, "windows");
  assert.equal(status.scanner_state, "healthy");
  assert.equal(status.privacy_mode, "metadata_only");
});

test("getDeviceShieldStatus reports available=false when daemon unreachable", () => {
  const fetchImpl = async () => {
    throw new Error("ECONNREFUSED");
  };
  const client = createSimurghClient({ fetchImpl, serverBaseUrl: "http://srv" });
  const status = client.getDeviceShieldStatus();
  assert.equal(status.available, false);
  assert.equal(status.platform, "unknown");
});
```

Note: the exact `discoverDaemon` name may differ; adapt based on Step 1 grep. If the SDK uses a different method name to fetch `/status`, use that.

- [ ] **Step 3: Run, verify failure**

```bash
node --test tests/unit/browserSdk.test.js
```

Expected: FAIL — `getDeviceShieldStatus is not a function`.

- [ ] **Step 4: Implement in `public/sdk/simurgh-browser-sdk.js`**

In the state object, track `daemonPlatform`, `scannerState`, `scannerVersion`, `privacyMode`. When the daemon `/status` response is parsed, capture these fields into the state object. Then add the accessor function inside `createSimurghClient`:

```js
function getDeviceShieldStatus() {
  return {
    available: state.reachable === true,
    platform: state.daemonPlatform ?? "unknown",
    daemon_state: state.state,
    scanner_state: state.scannerState ?? "unknown",
    scanner_version: state.scannerVersion ?? null,
    privacy_mode: state.privacyMode ?? "metadata_only",
    // UX-only: this status is NOT consulted by the server. Server trust
    // requires a signed daemon_proof in /api/telemetry.
  };
}
```

Export it from the returned client object alongside `getState`, `discoverDaemon`, etc. Add a top-of-file comment block explaining the trust boundary.

- [ ] **Step 5: Run SDK tests**

```bash
node --test tests/unit/browserSdk.test.js
```

Expected: all PASS.

- [ ] **Step 6: Run full unit suite**

```bash
npm test
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
npm run format
git add public/sdk/simurgh-browser-sdk.js tests/unit/browserSdk.test.js
git commit -m "$(cat <<'EOF'
feat(sdk): add getDeviceShieldStatus UX accessor (Stage 2.7)

Exposes daemon platform/scanner state from the last /status response for
UI display. Top-of-file trust-boundary comment makes explicit: this status
is UX-only; the server trusts only signed daemon_proof in /api/telemetry.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Cross-platform E2E smoke (Scenarios A–G)

**Files:**

- Create: `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`
- Create: `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`

Model the bash script on `scripts/smoke-stage-2-6-windows-scanner.sh` (read at task start). Model the Node driver on `tests/e2e/stage26_windows_scanner_smoke.mjs`, but exercise both platforms and all seven scenarios.

- [ ] **Step 1: Create `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`**

Top-of-file imports and helpers (`assertSmoke`, `b64url`, `canonicalDaemonPayload`, `createIdentity`, `sign`, `pairEnvelope`, `expectJson`, `challenge`, `sendTelemetry`) — copy verbatim from `stage26_windows_scanner_smoke.mjs:1-150`.

Add `macosScannerFields(overrides)` returning the macOS fields (scanner_version `2.5.0`, no `monitor_only_window_count`/`capture_restricted_window_count` defaults beyond 0). Keep `windowsScannerFields` for Windows.

Driver structure:

```js
async function run() {
  const baseUrl = process.argv[2] || "http://127.0.0.1:33127";
  const instructorToken = process.env.SIMURGH_INSTRUCTOR_TOKEN || "demo-instructor";
  await scenarioA(baseUrl, instructorToken);
  await scenarioB(baseUrl, instructorToken);
  await scenarioC(baseUrl, instructorToken);
  await scenarioD(baseUrl, instructorToken);
  await scenarioE(baseUrl, instructorToken);
  await scenarioF(baseUrl, instructorToken);
  await scenarioG(baseUrl, instructorToken);
  console.log("Stage 2.7 cross-platform Device Shield smoke: pass");
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

For each scenario, write a helper that: creates an exam via `/api/exams`, joins, gets a session token, requests pair + proof challenges, pairs the mock daemon with the appropriate `platform`, sends a telemetry POST with `daemon_proof` matching the scenario inputs, asserts the expected outcome on `/api/sessions/<id>/report`.

**Scenario A — macOS healthy:**

- `platform: "macos"`, `scanner_version: "2.5.0"`, `capture_excluded_window_count: 0`.
- Expect: 200 OK telemetry; report `device_integrity.daemon_platform === "macos"`; `final_risk_level` not "Critical".

**Scenario B — Windows healthy:**

- `platform: "windows"`, `scanner_version: "2.6.0"`, all counters 0.
- Expect: 200 OK; report `daemon_platform === "windows"`; risk not "Critical".

**Scenario C — macOS capture-excluded:**

- `platform: "macos"`, `capture_excluded_window_count: 1`, `scanner_state: "risk_detected"`, `suspicious_window_count: 1`.
- Expect: report `final_risk_level === "Critical"`; `device_integrity.manual_review_recommendation === "Manual review recommended. No automatic misconduct finding."`; audit verifies.

**Scenario D — Windows monitor-only:**

- `platform: "windows"`, `monitor_only_window_count: 1`, `capture_restricted_window_count: 1`, `suspicious_window_count: 1`.
- Expect: `final_risk_level === "Warning"`; manual-review wording present; no "automatic misconduct"/"cheating detected" strings in report JSON.

**Scenario E — Windows capture-excluded:**

- `platform: "windows"`, `capture_excluded_window_count: 1`, `scanner_state: "risk_detected"`.
- Expect: `final_risk_level === "Critical"`.

**Scenario F — Unsupported platform linux:**

- Pair a daemon with `platform: "linux"`. The pairing endpoint should reject with `unsupported_platform`.
- Expect: 4xx response on `/api/device/pair`; assert response body `reason === "unsupported_platform"`.

**Scenario G — Raw forbidden field in proof:**

- Send a valid Windows proof, but inject `proof.debug = { hwnd: "0x123", pid: 4321, window_title: "Answers", process_name: "hidden.exe" }` BEFORE signing.
- Expect: telemetry endpoint returns 4xx with `reason === "forbidden_local_field"`. Then fetch the report and the audit chain JSON; grep their stringified output to ensure none of the raw values (`"0x123"`, `"4321"`, `"Answers"`, `"hidden.exe"`) appear.

Each scenario must `assertSmoke` its expectations and tag with the scenario letter in error messages.

- [ ] **Step 2: Create the bash smoke script**

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

PORT="${SIMURGH_STAGE27_PORT:-33127}"
LOG_DIR="${SIMURGH_SMOKE_LOG_DIR:-.simurgh_check_logs/stage27-cross-platform}"
LOG_FILE="$LOG_DIR/server.log"
PID=""
mkdir -p "$LOG_DIR"
: > "$LOG_FILE"

cleanup() {
  if [[ -n "$PID" ]]; then
    kill "$PID" >/dev/null 2>&1 || true
    wait "$PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

wait_for_health() {
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
    if curl -s -m 1 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then return 0; fi
    sleep 0.5
  done
  echo "Stage 2.7 smoke failed: server did not become healthy" >&2
  tail -40 "$LOG_FILE" >&2 || true
  return 1
}

echo "Stage 2.7 cross-platform Device Shield smoke"
node --check tests/e2e/stage27_cross_platform_device_shield_smoke.mjs
SIMURGH_DEMO_MODE=1 PORT="$PORT" node server.js > "$LOG_FILE" 2>&1 &
PID=$!
wait_for_health
node tests/e2e/stage27_cross_platform_device_shield_smoke.mjs "http://127.0.0.1:$PORT"
node tools/privacy-audit.mjs
echo "Stage 2.7 cross-platform Device Shield smoke: pass"
```

Mark executable:

```bash
chmod +x scripts/smoke-stage-2-7-cross-platform-device-shield.sh
```

- [ ] **Step 3: Run the smoke locally**

```bash
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh
```

Expected: all seven scenarios pass; final "pass" line printed. If Scenario F or G fail, the cross-platform refactor likely regressed — investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-stage-2-7-cross-platform-device-shield.sh tests/e2e/stage27_cross_platform_device_shield_smoke.mjs
git commit -m "$(cat <<'EOF'
test(stage-2-7): cross-platform Device Shield E2E smoke (Scenarios A-G)

Exercises macOS healthy, Windows healthy, macOS capture-excluded Critical,
Windows monitor-only Warning, Windows capture-excluded Critical, Linux
unsupported-platform rejection, and raw-field rejection across both
platforms. Confirms no raw values leak into report or audit chain.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Cross-platform security audit

**Files:**

- Create: `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`
- Create: `tests/security/stage27_cross_platform_security_audit.test.js`

Model the bash script on `scripts/security-audit-stage-2-4-2-5.sh` and the test on `tests/security/stage24_25_security_audit.test.js`.

- [ ] **Step 1: Create `tests/security/stage27_cross_platform_security_audit.test.js`**

Tests (each using `validateDaemonProof` directly, no server boot):

```js
import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

import {
  validateDaemonProof,
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeProof(platform, overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const scanner_version = platform === "windows" ? "2.6.0" : "2.5.0";
  const daemon_version = platform === "windows" ? "0.4.11" : "0.4.7";
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_audit",
    exam_id: "exam_audit",
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash,
    daemon_version,
    platform,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "healthy",
    scanner_version,
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
      key: privateKey,
      dsaEncoding: "der",
    })
  );
  return { proof: { ...proof, signature }, public_key, node_id_hash };
}

test("audit: tampered platform macos→windows after signing is rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.platform = "windows"; // post-signature tamper
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_signature");
});

test("audit: tampered scanner_version rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.scanner_version = "9.9.9";
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  // could be invalid_scanner_version (caught before signature) or invalid_signature
  assert.ok(["invalid_scanner_version", "invalid_signature"].includes(r.reason));
});

test("audit: tampered monitor_only_window_count rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.monitor_only_window_count = 5;
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_signature");
});

test("audit: tampered capture_excluded_window_count rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.capture_excluded_window_count = 1;
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_signature");
});

test("audit: unsupported platform linux rejected before signature check", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.platform = "linux";
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("audit: raw hwnd nested in scanner sub-object rejected as forbidden_local_field", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.scanner_debug = { hwnd: "0x123" };
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: raw process_name nested in debug sub-object rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.debug = { extra: { process_name: "hidden" } };
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
    pairedNode: { node_id_hash, public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: dashboard HTML contains no forbidden misconduct phrases", () => {
  // Static-string check on the dashboard template.
  const html = readDashboardHtml();
  for (const phrase of [
    "cheating detected",
    "student guilty",
    "automatic misconduct",
    "confirmed misconduct",
  ]) {
    assert.ok(
      !html.toLowerCase().includes(phrase),
      `dashboard contains forbidden phrase: ${phrase}`
    );
  }
});

function readDashboardHtml() {
  // eslint-disable-next-line no-undef
  const { readFileSync } = require("node:fs");
  return readFileSync("public/instructor.html", "utf8");
}
```

Note on the last test: replace the `require` with an ESM import (`import { readFileSync } from "node:fs";`) at the top of the file. The example uses `require` only for readability of the inline function.

- [ ] **Step 2: Run the audit test, verify it passes (most assertions should pass with current code)**

```bash
node --test tests/security/stage27_cross_platform_security_audit.test.js
```

Expected: all PASS. If any fail, the refactor regressed a negative-test surface — fix before continuing.

- [ ] **Step 3: Create the audit shell script**

```bash
#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "Stage 2.7 cross-platform security audit"
node --test tests/security/stage27_cross_platform_security_audit.test.js
node tools/privacy-audit.mjs
npm audit --audit-level=high
echo "Stage 2.7 cross-platform security audit: pass"
```

Mark executable:

```bash
chmod +x scripts/security-audit-stage-2-7-cross-platform-device-shield.sh
```

- [ ] **Step 4: Run the full audit script**

```bash
bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/security-audit-stage-2-7-cross-platform-device-shield.sh tests/security/stage27_cross_platform_security_audit.test.js
git commit -m "$(cat <<'EOF'
test(stage-2-7): cross-platform security audit gate

Locks the unified negative-test surface: tampered platform/scanner fields,
unsupported linux platform, raw-field rejection across nested objects,
dashboard misconduct-phrase ban.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Wire Stage 2.7 gates into `scripts/check.sh`

**Files:**

- Modify: `scripts/check.sh`

- [ ] **Step 1: Find the Stage 2.6 invocation block in check.sh**

```bash
grep -n "stage-2-6" scripts/check.sh
```

- [ ] **Step 2: Append Stage 2.7 invocations**

Immediately after the Stage 2.6 smoke invocation, add:

```bash
run_step "Stage 2.7 cross-platform Device Shield smoke" "bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh"
run_step "Stage 2.7 cross-platform security audit" "bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh"
```

Use whatever `run_step` (or equivalent) helper the script already defines for prior smokes; match the existing pattern exactly. If `check.sh` uses inline `bash scripts/...` calls without a helper, append two such lines.

- [ ] **Step 3: Run the full check**

```bash
bash scripts/check.sh
```

Expected: passes; new gate count is 44 + 2 = 46, or higher if check.sh already enumerates more (~50/50). Don't fixate on a specific number — verify "all PASSED" at the end.

- [ ] **Step 4: Commit**

```bash
git add scripts/check.sh
git commit -m "$(cat <<'EOF'
ci(stage-2-7): wire cross-platform smoke + audit into check.sh

scripts/check.sh now runs the Stage 2.7 cross-platform smoke and audit as
gating checks alongside the existing Stage 2.2/2.3, 2.4/2.5, and 2.6 gates.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Documentation updates (README, SECURITY, PRIVACY, ROADMAP, AGENT, CHANGELOG, brief footnotes)

**Files:**

- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `PRIVACY.md`
- Modify: `ROADMAP.md`
- Modify: `AGENT.md`
- Modify: `CHANGELOG.md`
- Modify: `docs/STAGE_2_5_TECHNICAL_BRIEF.md`
- Modify: `docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`

- [ ] **Step 1: README.md — add Stage 2.7 status section**

In `README.md`, locate the Stage 2.6 section (search for `Stage 2.6 complete`). Immediately after it, add a Stage 2.7 paragraph in the same style:

````markdown
### Stage 2.7 Cross-Platform Device Shield Unification (merged — v0.4.13)

Stage 2.7 unifies the macOS and Windows Device Shield implementations under one
documented cross-platform contract. Three shared modules — `forbiddenLocalFields`,
`platformScannerSchema`, and `scannerRiskPolicy` — replace previously scattered
logic in `daemonProof.js`, `daemonState.js`, `riskScoring.js`, `reportBuilder.js`,
and `tools/privacy-audit.mjs`. The browser SDK gains a UX-only
`getDeviceShieldStatus()`; server trust still comes only from signed
`daemon_proof`. A new cross-platform E2E smoke (Scenarios A–G) and security
audit gate cover both platforms. Linux daemon proofs are rejected with
`unsupported_platform` until Stage 2.8. Design doc:
[`docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md).

Stage 2.7 closeout can be run independently:

```bash
./scripts/smoke-stage-2-7-cross-platform-device-shield.sh
./scripts/security-audit-stage-2-7-cross-platform-device-shield.sh
```
````

````

Also update the top status badge text and the "external technical review" baseline list to include "Stage 2.7 cross-platform Device Shield unification". Update the `Stage 2.5 complete` mention to add Stage 2.7 alongside.

In the strategic roadmap, mark Stage 2.7 done; add Stage 2.8 Linux research as next.

- [ ] **Step 2: SECURITY.md — unified threat-model table**

Update the cross-platform threat-model table to mark Windows `SetWindowDisplayAffinity` overlays as ✅ (currently "Planned" per README §8). Add a row noting unsupported Linux daemon proofs are rejected with `unsupported_platform`.

- [ ] **Step 3: PRIVACY.md — point to shared forbidden-field module**

Find the section that enumerates forbidden fields. Replace any inline list with a reference: "The canonical forbidden-field list lives at `src/device/forbiddenLocalFields.js` and is enforced recursively by the daemon proof validator, the privacy audit CLI, and the Stage 2.7 security audit gate."

- [ ] **Step 4: ROADMAP.md — mark Stage 2.7 done, add Stage 2.8 next**

Locate the roadmap; check the Stage 2.7 box (or add it as done); add an unchecked Stage 2.8 entry: `[ ] Stage 2.8: Linux Display Integrity Research (X11 enumeration; Wayland compositor/security-model investigation).`. Ensure prior Windows scanner entry is marked `[x]` if not already.

- [ ] **Step 5: AGENT.md — Raouf-prefixed Stage 2.7 entry**

Open `AGENT.md`. Find the Stage 2.6 entry block to match style. Append a new entry:

```markdown
## Raouf — Stage 2.7 Cross-Platform Device Shield Unification (v0.4.13)

**Date:** 2026-05-17

**What shipped:**
- Shared modules: `src/device/forbiddenLocalFields.js`, `src/device/platformScannerSchema.js`, `src/device/scannerRiskPolicy.js`.
- Refactored consumers: `daemonProof.js`, `daemonState.js`, `riskScoring.js`, `reportBuilder.js`, `tools/privacy-audit.mjs` — pure delegation, no behaviour change.
- Browser SDK: `getDeviceShieldStatus()` UX accessor with explicit trust-boundary comment (server trusts only signed `daemon_proof`).
- Cross-platform E2E smoke + security audit gates wired into `scripts/check.sh`.
- Docs: Device Shield contract, platform matrix, proof + scanner JSON schemas, Stage 2.7 doc, reviewer checklist.

**Validated on:**
- All existing smoke gates (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 windows) green.
- Stage 2.7 cross-platform smoke and security audit green.
- `npm test`, `npm audit --audit-level=high`, `node tools/privacy-audit.mjs`, `scripts/check.sh` all green.
- Linux daemon proofs rejected with `unsupported_platform` until Stage 2.8.

**Non-claims preserved:** research prototype only; no production deployment claim; no MDM/Intune; no hardware attestation; no kernel visibility; no automatic misconduct detection; metadata-only.
````

- [ ] **Step 6: CHANGELOG.md — Raouf-prefixed v0.4.13 entry**

Match the existing changelog style. Add:

```markdown
## v0.4.13 — 2026-05-17 — Stage 2.7 Cross-Platform Device Shield Unification (Raouf)

### Added

- `src/device/forbiddenLocalFields.js` — shared forbidden raw-field list + recursive deep-check helper.
- `src/device/platformScannerSchema.js` — shared platform list, scanner enum, scanner validator.
- `src/device/scannerRiskPolicy.js` — shared risk mapping + manual-review wording.
- `public/sdk/simurgh-browser-sdk.js#getDeviceShieldStatus` — UX-only platform/scanner status accessor.
- `docs/DEVICE_SHIELD_CONTRACT.md`, `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`, `docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`, `docs/STAGE_2_7_REVIEWER_CHECKLIST.md`.
- `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json`.
- `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`, `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`.
- `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`, `tests/security/stage27_cross_platform_security_audit.test.js`.
- `tests/unit/{forbiddenLocalFields,platformScannerSchema,scannerRiskPolicy,reportBuilderDeviceShield}.test.js`.

### Changed

- `src/device/daemonProof.js`, `src/device/daemonState.js`, `src/academic/riskScoring.js`, `src/academic/reportBuilder.js`, `tools/privacy-audit.mjs` — refactored to consume the shared modules.
- `src/device/daemonState.js` `baseRecord.platform` default: `"macos"` → `"unknown"`.
- `device_integrity` report section gains `daemon_platform`; legacy `platform` retained as back-compat alias.

### Verified

- All existing smoke gates and Stage 2.7 cross-platform smoke + audit green.
- `npm test`, `npm audit`, `tools/privacy-audit.mjs`, `scripts/check.sh` green.
- Linux daemon proofs rejected with `unsupported_platform`.

### Non-claims (unchanged)

- Research prototype only; no production deployment claim; no MDM/Intune readiness; no hardware attestation; no kernel-level visibility; no automatic misconduct detection.
```

- [ ] **Step 7: Historical doc footnotes**

In `docs/STAGE_2_5_TECHNICAL_BRIEF.md`, add a top-of-file note:

```markdown
> **Scope:** This brief documents Stage 1 through Stage 2.5 (macOS-only Device Shield). Windows display-affinity scanning landed in Stage 2.6 (`v0.4.12`). The cross-platform unification contract is documented in [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) and [`DEVICE_SHIELD_CONTRACT.md`](DEVICE_SHIELD_CONTRACT.md).
```

In `docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`, add at the end of the document:

```markdown
## Stage 2.7 unification

The Stage 2.6 Windows scanner now operates under the unified Stage 2.7 Device Shield contract — see [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) and [`DEVICE_SHIELD_CONTRACT.md`](DEVICE_SHIELD_CONTRACT.md). The Windows native daemon code is unchanged.
```

- [ ] **Step 8: Format and commit**

```bash
npm run format
git add README.md SECURITY.md PRIVACY.md ROADMAP.md AGENT.md CHANGELOG.md docs/STAGE_2_5_TECHNICAL_BRIEF.md docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md
git commit -m "$(cat <<'EOF'
docs(stage-2-7): update README, SECURITY, PRIVACY, ROADMAP, AGENT, CHANGELOG

- README: Stage 2.7 status block + roadmap checkbox + status badge line.
- SECURITY: Windows display-affinity now ✅; unsupported_platform row for Linux.
- PRIVACY: points to shared forbiddenLocalFields module.
- ROADMAP: Stage 2.7 done; Stage 2.8 Linux research listed next.
- AGENT: Raouf-prefixed Stage 2.7 entry.
- CHANGELOG: v0.4.13 entry covering shared modules, refactors, smoke + audit.
- Stage 2.5 brief: historical-scope footnote.
- Stage 2.6 doc: Stage 2.7 unification cross-reference.

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Final verification, PR, and release tag

**Files:**

- None modified; verification + release ceremony.

- [ ] **Step 1: Run the full verification matrix**

```bash
git diff --check
npm test
npm audit --audit-level=high
node tools/privacy-audit.mjs
bash scripts/smoke-stage-2-2-2-3.sh
bash scripts/smoke-stage-2-4-2-5.sh
bash scripts/security-audit-stage-2-4-2-5.sh
bash scripts/smoke-stage-2-6-windows-scanner.sh
bash scripts/smoke-stage-2-7-cross-platform-device-shield.sh
bash scripts/security-audit-stage-2-7-cross-platform-device-shield.sh
bash scripts/check.sh
```

Expected: every command exits 0. **If any fails, STOP and report — do not tag a release on a red gate.**

Optional native daemon builds (require platform tooling):

```bash
cd tools/simurgh-daemon-macos && swift test && swift build && cd ../..
dotnet test tools/simurgh-daemon-windows/SimurghDaemon.Windows.sln
```

- [ ] **Step 2: Push branch and open PR**

```bash
git push origin stage-2-7-cross-platform-device-shield
gh pr create --title "Stage 2.7: Cross-platform Device Shield unification" --body "$(cat <<'EOF'
## Summary
- Unifies macOS and Windows Device Shield surfaces under one documented contract.
- Extracts three shared modules: `forbiddenLocalFields`, `platformScannerSchema`, `scannerRiskPolicy`.
- Refactors `daemonProof`, `daemonState`, `riskScoring`, `reportBuilder`, `tools/privacy-audit` to consume them — no behaviour change.
- Adds browser SDK `getDeviceShieldStatus()` UX accessor (server trust still requires signed `daemon_proof`).
- Adds cross-platform E2E smoke (Scenarios A–G) and a Stage 2.7 security audit gate.
- Linux daemon proofs rejected with `unsupported_platform` until Stage 2.8.

Spec: `docs/superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md`.
Plan: `docs/superpowers/plans/2026-05-17-stage-2-7-cross-platform-device-shield.md`.

## Test plan
- [x] All existing smoke gates green (Stage 2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 windows).
- [x] Stage 2.7 cross-platform smoke green (Scenarios A–G).
- [x] Stage 2.7 security audit green.
- [x] `npm test`, `npm audit`, `node tools/privacy-audit.mjs`, `scripts/check.sh` all green.
- [x] No raw field leaks into audit chain or report (Scenario G).
- [x] Manual-review wording preserved; no automatic-misconduct phrases.

## Non-claims (unchanged)
Research prototype only. No production deployment, MDM/Intune, hardware attestation, kernel-level visibility, or automatic misconduct detection.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI green; merge via PR UI when approved**

Do not auto-merge. Wait for human approval.

- [ ] **Step 4: After merge, tag the release on `main`**

```bash
git checkout main
git pull origin main
git tag -a v0.4.13-stage-2-7-cross-platform-device-shield -m "Stage 2.7: Cross-Platform Device Shield Unification"
git push origin v0.4.13-stage-2-7-cross-platform-device-shield
```

- [ ] **Step 5: Create the GitHub release**

```bash
gh release create v0.4.13-stage-2-7-cross-platform-device-shield --title "Stage 2.7: Cross-Platform Device Shield Unification" --notes "$(cat <<'EOF'
Stage 2.7 unifies the macOS and Windows Device Shield implementations under one documented cross-platform proof, scanner, risk, report, dashboard, privacy, and audit contract.

Highlights:
- Shared modules: forbiddenLocalFields, platformScannerSchema, scannerRiskPolicy.
- Refactored daemonProof/daemonState/riskScoring/reportBuilder/privacy-audit to consume them.
- Browser SDK getDeviceShieldStatus() UX accessor (server trust unchanged: signed daemon_proof only).
- Cross-platform E2E smoke (Scenarios A–G) and Stage 2.7 security audit gate.
- Linux daemon proofs rejected with unsupported_platform until Stage 2.8.

Research prototype only — see PRIVACY.md, ETHICS.md, DISCLAIMER.md for boundaries.
EOF
)"
```

- [ ] **Step 6: Final status**

Report to user: branch merged, tag pushed, release published. Done.

---

## Self-Review (run after writing the plan)

**1. Spec coverage check** — every spec section maps to a task:

| Spec § | Topic                                | Task(s)     |
| ------ | ------------------------------------ | ----------- |
| 2      | Reality check (current code surface) | 4, 7, 9     |
| 3      | Scope (in/out)                       | All tasks   |
| 4      | Architecture target                  | 3, 6, 8     |
| 5.1    | Daemon proof schema                  | 2 (schemas) |
| 5.2    | Scanner result schema                | 2 (schemas) |
| 6.1    | platformScannerSchema module         | 6, 7        |
| 6.2    | scannerRiskPolicy module             | 8, 9, 10    |
| 6.3    | forbiddenLocalFields module          | 3, 4, 5     |
| 7.1    | Report device_integrity shape        | 10          |
| 7.2    | Dashboard card + forbidden phrases   | 13 (audit)  |
| 8      | Smoke Scenarios A–G                  | 12          |
| 9      | Security audit                       | 13          |
| 10     | Documentation                        | 2, 15       |
| 11     | Implementation order                 | Task 1–16   |
| 12     | Acceptance criteria                  | Task 16     |
| 13     | Non-claims                           | 15 (AGENT)  |

All sections covered.

**2. Placeholder scan** — searched for "TBD", "TODO", "fill in", "similar to", "appropriate error", "edge cases". None present. Code blocks supplied for every code step. Commands have expected outcomes.

**3. Type consistency check:**

- `FORBIDDEN_LOCAL_FIELD_NAMES` named consistently across Tasks 3, 4, 5, 13.
- `containsForbiddenLocalFieldDeep` named consistently.
- `SUPPORTED_DEVICE_PLATFORMS` named consistently across Tasks 6, 7.
- `validateScannerSummary` named consistently across Tasks 6, 7.
- `mapScannerSummaryToRisk` named consistently across Tasks 8, 9.
- `getManualReviewReason` named consistently across Tasks 8, 10.
- `getDeviceShieldStatus` named consistently across Task 11 and spec.
- Report key `daemon_platform` named consistently across Task 10 (test + impl) and Task 15 (CHANGELOG).

No mismatches found.

---

## Execution Notes for the Implementer

- Tasks 4, 5, 7, 9, 10 are **pure refactors with TDD already in place** (the failing test is the existing test suite — it must stay green). If a refactor breaks an existing test in a way that isn't obviously a naming/shape change, **STOP and surface it** — that's an unexpected behaviour drift.
- Task 2 (docs scaffolding) and Task 15 (doc updates) can be reordered if you prefer to leave doc writing until last. The plan keeps Task 2 first so the contract is visible to readers of the schemas while the code is being extracted.
- Smoke and audit scripts use bash; on Windows-only dev machines without Git Bash, run via `bash scripts/...` (Git for Windows ships bash).
- The `chmod +x` step on the bash scripts may be a no-op on Windows but is recorded in `.gitattributes` if the repo tracks executable bit; check `git ls-files --stage` after adding to verify mode `100755`.
