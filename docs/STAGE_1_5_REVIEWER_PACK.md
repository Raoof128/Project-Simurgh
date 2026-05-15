# Stage 1.5 Reviewer Pack

> **Status (v0.4.3, 2026-05-15):** This pack remains the canonical reviewer entry point for **Stage 1.5**. Stage 2.1 (v0.4.1), Stage 2.2 (v0.4.2), and the v0.4.3 hardening pass are now merged on `main`. For Stage 2 documentation, see `CHANGELOG.md`, [`STAGE_2_ARCHITECTURE.md`](STAGE_2_ARCHITECTURE.md), `SECURITY.md`, and the design specs under [`docs/superpowers/specs/`](superpowers/specs/).

This is the main entry point for reviewing Project Simurgh after Stage 1 and before Stage 2.

## Executive Summary

Project Simurgh Stage 1 is a privacy-preserving academic integrity research MVP. It demonstrates metadata-only telemetry, deterministic local risk scoring, HMAC audit chaining, session-token enforcement, replay protection, helper-authenticated display-affinity signals, and an instructor review dashboard.

Stage 1.5 is a validation and reviewer-readiness pack. It does not add major Stage 2 runtime code.

## Current Status

| Area                                   | Status                   |
| -------------------------------------- | ------------------------ |
| Stage 1 Academic Shield                | Complete as research MVP |
| Stage 1.5 validation docs              | Present in this pack     |
| Stage 2 Device Shield / Integrity Node | Planned, not implemented |
| Production deployment                  | Not claimed              |
| Institutional pilot                    | Pending                  |
| Red-team validation                    | Pending                  |
| Privacy/legal review                   | Pending                  |

## What Stage 1 Proves

- Browser metadata can support low-bandwidth integrity review without screen capture.
- Risk scoring can be deterministic and inspectable.
- Claude narrative can be optional and non-authoritative.
- Joined sessions can be token-bound.
- Replay and stale/future telemetry can be rejected.
- Helper display-affinity reports can escalate risk when available.
- Audit entries can be chained and verified.
- Privacy guardrails can be enforced in code and checked in CI.

## What Stage 1 Does Not Prove

- It does not prove production readiness.
- It does not fully solve GPU overlays.
- It does not fully solve read-only cheating.
- It does not provide hardware-rooted attestation.
- It does not replace institutional misconduct process.
- It does not provide cross-platform helper coverage.
- It does not establish real-world effectiveness without pilot data.

## Stage 1.5 Pack Links

- [Threat Model](THREAT_MODEL.md)
- [Validation Matrix](VALIDATION.md)
- [Limitations](LIMITATIONS.md)
- [Stage 2 Architecture](STAGE_2_ARCHITECTURE.md)
- [Resource Plan](RESOURCE_PLAN.md)
- [Demo Script](DEMO_SCRIPT.md)
- [Decisions](DECISIONS.md)
- [Risk Register](RISK_REGISTER.md)
- [Reviewer Checklist](REVIEWER_CHECKLIST.md)
- [Evidence Folder Rules](evidence/stage-1/README.md)

## Claims-to-Evidence Table

| Claim                             | Evidence in repo                                                                                        | Status                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Metadata-only telemetry           | `src/privacy/privacyConfig.js`, `src/privacy/normaliseTelemetry.js`, `PRIVACY.md`                       | Verified in repo                                      |
| No screen/webcam/audio collection | `PRIVACY.md`, `SECURITY.md`, `tools/privacy-audit.mjs`                                                  | Verified as design and scan target                    |
| No typed/pasted content storage   | `src/privacy/normaliseTelemetry.js`, `tools/privacy-audit.mjs`, `tests/unit/normaliseTelemetry.test.js` | Verified in repo                                      |
| HMAC audit chain                  | `src/audit/hmacChain.js`, `tests/unit/hmacChain.test.js`                                                | Verified in repo                                      |
| Audit verification endpoint       | `server.js` (`GET /api/audit/:sessionId/verify`)                                                        | Verified in repo                                      |
| Session token enforcement         | `src/security/sessionToken.js`, `server.js`, `tests/unit/sessionToken.test.js`                          | Verified in repo                                      |
| Replay protection                 | `src/security/replayGuard.js`, `server.js`, `tests/unit/replayGuard.test.js`                            | Verified in repo                                      |
| Helper secret enforcement         | `server.js` (`POST /api/affinity`)                                                                      | Verified in repo                                      |
| Instructor token enforcement      | `server.js` (`requireInstructorAuth`)                                                                   | Verified in repo                                      |
| Rate limiting                     | `src/security/rateLimit.js`, `server.js`, `tests/unit/rateLimit.test.js`                                | Verified in repo                                      |
| Privacy audit                     | `tools/privacy-audit.mjs`, `scripts/check.sh`                                                           | Verified in repo                                      |
| CI workflow                       | `.github/workflows/stage-1-checks.yml`                                                                  | Workflow present; remote status depends on GitHub run |
| Unit tests                        | `tests/unit/*.test.js`, `package.json`                                                                  | Verified in repo                                      |
| Manual review wording             | `src/academic/riskScoring.js`, `ETHICS.md`                                                              | Verified in repo                                      |
| Stage 2 not yet implemented       | `docs/STAGE_2_ARCHITECTURE.md`, repo source layout                                                      | Verified by repo inspection                           |

## Evidence Map

| Evidence type               | Location                                 |
| --------------------------- | ---------------------------------------- |
| Local verification commands | `docs/VALIDATION.md`, `scripts/check.sh` |
| Redacted command output     | `docs/evidence/stage-1/`                 |
| CI workflow                 | `.github/workflows/stage-1-checks.yml`   |
| Threat model                | `docs/THREAT_MODEL.md`                   |
| Privacy policy              | `PRIVACY.md`                             |
| Security policy             | `SECURITY.md`                            |
| Ethics boundary             | `ETHICS.md`                              |
| Stage 1 reference           | `docs/STAGE_1_ACADEMIC_SHIELD.md`        |

## Licence and Dependency Review

| Item                          | Evidence                                                                                                                   | Status                             |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Project licence               | `LICENSE`                                                                                                                  | MIT licence present                |
| Runtime dependencies          | `package.json`, `package-lock.json`                                                                                        | Express and Anthropic SDK declared |
| Dependency vulnerability scan | `npm audit --audit-level=high`                                                                                             | Refresh during validation          |
| Third-party attribution       | Package licences remain in `node_modules` after install; release packaging should include generated notices if distributed | Pending release-process decision   |

## Risk and Limitation Summary

The major remaining risks are GPU overlays, read-only cheating workflows, helper spoofing if secrets leak, compromised endpoints, OS API behavior changes, and missing pilot data. See [Risk Register](RISK_REGISTER.md) and [Limitations](LIMITATIONS.md).

## Stage 2 Readiness Criteria

Stage 2 planning is reasonable after:

- Stage 1.5 docs are reviewed.
- Local validation commands pass.
- README, SECURITY, PRIVACY, ETHICS, and ROADMAP agree.
- Pending evidence is either collected or accepted as pending.
- Privacy/legal review requirements are identified.
- Red-team scope is defined.

## Recommended Reviewer Path

1. Read this file.
2. Read `README.md`.
3. Read `docs/LIMITATIONS.md`.
4. Run `./scripts/check.sh`.
5. Review `docs/VALIDATION.md`.

## Recommended Technical Review Path

1. Inspect `server.js`.
2. Inspect `src/privacy/`, `src/security/`, `src/audit/`, and `src/academic/`.
3. Run `npm test`.
4. Run `node tools/privacy-audit.mjs`.
5. Inspect `scripts/check.sh` and CI workflow.

## Recommended Security Review Path

1. Read `docs/THREAT_MODEL.md`.
2. Read `SECURITY.md`.
3. Inspect token, replay, rate-limit, and helper-auth modules.
4. Inspect dashboard rendering in `public/instructor.html`.
5. Run secret and overclaim scans from the prompt or `scripts/check.sh`.

## Recommended Privacy / Legal Review Path

1. Read `PRIVACY.md`, `ETHICS.md`, and `DISCLAIMER.md`.
2. Inspect `src/privacy/`.
3. Review evidence-folder rules before any logs are shared.
4. Confirm student notice, consent, retention, appeals, and accessibility requirements.

## Next-Step Language

Appropriate: "Stage 1.5 validation pack is ready for review after local checks pass."

Appropriate: "Ready to begin Stage 2 planning after reviewer acceptance."

Avoid: production claims, certainty claims, and automatic misconduct language.
