# Simurgh Voting Pilot Paper Claim Audit

**Paper:** `Papers/simurgh-voting-pilot/main.tex`  
**Build:** 4 pages, 0 undefined citations, 0 undefined references  
**Baseline tag:** `v0.5.0-voting-pilot-phase-c-closeout`  
**Commit:** `f2803b4` (collection lock) / `c519040` (related work + PDF)  
**Audited:** 2026-06-04 (Australia/Sydney)

---

## Verdict

- [x] **Accurate** — all claims verified or corrected below
- [ ] Needs edits
- [ ] Not ready

Two issues found and fixed during this audit (see rows 4b and 6):

1. **Focus-loss/paste counts** — consent page disclosed these as potential collection
   categories; Phase C implemented only session timestamps + audit-chain events.
   Paper now distinguishes consent-page disclosure from Phase C implementation.
2. **Privacy audit scope** — clarified table entry to "PASS (code + evidence files)"
   to avoid implying the audit scanned 30 live Phase C session reports (in-memory
   store was cleared; audit scanned 52 pre-existing evidence files + code).

---

## Claim audit table

| #   | Paper claim                                                    | Status                   | Evidence                                                                                                                                                             | Notes                                                                                                      |
| --- | -------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Phase C had 31 consented sessions                              | ✅ Confirmed             | `PHASE_C_MEMBER_PILOT_CLOSEOUT.md` §Session counts                                                                                                                   | Exact count, no ambiguity                                                                                  |
| 2   | 30 submitted sessions in primary analysis                      | ✅ Confirmed             | `PHASE_C_MEMBER_PILOT_CLOSEOUT.md` §Session counts                                                                                                                   | Table 1 in paper matches                                                                                   |
| 3   | 1 withdrawn session excluded                                   | ✅ Confirmed             | `PHASE_C_MEMBER_PILOT_CLOSEOUT.md`; session `vp_4fcc741a` blocked with 403                                                                                           | Session ID documented                                                                                      |
| 4a  | `ballot_choice_recorded_by_simurgh: false` for all 30 sessions | ✅ Confirmed             | `evidence/phase-c-closeout/smoke-voting-pilot.txt` gate 2; code returns this field deterministically                                                                 | Behavioral guarantee, not per-session report                                                               |
| 4b  | Consent page disclosed focus-loss/paste counts as collected    | ✅ Fixed                 | Consent page HTML confirms disclosure; Phase C implemented only timestamps + audit-chain. Paper now distinguishes disclosure from implementation                     | **Was a claim gap — fixed in paper**                                                                       |
| 5   | No screen/webcam/typed/pasted/device data collected            | ✅ Confirmed             | `FORBIDDEN_BALLOT_FIELDS` server guard; `privacy-audit.mjs` PASS; `security-audit-voting-pilot.sh` 10/10; system design (no JS collects these in voting pilot pages) | Design-enforced, not policy-only                                                                           |
| 6   | Privacy audit PASS                                             | ✅ Confirmed (clarified) | `evidence/phase-c-closeout/privacy-audit.txt` — PASS (52 files); table entry updated to "PASS (code + evidence files)" to clarify scope                              | **Scope clarified in paper**                                                                               |
| 7   | UI closed after collection                                     | ✅ Confirmed             | `public/voting-pilot.html` — collection closed banner; no JS submission logic; `public/voting-pilot-submit.html` — same                                              | Visually and structurally closed                                                                           |
| 8   | Write endpoints return 410 when closed                         | ✅ Confirmed             | `evidence/phase-c-closeout/smoke-voting-pilot-closed.txt` — 5/5 pass; `src/votingPilot/index.js` `rejectIfClosed` middleware                                         | Server-side enforced, pre-auth                                                                             |
| 9   | Report route remains token-protected                           | ✅ Confirmed             | `evidence/phase-c-closeout/security-audit-voting-pilot.txt` gate S5: "report without token → 401"; gate S6: "cross-session report → 403"                             | Not locked to 410 under closure                                                                            |
| 10  | 359/359 tests pass                                             | ✅ Confirmed             | `evidence/phase-c-closeout/npm-test.txt` — `# pass 359 # fail 0`                                                                                                     | Pre-pilot file shows 357 (older baseline); Phase C closeout is 359                                         |
| 11  | 0 high/critical vulnerabilities                                | ✅ Confirmed             | `evidence/phase-c-closeout/npm-audit.txt` — no high/critical output (2 moderate, pre-existing)                                                                       | `--audit-level=high` clean                                                                                 |
| 12  | Privacy audit PASS                                             | ✅ Confirmed             | `evidence/phase-c-closeout/privacy-audit.txt` — PASS (52 evidence files scanned)                                                                                     | Scans evidence export files; Phase C sessions were in-memory                                               |
| 13  | Smoke gates 8/8 pass                                           | ✅ Confirmed             | `evidence/phase-c-closeout/smoke-voting-pilot.txt` — `8 passed, 0 failed`                                                                                            | Covers consent→submit→report→withdrawal flow                                                               |
| 14  | Security audit 10/10 pass                                      | ✅ Confirmed             | `evidence/phase-c-closeout/security-audit-voting-pilot.txt` — `10 passed, 0 failed`                                                                                  | Covers token, forbidden fields, withdrawal, privacy audit                                                  |
| 15  | Closure smoke 5/5 pass                                         | ✅ Confirmed             | `evidence/phase-c-closeout/smoke-voting-pilot-closed.txt` — `5 passed, 0 failed`                                                                                     | Confirms 410 on all write routes; report active                                                            |
| 16  | Paper does not claim public election security                  | ✅ Confirmed             | Abstract protective sentence; §Introduction scope note; §VII.C non-claims list; Related Work §II.B                                                                   | "voting-adjacent" framing used consistently                                                                |
| 17  | Executive approval obtained before Phase C                     | ✅ Confirmed             | `PHASE_C_EXECUTIVE_APPROVAL_REQUEST.md`; `PHASE_C_GO_NO_GO_CHECKLIST.md`                                                                                             | Paper cites "participant notice and data management addendum approved by the society executive" — accurate |
| 18  | No hardware attestation claimed                                | ✅ Confirmed             | §VII.C non-claims explicitly lists "Provide hardware-rooted attestation"                                                                                             | No daemon referenced in voting pilot path                                                                  |
| 19  | In-memory store — sessions not persisted                       | ✅ Confirmed             | §VI.B limitations; `src/votingPilot/consentStore.js` — Map-based in-memory store                                                                                     | Paper honestly discloses this limitation                                                                   |
| 20  | Official vote impact = 0                                       | ✅ Confirmed             | Shadow mode design; `report.official_vote_impact: false`; `evidence/phase-c-closeout/smoke-voting-pilot.txt` gate: "report official_vote_impact false"               | Not just a claim — structurally enforced                                                                   |

---

## High-risk claims — reviewer checklist

| Risk area                                 | Status   | Evidence path                                                                 |
| ----------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| "participant" / consent wording           | ✅       | `PHASE_C_PARTICIPANT_NOTICE.md`; `PHASE_C_EXECUTIVE_APPROVAL_REQUEST.md`      |
| "30 sessions" — must mention 31 consented | ✅       | Table 1 says 31 consented / 30 submitted / 1 withdrawn                        |
| "no ballot data"                          | ✅       | Code + smoke gate + privacy audit                                             |
| "daemon" in voting pilot                  | ✅       | Not mentioned in voting pilot context; non-claims note hardware attestation   |
| "voting security" language                | ✅       | "voting-adjacent" used consistently; protective abstract sentence added       |
| "ethics approval"                         | ✅       | Paper says "executive approval" only — accurate; no IRB/formal ethics claimed |
| "collection closed"                       | ✅       | Both UI and server-side; smoke suite confirms 410                             |
| "report protected"                        | ✅       | Security audit gate S5/S6 confirm token required                              |
| Focus-loss/paste claim gap                | ✅ Fixed | Paper now distinguishes consent disclosure from Phase C implementation        |
| Privacy audit scope                       | ✅ Fixed | Table entry clarified to "PASS (code + evidence files)"                       |

---

## Evidence file index

All gate evidence captured at `v0.5.0-voting-pilot-phase-c-closeout` and stored in:

```
docs/research/mq-voting-pilot/evidence/phase-c-closeout/
  EVIDENCE_README.txt
  npm-test.txt          — 359/359 pass, 0 fail
  npm-audit.txt         — 0 high/critical
  privacy-audit.txt     — PASS (52 files)
  smoke-voting-pilot.txt           — 8/8 pass
  security-audit-voting-pilot.txt  — 10/10 pass
  smoke-voting-pilot-closed.txt    — 5/5 pass
```

Pre-pilot evidence (Phase A/B baseline, 357 tests) is in:

```
docs/research/mq-voting-pilot/evidence/pre-pilot/
```

The 357→359 delta reflects two test additions during Phase C (voting pilot unit coverage). Phase C closeout evidence supersedes pre-pilot for all gate claims made in this paper.

---

## Audit outcome

All 20 claims verified. Two issues found and corrected in `main.tex`:

1. **Consent disclosure vs. implementation** (§III.A) — paper now explicitly
   distinguishes what the consent page disclosed from what Phase C implemented.
2. **Privacy audit table entry** (Table 2) — clarified as "PASS (code + evidence
   files)" to correctly represent audit scope.

PDF rebuilt after fixes: **4 pages, 0 undefined citations, 0 undefined references.**
