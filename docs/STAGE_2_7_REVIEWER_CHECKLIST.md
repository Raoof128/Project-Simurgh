# Stage 2.7 — Reviewer Checklist

Use this checklist alongside [`STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md`](STAGE_2_7_CROSS_PLATFORM_DEVICE_SHIELD.md) and the design spec at `docs/superpowers/specs/2026-05-17-stage-2-7-cross-platform-device-shield-design.md`. Each item maps directly to an acceptance criterion in spec §12. Tick every box before approving the merge.

## Contract and schemas

- [ ] macOS and Windows operate under one documented Device Shield contract (`docs/DEVICE_SHIELD_CONTRACT.md`).
- [ ] Scanner result schema present at `docs/schemas/device-scanner-result.schema.json` and parses as valid JSON.
- [ ] Daemon proof schema present at `docs/schemas/daemon-proof.schema.json` and parses as valid JSON.
- [ ] Contract enumerates every `fail("...")` reason produced by `validateDaemonProof` and `validateDaemonPairingPayload`.
- [ ] Platform matrix (`docs/DEVICE_SHIELD_PLATFORM_MATRIX.md`) is reconciled with the README's platform tables.

## Shared modules

- [ ] `src/device/platformScannerSchema.js` exists and is consumed by `daemonProof.js`.
- [ ] `src/device/scannerRiskPolicy.js` exists and is consumed by `riskScoring.js` and `reportBuilder.js`.
- [ ] `src/device/forbiddenLocalFields.js` exists and is consumed by `daemonProof.js`, `tools/privacy-audit.mjs`, and the Stage 2.7 security tests.
- [ ] The 29-name forbidden-field list previously in `daemonProof.js` is preserved unchanged (no entries removed).

## Server-side validator behaviour (no regressions)

- [ ] macOS proof path still passes (Stage 2.2/2.3 and Stage 2.4/2.5 smokes green).
- [ ] Windows proof path still passes (Stage 2.6 smoke green).
- [ ] Linux proof is rejected with `unsupported_platform`.
- [ ] Tampered `platform` (macos → windows after signing) is rejected with `invalid_signature`.
- [ ] Tampered `scanner_version` is rejected.
- [ ] Tampered `monitor_only_window_count` is rejected.
- [ ] Tampered `capture_excluded_window_count` is rejected.
- [ ] Replayed proofs are rejected.
- [ ] Raw local fields are rejected recursively as `forbidden_local_field`, including when nested under sub-objects such as `debug`.

## Browser SDK

- [ ] `getDeviceShieldStatus()` is exposed and documented as UX-only.
- [ ] SDK-supplied standalone scanner fields are never trusted by the server.
- [ ] Documentation explicitly states the server trusts only signed `daemon_proof`.

## Report and dashboard

- [ ] Reports use one `device_integrity` shape across platforms, including `daemon_platform`.
- [ ] Dashboard shows platform + scanner state consistently across macOS and Windows.
- [ ] Manual-review wording present where required: _"Manual review recommended. No automatic misconduct finding."_
- [ ] None of the forbidden phrases appear: `cheating detected`, `student guilty`, `automatic misconduct`, `confirmed misconduct`.

## Smoke and audit

- [ ] Stage 2.7 cross-platform smoke script passes (`scripts/smoke-stage-2-7-cross-platform-device-shield.sh`).
- [ ] Scenarios A–G all execute and assert correctly.
- [ ] Stage 2.7 cross-platform security audit passes (`scripts/security-audit-stage-2-7-cross-platform-device-shield.sh`).
- [ ] All earlier smokes (2.2/2.3, 2.4/2.5, 2.5 audit, 2.6 windows) still pass.
- [ ] `scripts/check.sh` includes Stage 2.7 smoke + audit and is green.

## Process and release

- [ ] `npm test` green.
- [ ] `npm audit --audit-level=high` green.
- [ ] `node tools/privacy-audit.mjs` green.
- [ ] AGENT.md updated with a Raouf-prefixed Stage 2.7 entry.
- [ ] CHANGELOG.md updated with a Raouf-prefixed v0.4.13 entry.
- [ ] GitHub Actions green.
- [ ] Release tag `v0.4.13-stage-2-7-cross-platform-device-shield` created after merge.

## Non-claims preserved

- [ ] No production deployment claim.
- [ ] No MDM/Intune claim.
- [ ] No hardware attestation claim.
- [ ] No kernel-level visibility claim.
- [ ] No GPU overlay coverage claim.
- [ ] No automatic misconduct detection claim.
- [ ] No Linux parity claim.
- [ ] Metadata-only privacy contract preserved.
