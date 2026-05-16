# Stage 2 macOS Reviewer Checklist

> **Status (v0.4.10, 2026-05-16):** Stage 2.5 macOS Device Shield prototype complete and frozen. This checklist is the primary verification tool for the macOS prototype. For the formal closeout specifically see [`STAGE_2_MACOS_REVIEWER_CHECKLIST.md`](STAGE_2_MACOS_REVIEWER_CHECKLIST.md).

## Read First

- [`STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md`](STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md)
- `README.md`
- `docs/LIMITATIONS.md`
- `docs/THREAT_MODEL.md`
- `docs/STAGE_2_ARCHITECTURE.md`
- `CHANGELOG.md` (v0.4.1 to v0.4.10 entries)
- `SECURITY.md`
- `PRIVACY.md`
- `ETHICS.md`

## Commands to Run

```bash
npm install
./scripts/check.sh
npm test
node tools/privacy-audit.mjs
./scripts/smoke-stage-2-2-2-3.sh
./scripts/smoke-stage-2-4-2-5.sh
./scripts/security-audit-stage-2-4-2-5.sh
cd tools/simurgh-daemon-macos && swift test && swift build && cd ../..
```

## Claims to Verify

- Metadata-only telemetry (No pixels, no raw titles).
- Signed OS-level integrity proofs (P-256).
- Reusable browser SDK for daemon integration.
- macOS localhost daemon with loopback hardening.
- Recursive forbidden-field rejection in server validation.
- HMAC audit chain linking integrity events.
- Session token and replay protection.
- Manual-review wording in all verdicts.
- Stage 2.5 macOS prototype is complete.

## Limitations to Inspect

- GPU overlays (Metal/DirectX).
- Read-only cheating workflows.
- Windows/Linux scanner absence (Stage 2.6 milestone).
- Hardware attestation absence (Future research).
- Missing institutional pilot/red-team evidence.

## Evidence Available

- Unit tests (234 tests, 43 suites).
- macOS smoke packs (2.2–2.5 coverage).
- Cybersecurity audit gate script.
- Privacy audit tool.
- CI workflow status.
- Stage 2 macOS closeout documentation.

## Evidence Pending

- Institutional red-team results.
- Privacy/legal review memo for deployment.
- Accessibility review for student surfaces.
- Pilot environment data.

## Questions for Stage 2.6 (Windows)

- What Windows display-affinity APIs will be targeted?
- How will the Windows daemon be packaged and distributed?
- What Windows-specific red-team scenarios are in scope?
- Will the browser SDK require platform-specific logic?
