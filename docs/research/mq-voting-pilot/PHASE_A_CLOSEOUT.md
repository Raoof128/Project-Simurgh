# MQ Persian Society Voting Pilot — Phase A Closeout

**Phase A status:** Complete
**Date:** 2026-05-28
**Branch:** main

## Gate results

| Gate                                          | Result                                  |
| --------------------------------------------- | --------------------------------------- |
| `npm test`                                    | 357/357 pass                            |
| `npm audit --audit-level=high`                | 0 high vulnerabilities                  |
| `node tools/privacy-audit.mjs`                | 0 violations (9 evidence files scanned) |
| `bash scripts/check.sh`                       | exit 0                                  |
| `bash scripts/smoke-voting-pilot.sh`          | 8/8 pass                                |
| `bash scripts/security-audit-voting-pilot.sh` | 10/10 pass                              |
| Synthetic personas                            | 9/9 PASS                                |

## What was built

- `src/votingPilot/` — events, consentStore, reportBuilder, Express router
- Atomic consent gate — no session created before acceptance
- Ballot-choice blindness — choice discarded in browser before POST; server rejects all forbidden fields with 400
- Browser-only integrity tier (v0.1 — daemon tier deferred to v0.2)
- HMAC-SHA256 participant code hash; raw code shown once, never stored
- Tamper-evident audit chain per session
- Withdrawal: one timestamp-only event, hard stop, report export blocked (403)
- Report route: requires pilot bearer token; token/path session match enforced
- 9-persona deterministic HTTP-level synthetic runner
- Smoke and security audit safety scripts
- 5 research protocol documents

## Evidence

- `evidence/pre-pilot/` — gate outputs from final Phase A run
- `evidence/synthetic/` — 9 synthetic persona session JSON files

## Decision

**Ready for Phase B internal dry run.**

Phase B scope: 1–3 trusted executive/testers. UX review, consent clarity, flow reliability. No general member participants until Phase C governance prerequisites are met.

## Phase C prerequisites (not yet satisfied)

- MQ Persian Society executive written approval
- MQ Human Research Ethics application submitted and approved (if publishing participant data)
- Consent page version locked and dated
- Data management plan confirmed with ethics office
