# Stage 2.7 — Cross-Platform Device Shield Unification

**Status:** Design approved (Raouf, 2026-05-17). Implementation plan pending via `writing-plans`.
**Baseline:** `v0.4.12-stage-2-6-windows-display-affinity-scanner` on `main`.
**Target release tag:** `v0.4.13-stage-2-7-cross-platform-device-shield`.
**Branch:** `stage-2-7-cross-platform-device-shield`.

---

## 1. Mission

> Stage 2.7 unifies the macOS and Windows Device Shield implementations under one documented cross-platform proof, scanner, risk, report, dashboard, privacy, and audit contract — before Linux research begins.

After 2.7, reviewers see one Device Shield surface with two platform adapters, not two parallel implementations held together by hope.

---

## 2. Reality Check Against Current Code

The Stage 2.6 baseline already does more cross-platform work than the blueprint suggests. Before designing new modules, the spec acknowledges what exists today (verified 2026-05-17 against `main`):

| Capability                                            | Current location                            | Stage 2.7 action                                                    |
| ----------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `SUPPORTED_DAEMON_PLATFORMS = { macos, windows }`     | `src/device/daemonProof.js:9`               | Move to shared module; treat as single source of truth.             |
| `FORBIDDEN_FIELDS` list + recursive `findForbiddenField` | `src/device/daemonProof.js:26-92`        | Extract to `src/device/forbiddenLocalFields.js`; reuse from privacy audit + tests. |
| Scanner field validation (per-platform expected version) | `src/device/daemonProof.js:109-199`     | Extract to `src/device/platformScannerSchema.js`; preserve all current invariants. |
| Risk escalation on `capture_excluded_window_count > 0` | `src/academic/riskScoring.js`              | Extract policy to `src/device/scannerRiskPolicy.js`. No behaviour change. |
| Report `device_integrity` shape                       | `src/academic/reportBuilder.js`             | Add `daemon_platform` + ensure both platforms emit identical key set. |
| Browser SDK platform awareness                        | `public/sdk/simurgh-browser-sdk.js`         | Add `getDeviceShieldStatus()` UX accessor; **server trust unchanged**. |

**Implication for risk:** Stage 2.7 is dominated by extract-and-document work rather than green-field logic. The negative tests (tamper, replay, unsupported-platform, raw-field) already pass today; the unification must not weaken them. Coverage gains come from cross-platform smoke + the unified security audit gate.

---

## 3. Scope

### In scope

- Shared modules: `src/device/{platformScannerSchema,scannerRiskPolicy,forbiddenLocalFields}.js`
- Refactor: `daemonProof.js`, `riskScoring.js`, `reportBuilder.js`, `daemonState.js`, `tools/privacy-audit.mjs` to consume the shared modules.
- Browser SDK: `getDeviceShieldStatus()` returning UX-only platform/scanner status; explicit doc that server trust comes only from signed `daemon_proof`.
- Instructor dashboard: unified Device Integrity card showing platform + scanner state with identical wording across macOS/Windows.
- Cross-platform smoke: `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` + `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`.
- Cross-platform security audit: `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` + `tests/security/stage27_cross_platform_security_audit.test.js`.
- Documentation: contract, platform matrix, schemas, reviewer checklist, stage doc, README/SECURITY/PRIVACY/ROADMAP/AGENT/CHANGELOG updates.
- CI: extend `scripts/check.sh` to include Stage 2.7 smoke + audit; expected ~50/50 gates.

### Out of scope

| Out of scope                   | Why                                     |
| ------------------------------ | --------------------------------------- |
| Linux scanner                  | Stage 2.8 or later                      |
| Windows Service deployment     | Production packaging stage              |
| macOS notarisation             | Production packaging stage              |
| MDM/Intune deployment          | Enterprise deployment stage             |
| Hardware attestation           | Future research stage                   |
| Kernel-level visibility        | Out of current research-prototype scope |
| GPU overlay detection          | Stage 4 research track                  |
| Automatic misconduct decisions | Never the current model                 |
| Raw process/window collection  | Violates privacy contract               |

Preserved wording: _"Research prototype only. Manual review recommended. No automatic misconduct finding."_

---

## 4. Architecture Target

```text
Cross-Platform Device Shield Contract
  ├─ shared proof schema             (docs/schemas/daemon-proof.schema.json)
  ├─ shared scanner schema           (docs/schemas/device-scanner-result.schema.json)
  ├─ shared daemon state vocabulary  (src/device/daemonState.js, normalised)
  ├─ shared privacy blocklist        (src/device/forbiddenLocalFields.js)
  ├─ shared risk mapping             (src/device/scannerRiskPolicy.js)
  ├─ shared report/dashboard model   (src/academic/reportBuilder.js → device_integrity)
  ├─ shared smoke-test matrix        (Scenarios A–G in §8)
  └─ platform-specific scanner adapters
        ├─ macOS CoreGraphics adapter   (tools/simurgh-daemon-macos/, unchanged)
        └─ Windows Win32 adapter        (tools/simurgh-daemon-windows/, unchanged)
```

The native daemons are **not modified** by Stage 2.7. Their proof outputs already conform; this stage codifies the contract that they conform to.

---

## 5. Canonical Schemas

### 5.1 Daemon proof (`docs/schemas/daemon-proof.schema.json`)

```json
{
  "type": "simurgh.daemon.proof",
  "session_id": "sess_...",
  "exam_id": "exam_...",
  "sequence": 1,
  "timestamp": "ISO-8601",
  "node_id_hash": "sha256:...",
  "daemon_version": "0.4.x",
  "platform": "macos|windows",
  "scanner_state": "healthy|risk_detected|restricted_detected|scanner_unavailable|permission_denied|scan_error|unsupported_macos_version",
  "scanner_version": "platform-specific (macOS: 2.5.0, Windows: 2.6.0 at baseline)",
  "capture_excluded_window_count": 0,
  "capture_restricted_window_count": 0,
  "monitor_only_window_count": 0,
  "helper_state": "healthy|missing|stale|risk_detected|unknown",
  "privacy_mode": "metadata_only",
  "challenge": "base64url(32 bytes)",
  "signature": "base64url"
}
```

**Invariant:** every trusted scanner field is inside the signed payload. The browser SDK may expose `/status`, but the server trusts only `daemon_proof`.

### 5.2 Scanner result (`docs/schemas/device-scanner-result.schema.json`)

```json
{
  "platform": "macos|windows",
  "scanner_state": "healthy|risk_detected|restricted_detected|scanner_unavailable|permission_denied|scan_error|unsupported_macos_version",
  "scanner_version": "2.x.x",
  "scan_timestamp": "ISO-8601",
  "scan_duration_ms": 0,
  "visible_window_count": 0,
  "suspicious_window_count": 0,
  "capture_excluded_window_count": 0,
  "capture_restricted_window_count": 0,
  "monitor_only_window_count": 0,
  "scan_error_count": 0,
  "privacy_mode": "metadata_only",
  "window_fingerprint_hashes": []
}
```

**Cross-platform rules:**
- macOS may emit `0` for Windows-leaning counters (`monitor_only_window_count`).
- Windows may emit `0` for macOS-leaning counters where they don't apply.
- All supported platforms produce the same top-level keys.
- `scanner_state` enum is shared; `unsupported_macos_version` is preserved historically — Windows never emits it.

---

## 6. Shared Server Modules

### 6.1 `src/device/platformScannerSchema.js`

```js
export const SUPPORTED_DEVICE_PLATFORMS = ["macos", "windows"];
export const PLANNED_DEVICE_PLATFORMS = ["linux"];

export function isSupportedPlatform(platform) { /* ... */ }
export function getPlatformScannerDefaults(platform) { /* ... */ }
export function normaliseScannerSummary(raw) { /* ... */ }
export function validateScannerSummary(raw) { /* ... */ }
```

All scanner-shape logic now in `daemonProof.js:validateScannerFields` is moved here. `daemonProof.js` imports and delegates. No reason codes change; same negative-test surface.

### 6.2 `src/device/scannerRiskPolicy.js`

Canonical mapping (preserves current behaviour):

| Signal                                | Result                                  |
| ------------------------------------- | --------------------------------------- |
| `capture_excluded_window_count > 0`   | Critical floor (manual review)          |
| `monitor_only_window_count > 0`       | Warning + manual review                 |
| `capture_restricted_window_count > 0` | Warning + manual review                 |
| `scanner_state = scanner_unavailable` | Warning if daemon required, else Info   |
| `scanner_state = permission_denied`   | Warning + manual review context         |
| `scanner_state = scan_error`          | Warning + manual review context         |
| Invalid proof                         | Reject (existing behaviour)             |
| Raw local field                       | Reject as `forbidden_local_field`       |

Exports `mapScannerSummaryToRisk()`, `getScannerRiskLevel()`, `getManualReviewReason()`. `riskScoring.js` and `reportBuilder.js` import from here.

### 6.3 `src/device/forbiddenLocalFields.js`

Single source of the forbidden-name list (currently in `daemonProof.js:26-56`). Exports:

```js
export const FORBIDDEN_LOCAL_FIELD_NAMES = [ /* ... existing list ... */ ];
export function containsForbiddenLocalFieldDeep(value);  // returns first matching key or null
```

Used by `daemonProof.js`, `tools/privacy-audit.mjs`, and new security tests. **The existing list is the union of all observed forbidden fields; Stage 2.7 does not remove any.**

---

## 7. Report & Dashboard

### 7.1 Report `device_integrity` shape

```json
{
  "device_integrity": {
    "daemon_platform": "macos|windows|unknown",
    "daemon_final_state": "healthy",
    "scanner_final_state": "healthy",
    "scanner_version": "2.x.x",
    "proofs_verified": 10,
    "proofs_rejected": 0,
    "visible_window_count_max": 12,
    "capture_excluded_window_count_max": 0,
    "capture_restricted_window_count_max": 0,
    "monitor_only_window_count_max": 0,
    "scanner_error_count": 0,
    "privacy_mode": "metadata_only",
    "manual_review_recommendation": "No device-integrity anomaly detected."
  }
}
```

On risk: `"Manual review recommended. No automatic misconduct finding."`

### 7.2 Dashboard Device Integrity card

```text
Device Integrity
Platform: macOS / Windows
Daemon: Healthy
Scanner: Healthy
Capture-excluded windows: 0
Capture-restricted windows: 0
Monitor-only windows: 0
Last proof: 4s ago
```

Risk display: `Scanner: Risk detected — Manual review recommended. No automatic misconduct finding.`

**Forbidden phrases (enforced by audit test):** `cheating detected`, `student guilty`, `automatic misconduct`, `confirmed misconduct`.

---

## 8. Cross-Platform Smoke (Scenarios A–G)

`scripts/smoke-stage-2-7-cross-platform-device-shield.sh` drives `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`. All scenarios use deterministic mock P-256 daemons (no real native daemons required in CI):

| Scenario | Platform | Inputs                                                        | Expected                                                         |
| -------- | -------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| A        | macos    | `capture_excluded_window_count = 0`                           | Accepted; `device_integrity.platform = macos`; risk unchanged    |
| B        | windows  | `capture_excluded_window_count = 0`, `monitor_only = 0`       | Accepted; `device_integrity.platform = windows`; risk unchanged  |
| C        | macos    | `capture_excluded_window_count = 1`                           | Critical/manual review; report + audit consistent                |
| D        | windows  | `monitor_only_window_count = 1`, `capture_restricted = 1`     | Warning/manual review; no automatic-misconduct wording           |
| E        | windows  | `capture_excluded_window_count = 1`                           | Critical/manual review; report/dashboard/audit consistent        |
| F        | linux    | (any)                                                         | Rejected as `unsupported_platform` until Stage 2.8               |
| G        | windows  | proof contains `debug.hwnd`, `debug.pid`, `debug.window_title`, `debug.process_name` | Rejected as `forbidden_local_field`; no raw value leaks to audit/report/dashboard |

---

## 9. Security Audit (Stage 2.7)

`scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` + `tests/security/stage27_cross_platform_security_audit.test.js`.

Required negative tests:

```text
tamper platform macos → windows after signing       → reject (invalid_signature)
tamper scanner_version                              → reject
tamper monitor_only_window_count                    → reject
tamper capture_excluded_window_count                → reject
unsupported platform linux                          → reject (unsupported_platform)
raw hwnd nested in scanner sub-object               → reject (forbidden_local_field)
raw process_name nested in debug sub-object         → reject (forbidden_local_field)
browser-supplied standalone scanner field           → ignored or rejected; never trusted
manual-review wording present, no misconduct claims → assert dashboard + report strings
```

Audit gate also re-runs: privacy audit, npm audit, raw-field rejection across SDK token/proof boundaries, daemon loopback/body/method guards, SDK-platform-state-not-treated-as-proof.

---

## 10. Documentation Plan

### Create

```text
docs/STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md
docs/DEVICE_SHIELD_CONTRACT.md
docs/DEVICE_SHIELD_PLATFORM_MATRIX.md
docs/STAGE_2_7_REVIEWER_CHECKLIST.md
docs/schemas/daemon-proof.schema.json
docs/schemas/device-scanner-result.schema.json
```

### Update

```text
README.md            (Stage 2.7 status block, roadmap checkbox)
SECURITY.md          (unified threat-model table covering macOS + Windows)
PRIVACY.md           (point to shared forbidden-field module)
ROADMAP.md           (move Windows scanner to done; add Stage 2.7 done; Stage 2.8 Linux research as next)
AGENT.md             (Raouf-prefixed Stage 2.7 entry)
CHANGELOG.md         (Raouf-prefixed v0.4.13 entry)
docs/STAGE_2_5_TECHNICAL_BRIEF.md  (add footnote: Stage 1–2.5 historical scope; superseded by Stage 2.6 for Windows)
docs/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md  (note Stage 2.7 unification)
```

Do not rewrite historical docs. Add scope footnotes where wording is now out of date.

---

## 11. Implementation Order

1. **Pre-flight:** confirm `main` is clean, all current smokes pass, baseline `v0.4.12` tag present.
2. **Branch:** `git checkout -b stage-2-7-cross-platform-device-shield`.
3. **Docs-first contracts:** write contract, platform matrix, stage doc, reviewer checklist, schema JSON files.
4. **Shared server modules:** add `platformScannerSchema.js`, `scannerRiskPolicy.js`, `forbiddenLocalFields.js`. Write unit tests **first** (TDD per the superpowers TDD skill).
5. **Refactor consumers:** `daemonProof.js`, `riskScoring.js`, `reportBuilder.js`, `daemonState.js`, `tools/privacy-audit.mjs`. Run full unit suite — no regressions.
6. **Browser SDK:** add `getDeviceShieldStatus()`; verify SDK platform state is **never** treated as proof by the server.
7. **Cross-platform E2E smoke:** write Scenarios A–G; add script.
8. **Security audit:** write the negative-test suite and gate script.
9. **Doc updates:** README/SECURITY/PRIVACY/ROADMAP/AGENT/CHANGELOG.
10. **CI gate:** extend `scripts/check.sh` to include Stage 2.7 smoke + audit.
11. **Verification:** full check.sh, all five smoke scripts, both daemon platform builds where available, privacy audit, npm audit.

---

## 12. Acceptance Criteria

Stage 2.7 is done when **all** of these hold:

- ✅ macOS and Windows operate under one documented Device Shield contract.
- ✅ Scanner result schema documented (`docs/schemas/device-scanner-result.schema.json`).
- ✅ Daemon proof schema documented (`docs/schemas/daemon-proof.schema.json`).
- ✅ `platformScannerSchema.js`, `scannerRiskPolicy.js`, `forbiddenLocalFields.js` exist and are consumed everywhere relevant.
- ✅ macOS proof path still passes (Stage 2.2/2.3, 2.4/2.5 smokes green).
- ✅ Windows proof path still passes (Stage 2.6 smoke green).
- ✅ Unsupported Linux proof rejected with `unsupported_platform`.
- ✅ Browser SDK exposes platform/state safely; server trusts only signed `daemon_proof`.
- ✅ Reports use one `device_integrity` shape across platforms.
- ✅ Dashboard shows platform + scanner state consistently.
- ✅ Tampered platform/scanner fields rejected.
- ✅ Replayed proofs rejected.
- ✅ Raw local fields rejected recursively as `forbidden_local_field`.
- ✅ Stage 2.7 cross-platform smoke passes.
- ✅ Stage 2.7 cross-platform security audit passes.
- ✅ All earlier smokes (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 windows) still pass.
- ✅ `npm test`, `npm audit --audit-level=high`, `node tools/privacy-audit.mjs`, `scripts/check.sh` all green.
- ✅ AGENT.md and CHANGELOG.md updated with Raouf-prefixed Stage 2.7 entry.
- ✅ GitHub Actions green.
- ✅ Release tag `v0.4.13-stage-2-7-cross-platform-device-shield` created after merge.

---

## 13. Non-Claims (Reaffirmed)

Stage 2.7 does **not** claim:

- Production deployment readiness.
- Windows Service or macOS notarised packaging.
- MDM/Intune readiness.
- Hardware attestation.
- Kernel-level visibility.
- GPU overlay coverage.
- Automatic misconduct detection.
- Linux parity.

It does **not** collect: screen pixels, webcam/microphone frames, typed content, paste content, raw process names, raw window titles, HWNDs, PIDs, usernames, serial numbers, MAC addresses, or personal identity data.

---

## 14. Stage 2.8 Preview

After Stage 2.7 ships:

```text
Stage 2.8: Linux Display Integrity Research
  - X11 enumeration feasibility
  - Wayland compositor/security-model investigation
  - No parity claim until both paths are real and signed
```

Linux remains research-grade until Stage 2.8 explicitly merges.
