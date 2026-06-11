# Banking Shield Phase B Protocol

## Stage

Stage B2 - Banking Shield Phase B Internal Dry Run.

## Status

Approved for protocol scaffolding only. The internal dry run may begin only after the go/no-go checklist is completed.

## Purpose

Phase B evaluates whether trusted internal testers can safely understand and complete the existing Banking Shield Phase A flow. It tests consent, warning, withdrawal, report, audit, and verification comprehension using fictional banking-adjacent scenarios only.

Phase B does not test real banking protection. It does not connect to banks, payment systems, CDR providers, Confirmation of Payee services, or financial institutions.

## Scope Lock

In scope:

- 2-3 trusted internal testers.
- Fictional scenarios from the Phase A runtime.
- Consent comprehension.
- Withdrawal comprehension.
- Report, audit, and verify comprehension.
- Non-claim comprehension.
- Aggregate-only feedback and closeout evidence.

Out of scope:

- Real bank integration.
- Real CDR.
- Real Confirmation of Payee.
- Real payment processing.
- Real accounts, balances, payees, transaction amounts, OTPs, credentials, screenshots, app names, process names, or window titles.
- Fraud detection, scam detection, financial advice, reimbursement assessment, APRA/CDR/AML compliance, or production-readiness claims.
- Phase C routes, states, or participant-pilot logic.

## Runtime

Phase B uses the existing Phase A `/api/banking-pilot` runtime unchanged. No Phase B API routes, server state, persistence, or human-pilot mode are added in this stage.

## Tester Flow

Each tester completes:

1. Read the participant notice.
2. Confirm they understand fictional-only participation.
3. Confirm they must not enter real banking data.
4. Accept consent in the Banking Shield flow.
5. Complete each of the five fictional scenarios.
6. Open a report.
7. Open the audit export.
8. Open the verify export.
9. Complete one withdrawal path.
10. Fill the feedback form using no real banking details.
11. Confirm they did not enter real banking data.

## Evidence Labels

Phase B evidence uses:

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

`synthetic: false` records that humans interacted with the prototype. It does not indicate real banking data.

## Success Criteria

Phase B passes only if:

- 2-3 trusted testers complete the run.
- No tester enters real banking data.
- No sensitive value appears in evidence.
- No forbidden banking payload appears in reports, audits, generated evidence, or Sonnet fixtures.
- Reports keep all sensitive collection assertions as `false`.
- Testers understand this is not real banking security.
- Testers understand no fraud finding is produced.
- Testers understand withdrawal, report, audit, and verify behavior.
- Privacy audit passes on Phase B evidence.
- Existing Phase A banking gates still pass.
- Closeout is completed with aggregate-only results.

## Stop Conditions

Stop the dry run immediately if:

- A tester attempts to enter real banking data.
- A tester misunderstands the prototype as fraud detection, scam prevention, financial advice, or real banking security.
- Evidence captures per-tester sensitive free text.
- Any report, audit, verify, generated evidence, or Sonnet fixture contains forbidden banking values or payload structures.
- Any Phase A banking smoke, security, privacy, closure, or full E2E gate fails for a Banking Shield reason.

## Non-Claims

Phase B may support this wording:

> Phase A established automated structural privacy and integrity gates. Phase B then evaluated the consent, warning, withdrawal, report, audit, and verification workflow with trusted internal participants using fictional banking-adjacent scenarios only.

Phase B must not claim fraud detection, scam prevention, real banking protection, payment safety, financial advice, APRA/CDR/AML compliance, Confirmation of Payee compliance, reimbursement assessment, malware detection, or production readiness.
