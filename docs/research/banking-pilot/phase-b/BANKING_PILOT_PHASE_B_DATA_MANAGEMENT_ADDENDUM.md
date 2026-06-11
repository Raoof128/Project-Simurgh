# Banking Shield Phase B Data Management Addendum

## Purpose

This addendum extends the Phase A data-management posture for the internal human dry run.

## Data Source

Phase B data source is `internal_human_dry_run`. Testers are trusted internal participants using fictional banking-adjacent scenarios.

## Allowed Evidence

Allowed Phase B evidence:

- Aggregate tester count.
- Aggregate scenario completion count.
- Aggregate comprehension counts.
- Aggregate feedback-category counts.
- Gate-command outputs.
- Closeout summary.
- Metadata labels documenting that no real banking data was collected.

## Prohibited Evidence

Phase B evidence must not contain:

- Real account numbers, BSBs, card numbers, OTPs, credentials, balances, payees, transaction amounts, payment references, transaction text, screenshots, screen recordings, app names, process names, or window titles.
- Raw request payloads.
- Per-tester sensitive free text.
- Real bank branding or real bank names from tester context.
- Sonnet narrative payloads containing sensitive banking fields or values.

## Storage

Phase B evidence is stored under:

`docs/research/banking-pilot/evidence/phase-b-internal-dry-run/`

Only aggregate templates and aggregate closeout evidence belong in that folder.

## Retention

Phase B dry-run evidence is retained as aggregate research evidence only. If a sensitive value is discovered, remove it from evidence, invalidate the affected closeout, document the incident, and rerun privacy/security gates before continuing.

## Audit

Run both:

```bash
node scripts/privacy-audit-banking-pilot.mjs
node scripts/privacy-audit-banking-pilot-phase-b.mjs
```

The Phase B privacy audit scans generated Phase B evidence. It permits forbidden field names in privacy-contract docs and tests, but fails sensitive values or forbidden payload structures in evidence artifacts.
