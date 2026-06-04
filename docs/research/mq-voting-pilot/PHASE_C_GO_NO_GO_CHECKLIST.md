# Phase C Go / No-Go Checklist — MQ Persian Society Voting Pilot

**Version:** 2026-06-v1
**Status:** ✅ GO — all items confirmed 2026-06-04

---

## Governance

- [x] MQ Persian Society executive committee provides written approval to proceed — **Mona Zabeti, 2026-06-04**
- [x] Approval names the pilot scope, dates, and participant ceiling — scope: optional member pilot, ceiling: ≤ 30, cycle: 2026
- [x] Approval signed, dated, and recorded in `PHASE_C_EXECUTIVE_APPROVAL_REQUEST.md`

## Ethics

- [x] Principal researcher has determined whether MQ Human Research Ethics approval is required
- [x] Written rationale recorded: internal student-society pilot, voluntary participation, no ballot content collected, aggregate analysis only, no publication of individual participant data at this stage — formal ethics application not required for this phase
- [x] Rationale approved — 2026-06-04

## Consent infrastructure

- [x] Consent page version locked and dated — `2026-05-v1` confirmed for Phase C
- [x] Participant information sheet reviewed against Phase C scope — `PHASE_C_PARTICIPANT_NOTICE.md`
- [x] Withdrawal flow tested and confirmed blocking report export (403) — smoke 8/8 pass
- [x] Decline flow tested and confirmed creating no server-side session — Phase B evidence confirms

## Data management

- [x] Data management plan updated for Phase C — `PHASE_C_DATA_MANAGEMENT_ADDENDUM.md`
- [x] Retention period defined — duration of 2026 election research period
- [x] Storage location confirmed — local-only
- [x] Access control documented — principal researcher only

## Technical gates (re-run before go)

- [x] `npm test` — 359/359 pass
- [x] `npm audit --audit-level=high` — 0 high/critical
- [x] `node tools/privacy-audit.mjs` — 0 violations (52 files scanned)
- [x] `bash scripts/check.sh` — exit 0
- [x] `bash scripts/smoke-voting-pilot.sh` — 8/8 pass
- [x] `bash scripts/security-audit-voting-pilot.sh` — 10/10 pass

## Participant data label

- [x] Server confirmed to emit `"data_source": "human_participant"` for Phase C sessions
- [x] Phase B artefacts (`"data_source": "internal_human_dry_run"`) confirmed unmodified

## Communication

- [x] Participant ceiling agreed with executive — ≤ 30 for Phase C pilot
- [x] Opt-in recruitment message approved — voluntary, no pressure language, via society channels
- [x] Contact point for participant questions — raoof.r12@gmail.com

---

**Sign-off — Phase C launch approved:**

| Role                            | Name                    | Date       |
| ------------------------------- | ----------------------- | ---------- |
| Principal researcher            | Raouf                   | 2026-06-04 |
| Society executive approver      | Mona Zabeti             | 2026-06-04 |
| Ethics approval (if applicable) | N/A — rationale on file | 2026-06-04 |
