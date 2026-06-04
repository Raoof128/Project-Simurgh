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

Collection is closed visually and server-side. All voting-pilot write endpoints
return `410 Gone` when `SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true`. Report
access remains protected by token and is not locked — existing sessions can
still export their audit report.

| Endpoint | Closed state |
| --- | --- |
| `POST /api/voting-pilot/consent/accept` | 410 Gone |
| `POST /api/voting-pilot/submit` | 410 Gone |
| `POST /api/voting-pilot/withdraw` | 410 Gone |
| `GET /api/voting-pilot/:id/report` | Active (token required) |

**Tag:** `v0.5.0-voting-pilot-phase-c-closeout`

---

## Paper-safe summary

Phase C completed with 31 consented pilot sessions, including 30 submitted
sessions in the primary analysis dataset and one withdrawn session excluded from
report export and analysis. All submitted sessions returned
`ballot_choice_recorded_by_simurgh: false`. After collection, the pilot was
closed both visually and server-side, with all write endpoints returning
`410 Gone` under the collection-closed configuration.

---

## Non-claims preserved

- Research prototype only. No production deployment.
- Simurgh did not record, store, or transmit ballot choices for any session.
- No automatic misconduct finding is made from pilot data.
- The pilot had no effect on the official MQ Persian Society election result.
