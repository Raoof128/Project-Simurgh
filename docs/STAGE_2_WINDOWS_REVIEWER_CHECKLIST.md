# Stage 2 Windows Device Shield — Reviewer Checklist

**Status:** Frozen as validated research-prototype baseline · Ready for external technical review
**Date:** 2026-05-17

Use this checklist when reviewing the Stage 2 Windows Device Shield research-prototype implementation.

---

## Release Gates

- [ ] Stage 2.6 release tag `v0.4.12-stage-2-6-windows-display-affinity-scanner` exists and points to `main`
- [ ] Stage 2.7 release tag `v0.4.13-stage-2-7-cross-platform-device-shield` exists and points to `main`
- [ ] Stage 2.6/2.7 closeout release tag `v0.4.13-stage-2-6-2-7-closeout` exists and points to `main`
- [ ] GitHub Actions Simurgh Quality Gate passed on `main`

---

## Real-Device Validation

- [ ] Windows 10 Pro build 19045 validation is documented in `AGENT.md` (Stage 2.6B entry)
- [ ] `SimurghAffinityFixture` exists at `tools/simurgh-daemon-windows/src/SimurghAffinityFixture/` and is clearly labelled as a controlled development validation tool
- [ ] `WDA_MONITOR` detection is documented: `restricted_detected`, `monitor_only_window_count: 1`
- [ ] `WDA_EXCLUDEFROMCAPTURE` detection is documented: `risk_detected`, `capture_excluded_window_count: 1`
- [ ] Normal desktop scan (WDA_NONE fixture) documented: zero restricted/excluded counts

---

## Proof Path

- [ ] Signed daemon proof acceptance documented and verified in Stage 2.6 smoke
- [ ] Tampered proof rejection documented: `invalid_signature`
- [ ] Replayed proof rejection documented: consumed challenge
- [ ] Raw local-field rejection documented: `hwnd` → `forbidden_local_field`
- [ ] Raw field rejection applies recursively (nested objects, arrays)

---

## Platform Integrity

- [ ] Platform `"linux"` rejected as `unsupported_platform` at the **pairing** layer
- [ ] Platform `"linux"` rejected as `unsupported_platform` at the **proof** layer
- [ ] `SUPPORTED_DEVICE_PLATFORMS` is `["macos", "windows"]` in `src/device/platformScannerSchema.js`
- [ ] `PLANNED_DEVICE_PLATFORMS` includes `"linux"` but is not implemented

---

## Privacy Contract

- [ ] Windows scanner emits no HWNDs, PIDs, process names, window titles, executable paths, usernames, home directories, serial numbers, MAC addresses, screen pixels, screenshots, webcam frames, microphone audio, typed content, or pasted content
- [ ] `src/device/forbiddenLocalFields.js` is the single source of truth for the forbidden-field list
- [ ] `tools/privacy-audit.mjs` imports from the shared forbidden-field module
- [ ] `FORBIDDEN_LOCAL_FIELD_NAMES` is frozen — mutation throws at runtime
- [ ] `node tools/privacy-audit.mjs` passes

---

## Cross-Platform Contract

- [ ] `docs/schemas/daemon-proof.schema.json` exists and documents the Windows proof shape
- [ ] `docs/schemas/device-scanner-result.schema.json` exists and covers Windows scanner fields
- [ ] `docs/DEVICE_SHIELD_CONTRACT.md` documents all `fail()` reason codes including Windows-specific ones
- [ ] Windows `scanner_version: "2.6.0"` is pinned in `platformScannerSchema.js`

---

## Report, Dashboard, and Audit

- [ ] Session report `device_integrity.daemon_platform` is `"windows"` for Windows sessions
- [ ] Session report `device_integrity.manual_review_recommendation` uses approved wording
- [ ] Wording is exactly: `"Manual review recommended. No automatic misconduct finding."` or `"No device-integrity anomaly detected."`
- [ ] No affirmative misconduct phrases appear in the dashboard HTML
- [ ] Audit chain verifies for a session with Windows scanner events

---

## Smoke Coverage

- [ ] `scripts/smoke-stage-2-6-windows-scanner.sh` passes (healthy, WDA_MONITOR, WDA_EXCLUDEFROMCAPTURE, tamper, raw-field, report, audit)
- [ ] `scripts/smoke-stage-2-7-cross-platform-device-shield.sh` passes (Scenarios A–G)
- [ ] `scripts/smoke-stage-2-6-2-7-closeout.sh` passes (umbrella)

---

## Security Audit Coverage

- [ ] `scripts/security-audit-stage-2-4-2-5.sh` passes
- [ ] `scripts/security-audit-stage-2-7-cross-platform-device-shield.sh` passes (15/15 tests)
- [ ] `scripts/security-audit-stage-2-6-2-7-closeout.sh` passes (24/24 tests, nine dimensions)

---

## Non-Claims

- [ ] No production Windows Service deployment is claimed
- [ ] No MDM/Intune or Group Policy deployment is claimed
- [ ] No hardware attestation or TPM integration is claimed
- [ ] No kernel-level visibility is claimed
- [ ] No GPU-layer overlay detection is claimed
- [ ] No automatic misconduct detection is claimed
- [ ] Linux scanner is clearly marked as Stage 2.8 future research

---

## Documentation Completeness

- [ ] `docs/STAGE_2_WINDOWS_TECHNICAL_BRIEF.md` exists and covers all 20 sections
- [ ] `docs/STAGE_2_WINDOWS_DEVICE_SHIELD_CLOSEOUT.md` exists with freeze evidence table
- [ ] `docs/STAGE_2_WINDOWS_VALIDATION_MATRIX.md` exists with gate-level verification
- [ ] `docs/evidence/stage-2-windows/README.md` exists with evidence-folder rules
- [ ] `STAGE_2_6_WINDOWS_DISPLAY_AFFINITY_SCANNER.md` is linked from the technical brief
- [ ] `DEVICE_SHIELD_CONTRACT.md` is cross-referenced
