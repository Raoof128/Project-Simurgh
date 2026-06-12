# Banking Shield Phase B Internal Dry Run Evidence

This folder is reserved for Stage B2 Phase B aggregate evidence.

Phase B is an internal human dry run using fictional banking-adjacent scenarios only. It does not collect real banking data and does not add real banking capability.

## Allowed Files

- Aggregate results.
- Aggregate feedback category counts.
- Privacy-audit output.
- Smoke-gate output.
- Closeout summary.

## Prohibited Content

Do not store:

- Raw tester request payloads.
- Per-tester sensitive free text.
- Real account numbers, BSBs, card numbers, OTPs, credentials, balances, payees, transaction amounts, payment references, screenshots, screen recordings, app names, process names, or window titles.
- Real bank branding from tester context.
- Sonnet payloads containing sensitive banking fields or values.

## Metadata Contract

All completed evidence must preserve:

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

`synthetic: false` means humans interacted with the prototype. It does not mean the banking scenario data is real.

## Current Status

The dry run has been executed. `aggregate-results.json` and `participant-feedback.json` hold the completed aggregate-only results (5 trusted internal testers, 30 total sessions, 25 submitted scenario sessions, 5 withdrawal sessions, plus a focused copy-validation rerun of 3 fresh sessions). The `*-template.json` files remain as the empty templates for reference. No raw tester free text is retained.
