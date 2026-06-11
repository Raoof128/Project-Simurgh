# Banking Shield Phase B Internal Dry Run Design

## Stage

Stage B2 - Banking Shield Phase B Internal Dry Run.

## Goal

Evaluate whether trusted internal participants can understand and complete the Banking Shield consent, warning, withdrawal, report, audit, and verification flow using fictional banking-adjacent scenarios only, without entering real banking data or misunderstanding the prototype as fraud detection, financial advice, or real banking security.

Phase A proved the machine-side privacy and integrity pattern. Phase B tests human comprehension of that pattern.

## Scope Lock

Phase B is an internal human dry run. It does not add real banking features.

In scope:

- 2-3 trusted internal testers.
- Fictional banking-adjacent scenarios only.
- Consent comprehension.
- Withdrawal comprehension.
- Report, audit, and verify comprehension.
- Non-claim comprehension.
- Feedback-form collection using aggregate-only templates.
- Phase B evidence folder.
- Privacy audit coverage for Phase B evidence.
- Phase B closeout scaffold.

Out of scope:

- Phase C implementation.
- New Phase B API routes or server states.
- Real bank integration.
- Real CDR integration.
- Real Confirmation of Payee integration.
- Real payment processing.
- Real account, balance, payee, transaction, OTP, credential, screenshot, process, window, or app data.
- Fraud detection, scam detection, financial advice, reimbursement, APRA/CDR/AML compliance, or production-readiness claims.

## Architecture

Phase B uses the existing Phase A runtime unchanged. The dry run is governed by documents, a tester runbook, safe evidence templates, and a Phase B privacy-audit path.

No `phase_b` route, server state, persistence layer, human-pilot flag, or real-data mode is introduced. Accepted runtime state remains the Phase A metadata-only state. Phase B evidence is stored only as aggregate templates or manually completed aggregate summaries under `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/`.

## Data Contract

Phase B evidence labels must use:

```json
{
  "phase": "phase_b_internal_dry_run",
  "synthetic": false,
  "human_participant": true,
  "data_source": "internal_human_dry_run",
  "real_banking_data_collected": false,
  "real_financial_decision_affected": false,
  "aggregate_only": true
}
```

`synthetic: false` means humans interacted with the prototype. It does not mean the banking data is real. Scenario content remains fictional.

Evidence may contain:

- Aggregate tester counts.
- Aggregate comprehension outcomes.
- Aggregate feedback categories.
- Gate-command results.
- Metadata labels above.
- Confirmation that no real banking data was entered.

Evidence must not contain:

- Real account numbers, BSBs, card numbers, OTPs, credentials, bank login IDs, balances, payees, transaction amounts, payment references, transaction text, screenshots, screen recordings, raw process names, raw window titles, or remote-access app names.
- Per-tester sensitive free text.
- Raw submitted payload bodies.
- Any report, audit, or Sonnet narrative payload that contains forbidden banking structures or sensitive values.

## Privacy Audit Design

The Phase B privacy audit must reuse the Phase A distinction:

- Allow forbidden field names in guard modules, docs explaining the privacy contract, tests, and audit scripts.
- Fail on forbidden payload structures or sensitive values in persisted/generated evidence, reports, audit payloads, generated session data, and Sonnet narrative payload fixtures.

The audit must scan the Phase B evidence folder and fail if it finds high-risk banking values or forbidden payload structures. It must not fail merely because the protocol documents explain which fields are forbidden.

## Tester Flow

Each trusted tester should:

1. Read the Phase B participant notice.
2. Confirm fictional-only participation and non-claims.
3. Accept consent in the existing Banking Shield Phase A flow.
4. Complete all five fictional scenarios.
5. Open the report.
6. Open the audit export.
7. Open the verification export.
8. Complete one withdrawal path.
9. Complete the Phase B feedback form.
10. Confirm they did not enter real banking data.

## Success Criteria

Phase B passes only if:

- 2-3 trusted testers complete the dry run.
- 0 real banking values are entered or retained.
- 0 sensitive values appear in evidence.
- 0 forbidden payloads appear in reports, audits, generated evidence, or Sonnet fixtures.
- Reports keep all sensitive collection assertions as `false`.
- Testers understand this is not real banking security.
- Testers understand no fraud finding is produced.
- Testers understand withdrawal, report, audit, and verify behavior.
- Phase B privacy audit passes.
- Existing Phase A banking smoke, security, privacy, closure, and full E2E gates still pass.
- Phase B closeout document is completed after the dry run.

## Required Artifacts

Create:

- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PROTOCOL.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_GO_NO_GO_CHECKLIST.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_PARTICIPANT_NOTICE.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_FEEDBACK_FORM.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_DATA_MANAGEMENT_ADDENDUM.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_TESTER_RUNBOOK.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLOSEOUT.md`
- `docs/research/banking-pilot/phase-b/BANKING_PILOT_PHASE_B_CLAIM_AUDIT.md`
- `docs/research/banking-pilot/evidence/phase-b-internal-dry-run/README.md`
- Aggregate-only Phase B evidence templates.

Add `scripts/privacy-audit-banking-pilot-phase-b.mjs` only if the existing Phase A privacy audit does not scan the Phase B evidence folder cleanly.

## Commit Stages

1. Design spec.
2. Implementation plan.
3. Phase B protocol and evidence scaffolding.
4. Phase B privacy-audit support and check wiring if needed.
5. Verification evidence and repo continuity logs.

## Non-Claims

Phase B may support this paper-safe wording:

> Phase A established automated structural privacy and integrity gates. Phase B then evaluated the consent, warning, withdrawal, report, audit, and verification workflow with trusted internal participants using fictional banking-adjacent scenarios only.

Phase B must not claim fraud detection, real banking protection, scam prevention, real CDR compliance, Confirmation of Payee compliance, financial advice, reimbursement assessment, APRA compliance, AML compliance, malware detection, or production readiness.
