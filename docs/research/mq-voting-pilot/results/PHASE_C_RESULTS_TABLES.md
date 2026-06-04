# Phase C Results Tables

**Pilot:** Project Simurgh — MQ Persian Society Voting-Adjacent Integrity Pilot  
**Tag:** `v0.5.0-voting-pilot-phase-c-closeout`

---

## Table 1 — Session counts

| Metric | Count |
| --- | ---: |
| Consented pilot sessions | 31 |
| Submitted sessions | 30 |
| Withdrawn sessions | 1 |
| Primary analysis dataset | 30 |

## Table 2 — Privacy assertions (all 30 submitted sessions)

| Assertion | Result |
| --- | --- |
| `ballot_choice_recorded_by_simurgh` | `false` |
| Ballot choice transmitted to server | No |
| Screen capture | No |
| Webcam / audio | No |
| Typed content | No |
| Pasted content | No |
| Personal device identifiers | No |
| Raw process names | No |
| Raw window titles | No |
| `official_vote_impact` | `false` |

## Table 3 — Integrity flow (30 submitted sessions)

| Flow step | Sessions |
| --- | ---: |
| Consent accepted | 31 |
| Participant code issued | 31 |
| Audit chain initialised | 31 |
| Submit intent received | 30 |
| Withdrawn (excluded) | 1 |
| Report export blocked for withdrawn session | 1 (403) |

## Table 4 — Safety gates at closeout

| Gate | Result |
| --- | ---: |
| Node tests | 359 / 359 pass |
| npm audit (high/critical) | 0 vulnerabilities |
| Privacy audit | PASS |
| Smoke gates | 8 / 8 pass |
| Security audit gates | 10 / 10 pass |
| Collection-closure smoke gates | 5 / 5 pass |

## Table 5 — Collection closure endpoint map

| Endpoint | Open state | Closed state |
| --- | --- | --- |
| `POST /api/voting-pilot/consent/accept` | 200 | 410 Gone |
| `POST /api/voting-pilot/submit` | 200 | 410 Gone |
| `POST /api/voting-pilot/withdraw` | 200 | 410 Gone |
| `GET /api/voting-pilot/:id/report` | 200 (token-gated) | 200 (token-gated) |
