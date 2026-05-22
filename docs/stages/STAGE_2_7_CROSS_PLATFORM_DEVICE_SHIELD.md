# Stage 2.7 — Cross-Platform Device Shield Unification

**Release target:** `v0.4.13-stage-2-7-cross-platform-device-shield`
**Branch:** `stage-2-7-cross-platform-device-shield`
**Baseline:** `v0.4.12-stage-2-6-windows-display-affinity-scanner`
**Status:** research prototype

Stage 2.7 unifies the macOS (Stage 2.1–2.5) and Windows (Stage 2.6) Device Shield implementations under one documented cross-platform contract — covering proof envelope, scanner schema, risk mapping, report and dashboard wording, privacy blocklist, and audit gate — before Linux research begins in Stage 2.8.

After Stage 2.7, reviewers see one Device Shield surface with two platform adapters, not two parallel implementations.

## Goal

Codify the existing cross-platform behaviour of `src/device/daemonProof.js` as a documented contract, extract the shared invariants (forbidden-field list, scanner schema, risk policy) into reusable modules without changing behaviour, and gate every supported platform behind the same smoke + audit run.

## Scope

In scope for Stage 2.7:

- Cross-platform contract docs: this file, `docs/DEVICE_SHIELD_CONTRACT.md`, `docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`, `docs/stages/STAGE_2_7_REVIEWER_CHECKLIST.md`.
- Canonical schemas: `docs/schemas/daemon-proof.schema.json`, `docs/schemas/device-scanner-result.schema.json`.
- Shared server modules (subsequent tasks): `src/device/platformScannerSchema.js`, `src/device/scannerRiskPolicy.js`, `src/device/forbiddenLocalFields.js`.
- Refactor consumers (subsequent tasks): `daemonProof.js`, `riskScoring.js`, `reportBuilder.js`, `daemonState.js`, `tools/privacy-audit.mjs`.
- Browser SDK: `getDeviceShieldStatus()` accessor, with explicit doc that the server trusts only signed `daemon_proof`.
- Cross-platform E2E smoke: `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` + `tests/e2e/stage27_cross_platform_device_shield_smoke.mjs`.
- Cross-platform security audit: `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` + `tests/security/stage27_cross_platform_security_audit.test.js`.
- Documentation updates: `README.md`, `SECURITY.md`, `PRIVACY.md`, `ROADMAP.md`, `AGENT.md`, `CHANGELOG.md`.

## Out of Scope

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

## Architecture

```text
Cross-Platform Device Shield Contract
  ├─ shared proof schema             (docs/schemas/daemon-proof.schema.json)
  ├─ shared scanner schema           (docs/schemas/device-scanner-result.schema.json)
  ├─ shared daemon state vocabulary  (src/device/daemonState.js, normalised)
  ├─ shared privacy blocklist        (src/device/forbiddenLocalFields.js, added in Task 3)
  ├─ shared risk mapping             (src/device/scannerRiskPolicy.js, added in Task 4)
  ├─ shared report/dashboard model   (src/academic/reportBuilder.js → device_integrity)
  ├─ shared smoke-test matrix        (Scenarios A–G)
  └─ platform-specific scanner adapters
        ├─ macOS CoreGraphics adapter   (tools/simurgh-daemon-macos/, unchanged)
        └─ Windows Win32 adapter        (tools/simurgh-daemon-windows/, unchanged)
```

The native daemons are not modified by Stage 2.7. Their proof outputs already conform; this stage codifies the contract they conform to and extracts the shared server-side validator invariants into dedicated modules.

## Acceptance Criteria

Stage 2.7 is done when **all** of these hold:

- macOS and Windows operate under one documented Device Shield contract.
- Scanner result schema documented at `docs/schemas/device-scanner-result.schema.json`.
- Daemon proof schema documented at `docs/schemas/daemon-proof.schema.json`.
- `platformScannerSchema.js`, `scannerRiskPolicy.js`, `forbiddenLocalFields.js` exist and are consumed everywhere relevant.
- macOS proof path still passes (Stage 2.2/2.3, 2.4/2.5 smokes green).
- Windows proof path still passes (Stage 2.6 smoke green).
- Unsupported Linux proof rejected with `unsupported_platform`.
- Browser SDK exposes platform/state safely; the server trusts only signed `daemon_proof`.
- Reports use one `device_integrity` shape across platforms.
- Dashboard shows platform + scanner state consistently.
- Tampered platform/scanner fields rejected.
- Replayed proofs rejected.
- Raw local fields rejected recursively as `forbidden_local_field`.
- Stage 2.7 cross-platform smoke passes.
- Stage 2.7 cross-platform security audit passes.
- All earlier smokes (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 windows) still pass.
- `npm test`, `npm audit --audit-level=high`, `node tools/privacy-audit.mjs`, `scripts/check.sh` all green.
- AGENT.md and CHANGELOG.md updated with Raouf-prefixed Stage 2.7 entry.
- GitHub Actions green.
- Release tag `v0.4.13-stage-2-7-cross-platform-device-shield` created after merge.

The full reviewer-facing checklist lives in [`STAGE_2_7_REVIEWER_CHECKLIST.md`](STAGE_2_7_REVIEWER_CHECKLIST.md).

## Non-Claims

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

Preserved wording: _"Research prototype only. Manual review recommended. No automatic misconduct finding."_

## Cross-Links

- Contract: [`docs/DEVICE_SHIELD_CONTRACT.md`](DEVICE_SHIELD_CONTRACT.md)
- Platform matrix: [`docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`](DEVICE_SHIELD_PLATFORM_MATRIX.md)
- Reviewer checklist: [`docs/stages/STAGE_2_7_REVIEWER_CHECKLIST.md`](STAGE_2_7_REVIEWER_CHECKLIST.md)
- Daemon proof schema: [`docs/schemas/daemon-proof.schema.json`](schemas/daemon-proof.schema.json)
- Scanner result schema: [`docs/schemas/device-scanner-result.schema.json`](schemas/device-scanner-result.schema.json)
- Design spec: [`docs/superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md`](superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md)
- Predecessors: [`docs/stages/STAGE_2_3_MACOS_LOCALHOST_DAEMON.md`](STAGE_2_3_MACOS_LOCALHOST_DAEMON.md), [`docs/stages/STAGE_2_5_MACOS_AFFINITY_SCANNER.md`](STAGE_2_5_MACOS_AFFINITY_SCANNER.md), [`docs/stages/STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`](STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md)
