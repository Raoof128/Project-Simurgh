# Phase C Member Pilot — Closeout

**Status:** Complete  
**Closed:** 2026-06-04 (Australia/Sydney)  
**Collection window:** Phase C, shadow-mode pilot alongside the MQ Persian Society event preference poll

---

## Session counts

| Metric                    | Value                  |
| ------------------------- | ---------------------- |
| Consented pilot sessions  | 31                     |
| Submitted sessions        | 30                     |
| Withdrawn sessions        | 1                      |
| Withdrawn session ID      | `vp_4fcc741a`          |
| Primary analysis dataset  | 30 submitted sessions  |

Phase C recorded 31 consented pilot sessions. One session was withdrawn before
final analysis, leaving 30 submitted sessions in the primary analysis dataset.
All 30 submitted sessions completed the consent-to-submit flow and returned
`ballot_choice_recorded_by_simurgh: false`.

---

## Privacy assertions

| Assertion                                          | Result  |
| -------------------------------------------------- | ------- |
| `ballot_choice_recorded_by_simurgh`                | `false` for all 30 submitted sessions |
| Ballot choice leaves browser                       | Never — discarded before network call |
| Official vote impact                               | `false` — shadow mode only            |
| Report export for withdrawn session (`vp_4fcc741a`)| Blocked (403)                         |
| Withdrawn session included in analysis             | No                                    |

---

## Gate results at closeout

| Gate                            | Result            |
| ------------------------------- | ----------------- |
| `npm test`                      | 359/359 pass      |
| `npm audit --audit-level=high`  | 0 high/critical   |
| `node tools/privacy-audit.mjs`  | PASS (52 files)   |
| `bash scripts/smoke-voting-pilot.sh`          | 8/8 pass |
| `bash scripts/security-audit-voting-pilot.sh` | 10/10 pass |

Pre-existing local-only failures in `scripts/check.sh` (prettier line endings,
.NET 8 not installed, Linux Xvfb/Rust CI-only) are unchanged from the Phase B
closeout baseline and are not caused by Phase C changes.

---

## Collection freeze

Both pages (`/voting-pilot.html`, `/voting-pilot-submit.html`) now display a
**"Collection closed"** banner. The consent/submit buttons and all JavaScript
submission logic have been removed. No new sessions can be created.

---

## Paper-safe sentence

Phase C recorded 31 consented pilot sessions. One session was withdrawn before
final analysis, leaving 30 submitted sessions in the primary analysis dataset.
All 30 submitted sessions completed the consent-to-submit flow and returned
`ballot_choice_recorded_by_simurgh: false`.

---

## Non-claims preserved

- Research prototype only. No production deployment.
- Simurgh did not record, store, or transmit ballot choices for any session.
- No automatic misconduct finding is made from pilot data.
- The pilot had no effect on the official MQ Persian Society election result.
