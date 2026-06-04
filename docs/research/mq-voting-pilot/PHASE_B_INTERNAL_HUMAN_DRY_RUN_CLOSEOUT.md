# MQ Persian Society Voting Pilot — Phase B Internal Human Dry Run Closeout

**Phase B status:** Complete
**Date:** 2026-06-04
**Branch:** main

## Summary

Phase B internal human dry run produced 34 human-run evidence artefacts across 9 scenario types. All 34 completed with PASS assertions. One decline flow (`declines_consent`) created no server-side pilot session; the three `withdraws_midway` flows correctly created a session on consent acceptance and then blocked the report export with 403.

## Evidence metadata correction

Phase B files carry `"synthetic": false, "data_source": "internal_human_dry_run"` to distinguish them from the Phase A deterministic automated runs (`"synthetic": true`) that live in the same `evidence/synthetic/` directory.

## Scenario coverage (34 artefacts)

| Scenario                         | Files |
| -------------------------------- | ----: |
| `compliant_browser_only`         |    16 |
| `distracted_member`              |     6 |
| `daemon_unavailable`             |     4 |
| `withdraws_midway`               |     3 |
| `compliant_with_fixture_daemon`  |     1 |
| `declines_consent`               |     1 |
| `forbidden_ballot_field_attempt` |     1 |
| `replay_attempt`                 |     1 |
| `tampered_proof`                 |     1 |
| **Total**                        |    **34** |

## Gate results

| Gate                                          | Result                                     |
| --------------------------------------------- | ------------------------------------------ |
| `npm test`                                    | 359/359 pass                               |
| `npm audit --audit-level=high`                | 0 high vulnerabilities                     |
| `node tools/privacy-audit.mjs`                | 0 violations (52 evidence files scanned)   |
| `bash scripts/check.sh`                       | exit 0                                     |
| `bash scripts/smoke-voting-pilot.sh`          | 8/8 pass                                   |
| `bash scripts/security-audit-voting-pilot.sh` | 10/10 pass                                 |

## Key assertions verified

- Ballot-choice blindness: `ballot_choice_recorded_by_simurgh: false` in all submissions
- Audit chain integrity: `chain_valid: true` in all reports
- Official vote impact: `official_vote_impact: false` in all sessions
- Consent gate: no pilot session created before acceptance (`declines_consent` has `pilot_session_id: null`)
- Withdrawal hard stop: report blocked with 403 after `withdraws_midway`
- Forbidden fields rejected: 400 on any POST containing ballot-choice payload

## Decision

**Phase B complete. Ready for Phase C planning.**

## Phase C prerequisites (not yet satisfied)

- MQ Persian Society executive written approval
- MQ Human Research Ethics application submitted and approved (if publishing participant data)
- Consent page version locked and dated
- Data management plan confirmed with ethics office
- Participant information sheet reviewed by executive
