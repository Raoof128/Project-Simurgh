# Stage 2 Windows Device Shield — Closeout Declaration

**Status:** Frozen as a validated research-prototype baseline
**Date:** 2026-05-17
**Tags:** `v0.4.12-stage-2-6-windows-display-affinity-scanner` · `v0.4.13-stage-2-7-cross-platform-device-shield` · `v0.4.13-stage-2-6-2-7-closeout`

---

## Mission Statement

Stage 2 Windows Device Shield is **implemented, real-device validated, regression-gated, security-audited, frozen, and ready for external technical review.**

Not production. Not Windows Service deployment. Not MDM/Intune. Not hardware attestation. Not automatic misconduct detection.

A clean, serious Windows research checkpoint.

---

## Freeze Evidence

| Area                     | Evidence                                                      | Reference                                                  |
| ------------------------ | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Windows daemon           | .NET 8 localhost daemon                                       | `tools/simurgh-daemon-windows/`                            |
| Real OS validation       | Windows 10 Pro build 19045                                    | AGENT.md Stage 2.6B entry                                  |
| Scanner API              | `GetWindowDisplayAffinity`                                    | `STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`            |
| Fixture                  | `SimurghAffinityFixture` — `none`, `monitor`, `exclude` modes | `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` |
| `WDA_MONITOR`            | `restricted_detected`, `monitor_only_window_count: 1`         | Real-device AGENT.md log                                   |
| `WDA_EXCLUDEFROMCAPTURE` | `risk_detected`, `capture_excluded_window_count: 1`           | Real-device AGENT.md log                                   |
| Signed proof accepted    | Live signed daemon proofs accepted                            | Stage 2.6 smoke                                            |
| Tamper rejection         | `invalid_signature`                                           | Stage 2.6 smoke + Stage 2.7 audit                          |
| Replay rejection         | Consumed challenge rejection                                  | Stage 2.6 smoke                                            |
| Raw-field rejection      | `hwnd` rejected as `forbidden_local_field`                    | Stage 2.6/2.7 smoke + audit                                |
| Report/dashboard/audit   | Verified                                                      | Stage 2.6 smoke                                            |
| Privacy sweep            | Passed                                                        | `node tools/privacy-audit.mjs`                             |
| Unit tests               | 273/273 pass                                                  | `npm test`                                                 |
| .NET daemon tests        | 11/11 pass                                                    | `dotnet test`                                              |
| Quality gate             | 47/48 gates green                                             | `scripts/check.sh`                                         |
| npm audit                | 0 vulnerabilities                                             | `npm audit --audit-level=high`                             |

---

## Gate Evidence

| Gate                                           | Script                                                             | Status               |
| ---------------------------------------------- | ------------------------------------------------------------------ | -------------------- |
| Stage 2.6 Windows scanner smoke                | `scripts/smoke-stage-2-6-windows-scanner.sh`                       | ✅ pass              |
| Stage 2.7 cross-platform smoke (Scenarios A–G) | `scripts/smoke-stage-2-7-cross-platform-device-shield.sh`          | ✅ pass              |
| Stage 2.6/2.7 closeout E2E smoke               | `scripts/smoke-stage-2-6-2-7-closeout.sh`                          | ✅ pass              |
| Stage 2.4/2.5 cybersecurity audit              | `scripts/security-audit-stage-2-4-2-5.sh`                          | ✅ pass              |
| Stage 2.7 cross-platform security audit        | `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` | ✅ pass              |
| Stage 2.6/2.7 closeout cybersecurity audit     | `scripts/security-audit-stage-2-6-2-7-closeout.sh`                 | ✅ pass              |
| Privacy audit                                  | `node tools/privacy-audit.mjs`                                     | ✅ pass              |
| npm audit                                      | `npm audit --audit-level=high`                                     | ✅ 0 vulnerabilities |
| GitHub Actions Simurgh Quality Gate            | CI/CD                                                              | ✅ pass              |

---

## Cross-Platform Contract

The Windows Device Shield is unified with the macOS Device Shield under the Stage 2.7 cross-platform contract:

- **Proof schema:** [`docs/schemas/daemon-proof.schema.json`](../schemas/daemon-proof.schema.json)
- **Scanner schema:** [`docs/schemas/device-scanner-result.schema.json`](../schemas/device-scanner-result.schema.json)
- **Device Shield contract:** [`DEVICE_SHIELD_CONTRACT.md`](../DEVICE_SHIELD_CONTRACT.md)
- **Platform matrix:** [`DEVICE_SHIELD_PLATFORM_MATRIX.md`](../DEVICE_SHIELD_PLATFORM_MATRIX.md)

Shared server modules enforce the same contract across platforms:

- `src/device/forbiddenLocalFields.js` — canonical forbidden raw-field list
- `src/device/platformScannerSchema.js` — platform list, scanner validator, version pinning
- `src/device/scannerRiskPolicy.js` — risk mapping, manual-review wording

---

## Confirmed Non-Claims

The following are **explicitly not claimed** by this research-prototype baseline:

| Non-claim                                                     | Status                            |
| ------------------------------------------------------------- | --------------------------------- |
| Production Windows Service deployment                         | ❌ Not claimed                    |
| MDM/Intune or Group Policy deployment                         | ❌ Not claimed                    |
| Hardware attestation or TPM integration                       | ❌ Not claimed                    |
| Kernel-level process visibility                               | ❌ Not claimed                    |
| GPU-layer overlay detection                                   | ❌ Not claimed (Stage 4 research) |
| Automatic misconduct detection                                | ❌ Never in scope                 |
| Linux scanner support                                         | ❌ Stage 2.8 research             |
| Raw HWND, PID, process name, window title, content collection | ❌ Privacy contract prohibits     |

---

## What This Freeze Means

**Frozen** = implemented + validated + gated + documented + externally reviewable as a research prototype.

**Not frozen** = Linux (Stage 2.8 research), production packaging, MDM deployment, hardware attestation, kernel-level coverage.

Stage 2.8 Linux Display Integrity Research begins next. Linux daemon proofs are currently rejected with `unsupported_platform` at both the pairing and proof layers.

---

## Related Documents

- [`STAGE_2_WINDOWS_TECHNICAL_BRIEF.md`](STAGE_2_WINDOWS_TECHNICAL_BRIEF.md) — full technical walkthrough
- [`STAGE_2_WINDOWS_VALIDATION_MATRIX.md`](STAGE_2_WINDOWS_VALIDATION_MATRIX.md) — gate-level verification matrix
- [`STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md`](STAGE_2_WINDOWS_REVIEWER_CHECKLIST.md) — reviewer checklist
- [`STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md`](STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md) — Stage 2.6 stage doc
- [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) — Stage 2.7 stage doc
- [`DEVICE_SHIELD_CONTRACT.md`](../DEVICE_SHIELD_CONTRACT.md) — unified cross-platform contract
- [`STAGE_2_5_TECHNICAL_BRIEF.md`](STAGE_2_5_TECHNICAL_BRIEF.md) — Stage 1–2.5 macOS brief (historical scope)
