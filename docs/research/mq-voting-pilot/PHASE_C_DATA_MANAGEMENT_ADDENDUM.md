# Phase C Data Management Addendum — MQ Persian Society Voting Pilot

**Version:** 2026-06-v1
**Status:** Draft — supplements `DATA_MANAGEMENT_PLAN.md` for Phase C
**Prerequisite:** Ethics determination must be completed before this addendum is finalised

---

## Scope

This addendum extends `DATA_MANAGEMENT_PLAN.md` (Phase A/B) to cover Phase C real member participant data. In the event of any conflict, this addendum takes precedence for Phase C data.

---

## Data collected in Phase C

| Field | Description | Identifiable? |
|-------|-------------|--------------|
| `pilot_session_id` | Random UUID per session | No |
| `participant_code_hash` | HMAC-SHA256 of anonymous code | No |
| `consent_timestamp` | ISO-8601 UTC | No |
| `integrity_tier` | `browser_only` or `browser_plus_daemon` | No |
| `proof_status` | Pass / fail / partial | No |
| `focus_loss_count` | Integer | No |
| `paste_count` | Integer | No |
| `chain_valid` | Boolean | No |
| `run_at` | Submission timestamp | No |
| `data_source` | `human_participant` | No |

No field in this table is linked to name, student ID, email, or any persistent device identifier.

---

## Data NOT collected in Phase C

Ballot choice, candidate selection, screen content, webcam, audio, clipboard text, typed text, raw process names, window titles, device serial numbers, MAC addresses, IP addresses stored beyond the request lifecycle.

---

## Storage

**Phase C default:** Local development server only, consistent with Phase A/B.

**If remote storage is required:** Ethics approval must explicitly authorise the storage location, security controls, and access policy before any Phase C data is written outside the local machine.

---

## Retention

Phase C participant data will be retained for the duration of the approved research period. The retention end date must be recorded here before Phase C launches: `__________`

At retention end, data will be securely deleted and deletion recorded in `AGENT.md`.

---

## Access control

Phase C data is accessible to the principal researcher only. No third-party sharing without explicit ethics approval. No data transfer to society executives or election officials.

---

## De-identification

Participant codes are HMAC-SHA256 hashed with a server-side pepper. Raw codes are displayed once to participants and not stored anywhere by Simurgh. The hash cannot be reversed to recover the raw code.

---

## Data label

All Phase C session artefacts must carry:

```json
{
  "synthetic": false,
  "human_participant": true,
  "data_source": "human_participant"
}
```

This distinguishes Phase C data from:
- Phase A: `"synthetic": true`
- Phase B: `"data_source": "internal_human_dry_run"`

---

## Publication

If aggregate findings are to be published:

- Individual session data will not be included in any publication
- Only aggregate statistics will be reported
- Ethics approval for publication must be confirmed before submission
- All published data must be reviewed against this plan before release

---

## Breach response

If a data breach is identified:

1. Stop all Phase C data collection immediately
2. Assess scope of breach
3. Notify MQ Research Ethics Office if ethics approval was granted
4. Document incident in `AGENT.md`
5. Do not notify individual participants unless ethics office advises it

---

## Open items (must be resolved before Phase C go)

- [ ] Ethics determination completed and outcome recorded
- [ ] Retention end date set
- [ ] Storage location confirmed (local-only or ethics-approved remote)
- [ ] Breach response contacts confirmed
