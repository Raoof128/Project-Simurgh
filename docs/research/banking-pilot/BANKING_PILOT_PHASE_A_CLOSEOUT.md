# Banking Shield Phase A Closeout

## Status

Closed with Phase A synthetic evidence captured.

## Scope

Stage B1 Phase A implements synthetic-only banking-adjacent scenarios, server-side privacy guards, HMAC audit evidence, report exports, closure gates, and Phase A documentation.

## Acceptance Criteria

- Mock CDR scenario works.
- Mock CoP scenario works.
- Remote-access warning works.
- Payment pause works.
- AI-agent finance approval works.
- Forbidden banking fields are rejected recursively.
- Unknown extra fields are rejected.
- Structural pollution keys are rejected.
- Weak consent scope hashes are rejected.
- One session cannot submit more than one scenario.
- Sonnet support is optional/off by default and sanitisation is tested.
- HMAC audit chain verifies.
- Reports emit all sensitive collection assertions as false.
- Withdrawn sessions cannot export reports.
- Withdrawn sessions keep audit and verify exports for transparency.
- Closure returns 410 before auth on write routes.
- Over-deep payloads are rejected with `payload_too_deep`.
- Prior forbidden-field attempts escalate risk on a later valid submit.
- Consent, write, and read routes carry per-IP rate limits; consent enforces an in-memory session capacity cap.
- Participant-code hashing and audit-chain signing use separate keys derived from the pepper with distinct labels.
- Missing pepper/token-secret configuration returns a deterministic 503 `banking_pilot_not_configured` instead of a generic 500.
- Evidence pack is archived.

## Evidence Index

Evidence files are stored under `docs/research/banking-pilot/evidence/phase-a-synthetic/`.

- `npm-test.txt`: `npm test` passed 389/389 tests.
- `banking-unit-security.txt`: Banking Shield unit/security tests passed 35/35 tests.
- `npm-audit.txt`: `npm audit --audit-level=high` returned no high-severity findings. The captured audit lists 2 moderate `qs`/Express-chain advisories.
- `privacy-audit-banking-pilot.txt`: PASS, 4 generated fixtures scanned, attack values absent, public demo pages use fictional labels only.
- `smoke-banking-pilot.txt`: 14/14 smoke gates passed.
- `smoke-banking-pilot-full-e2e.txt`: full lifecycle E2E smoke passed 41/41 gates, including public pages, five scenarios, rejection paths, risk escalation after a forbidden attempt, over-deep payload rejection, audit/report/verify, withdrawn-session audit/verify transparency, closure mode, Sonnet sanitisation, and generated evidence fixture checks.
- `security-audit-banking-pilot.txt`: 27/27 security gates passed.
- `sonnet-sanitisation-audit.txt`: narrative sanitiser unit test passed.
- `smoke-banking-pilot-closed.txt`: 4/4 closure gates passed.
- `accepted-report-fixture.json`: accepted report fixture.
- `rejected-attempt-audit-fixture.json`: rejected-attempt audit fixture.
- `sonnet-sanitised-payload-fixture.json`: metadata-only Sonnet payload fixture.
- `closure-response-fixture.json`: closure response fixture.

## Phase A Result

Stage B1 Phase A demonstrates metadata-only synthetic session evidence with recursive rejection of sensitive banking-adjacent fields, one-session-one-submit semantics, HMAC audit verification, closure-before-auth behavior, and default-off Sonnet runtime support.

## Local Gate Notes

The final full Banking Shield Phase A E2E smoke passed 41/41 gates and is wired into `scripts/check.sh` (both the full run and `--quick`).

Fresh local `scripts/check.sh` passed all Banking Shield Phase A gates. The full command still exits 1 on two existing local prerequisite gates outside Banking Shield: installed .NET SDK 7.0.307 cannot target the Windows daemon `.NET 8.0` projects, and local Linux Xvfb integration tests fail in `xvfb_integration_tests.rs` with `Connection refused`/`PoisonError` results.

## Non-Claims

Phase A is not fraud detection, banking security, payment processing, CDR, Confirmation of Payee, APRA compliance, financial advice, reimbursement assessment, or malware detection.
