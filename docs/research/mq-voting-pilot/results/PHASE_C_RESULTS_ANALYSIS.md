# Phase C Results Analysis

**Pilot:** Project Simurgh — MQ Persian Society Voting-Adjacent Integrity Pilot  
**Phase:** C (real-member pilot, shadow mode)  
**Tag:** `v0.5.0-voting-pilot-phase-c-closeout`  
**Closed:** 2026-06-04 (Australia/Sydney)

---

## 1. Dataset summary

| Metric                                | Value                                                    |
| ------------------------------------- | -------------------------------------------------------- |
| Consented pilot sessions              | 31                                                       |
| Submitted sessions (primary analysis) | 30                                                       |
| Withdrawn sessions                    | 1                                                        |
| Withdrawn session ID                  | `vp_4fcc741a` (excluded from report export and analysis) |
| Official vote impact                  | 0 — shadow mode only                                     |
| Ballot choices collected by Simurgh   | 0                                                        |

The pilot ran alongside the MQ Persian Society event preference poll in shadow
mode. No data was collected that could affect or reveal the official election
result.

---

## 2. Privacy result

### Primary finding

All 30 submitted sessions returned `ballot_choice_recorded_by_simurgh: false`.

The ballot choice was discarded in the browser before the network call in every
session. Simurgh received a submit-intent signal only — never which option the
participant selected.

### Full privacy envelope

| Privacy assertion                              | Result                                  |
| ---------------------------------------------- | --------------------------------------- |
| `ballot_choice_recorded_by_simurgh`            | `false` — all 30 submitted sessions     |
| Ballot choice transmitted to server            | Never — discarded client-side pre-fetch |
| Screen capture collected                       | No                                      |
| Webcam / audio collected                       | No                                      |
| Typed content collected                        | No                                      |
| Pasted content collected                       | No                                      |
| Personal device identifiers collected          | No                                      |
| Raw process names collected                    | No                                      |
| Raw window titles collected                    | No                                      |
| Privacy audit (`node tools/privacy-audit.mjs`) | PASS — 52 evidence files scanned        |

These assertions are enforced by the system design, not only by policy:

- The submit page JavaScript sets all radio `value` attributes to `""` before
  calling `fetch`, so the ballot field is structurally absent from the request body.
- The server's `FORBIDDEN_BALLOT_FIELDS` set rejects any submission body that
  contains a known ballot-choice key, returning `400` with no field-value echo.
- The privacy audit scans all evidence exports for forbidden keys at every gate run.

---

## 3. Integrity result

### Consent and submission flow

| Flow step                              | Result                             |
| -------------------------------------- | ---------------------------------- |
| Consent page served                    | ✓                                  |
| Consent accepted (31 sessions)         | ✓                                  |
| Anonymous participant code issued      | ✓ per session                      |
| HMAC audit chain initialised           | ✓ per session                      |
| Submit intent received (30 sessions)   | ✓                                  |
| Submit recorded in audit chain         | ✓ per submitted session            |
| Withdrawn session (1)                  | ✓ blocked from report export (403) |
| Withdrawn session included in analysis | No                                 |

### Collection closure

After the 30-session target was reached:

- UI pages replaced with "Collection closed" banners — no JS submission logic.
- Server-side lock (`SIMURGH_VOTING_PILOT_COLLECTION_CLOSED=true`) enforced:
  - `POST /consent/accept` → `410 Gone`
  - `POST /submit` → `410 Gone`
  - `POST /withdraw` → `410 Gone`
  - `GET /:id/report` → active, token-protected

The closure is enforced before authentication middleware on the write routes,
meaning it cannot be bypassed with a valid token.

---

## 4. Safety gates

| Gate                             | Result                          |
| -------------------------------- | ------------------------------- |
| Node tests (`npm test`)          | 359/359 pass                    |
| npm audit (`--audit-level=high`) | 0 high/critical vulnerabilities |
| Privacy audit                    | PASS (52 files scanned)         |
| `smoke-voting-pilot.sh`          | 8/8 pass                        |
| `security-audit-voting-pilot.sh` | 10/10 pass                      |
| `smoke-voting-pilot-closed.sh`   | 5/5 pass                        |

---

## 5. What this pilot does and does not claim

### Claims

- Project Simurgh can be integrated into a consented shadow-mode pilot
  alongside a real student-society voting event.
- The consent-to-submit flow completes without collecting ballot choices,
  screen recordings, webcam/audio, typed content, pasted content, or personal
  device identifiers.
- The HMAC audit chain correctly records session lifecycle events.
- Server-side collection closure is enforceable and verifiable.

### Non-claims

- Simurgh did not secure the official vote. The official election result was
  determined entirely by the society's own voting system.
- This pilot is not a production election-security deployment.
- No automatic misconduct finding is made from pilot data.
- No hardware attestation, screen capture analysis, or process enumeration was
  performed.
- The 30-session dataset is a proof-of-concept pilot, not a statistically
  powered study.

---

## 6. Paper-safe headline finding

In a 30-session study pilot, Project Simurgh provided privacy-preserving
voting-session integrity evidence without collecting ballot choices, screen
recordings, webcam/audio, typed content, pasted content, or personal device
identifiers. One additional consented session was withdrawn and excluded from
analysis. After collection, all write endpoints were closed server-side with
HTTP 410 responses.

---

## 7. Reviewer-safe wording guide

| Do not say                           | Say instead                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| "Simurgh secured the vote"           | "Simurgh provided privacy-preserving integrity evidence for a consented voting-adjacent pilot" |
| "voting security system"             | "voting-session integrity research prototype"                                                  |
| "election integrity"                 | "pilot session integrity"                                                                      |
| "participants voted through Simurgh" | "participants completed a consented shadow-mode pilot alongside the official voting event"     |
| "Simurgh monitored the election"     | "Simurgh collected session-level integrity metadata in shadow mode"                            |
