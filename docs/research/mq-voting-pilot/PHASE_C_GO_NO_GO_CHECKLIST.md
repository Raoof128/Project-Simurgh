# Phase C Go / No-Go Checklist — MQ Persian Society Voting Pilot

**Version:** 2026-06-v1
**Status:** Pending — do not proceed until all items are checked

Phase C must not begin until every item below is marked complete and the gate results re-run on the final codebase.

---

## Governance

- [x] MQ Persian Society executive committee provides written approval to proceed — **Mona Zabeti, 2026-06-04**
- [ ] Approval names the pilot scope, dates, and participant ceiling
- [ ] Approval is signed and dated and stored in `docs/research/mq-voting-pilot/approvals/`

## Ethics

- [ ] Principal researcher has determined whether MQ Human Research Ethics approval is required (required if data will be published or if participants include non-researchers)
- [ ] If required: ethics application submitted and approval number recorded here: `__________`
- [ ] If not required: written rationale recorded and approved by supervisor

## Consent infrastructure

- [ ] Consent page version is locked and dated (current: `2026-05-v1` — must be reviewed and re-versioned for Phase C if any wording changes)
- [ ] Participant information sheet reviewed against Phase C scope
- [ ] Withdrawal flow tested and confirmed blocking report export (403)
- [ ] Decline flow tested and confirmed creating no server-side session

## Data management

- [ ] Data management plan updated for Phase C (persistent storage decision documented)
- [ ] Retention period defined and approved
- [ ] Storage location decision made (local-only or ethics-approved remote)
- [ ] Access control documented for Phase C data

## Technical gates (re-run before go)

- [ ] `npm test` — all pass
- [ ] `npm audit --audit-level=high` — 0 high/critical
- [ ] `node tools/privacy-audit.mjs` — 0 violations
- [ ] `bash scripts/check.sh` — exit 0
- [ ] `bash scripts/smoke-voting-pilot.sh` — 8/8 pass
- [ ] `bash scripts/security-audit-voting-pilot.sh` — 10/10 pass

## Participant data label

- [ ] Server confirmed to emit `"data_source": "human_participant"` for Phase C sessions
- [ ] Phase B artefacts (`"data_source": "internal_human_dry_run"`) confirmed unmodified

## Communication

- [ ] Participant ceiling agreed with executive (recommended: ≤ 30 for pilot)
- [ ] Opt-in recruitment message approved (no pressure language)
- [ ] Contact point for participant questions documented

---

**Sign-off required before Phase C launch:**

| Role | Name | Date |
|------|------|------|
| Principal researcher | | |
| Society executive approver | | |
| Ethics approval (if applicable) | | |
