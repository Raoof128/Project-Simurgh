# Stage 2 macOS Reviewer Checklist

Use this checklist to verify the Stage 2 macOS Device Shield closeout.

## Status & Documentation

- [ ] `README.md` status is current (v0.4.10, macOS frozen).
- [ ] `README.md` Stage 2.5 section no longer says "branch active".
- [ ] `ROADMAP.md` marks Stage 2 macOS as complete and Stage 2.6 Windows as next.
- [ ] `SECURITY.md` documents Stage 2 macOS security posture and exclusions.
- [ ] `PRIVACY.md` documents the metadata-only scanner contract and forbidden data list.
- [ ] `docs/STAGE_2_MACOS_DEVICE_SHIELD_CLOSEOUT.md` exists and is complete.
- [ ] `docs/STAGE_2_MACOS_VALIDATION_MATRIX.md` exists and matches script names.
- [ ] Future macOS production-hardening backlog is documented as out-of-scope.

## Scope & Integrity

- [ ] macOS daemon scope is explained (metadata-only, local-only).
- [ ] Browser SDK scope is explained (Discovery, Pairing, Proof fetch).
- [ ] Scanner scope is explained (CoreGraphics metadata aggregation).
- [ ] Signed proof flow is documented (P-256 signatures).
- [ ] Privacy contract is explicit (No pixels, no raw titles/processes).
- [ ] Manual-review wording is preserved (No automatic misconduct findings).

## Verification Evidence

- [ ] `npm test` passes (234/234).
- [ ] `node tools/privacy-audit.mjs` passes (0 forbidden fields).
- [ ] `./scripts/smoke-stage-2-2-2-3.sh` passes.
- [ ] `./scripts/smoke-stage-2-4-2-5.sh` passes.
- [ ] `./scripts/security-audit-stage-2-4-2-5.sh` passes.
- [ ] `./scripts/check.sh` passes (51/51 gates).
- [ ] Swift daemon `swift test` passes in `tools/simurgh-daemon-macos`.
- [ ] Swift daemon `swift build` and `swift build -c release` pass.

## Final Review

- [ ] Release timeline (v0.4.5 to v0.4.10) is documented in the closeout doc.
- [ ] Evidence-folder rules are defined in `docs/evidence/stage-2-macos/README.md`.
- [ ] `AGENT.md` and `CHANGELOG.md` have received closeout documentation entries.
