# Banking Shield Phase B Go/No-Go Checklist

## Status

Use this checklist before any trusted tester starts the internal dry run.

## Stage B3 Pre-Tester Readiness

Readiness date: 2026-06-12 Australia/Sydney.

Readiness owner: Raouf.

Current decision: `no_go_pending_tester_selection`.

Reason: Runtime, privacy, and evidence scaffolding can be checked now. Human dry-run execution cannot start until 2-3 trusted internal testers are selected, the participant notice is shown to each tester, and each tester confirms the comprehension gates below.

## Governance

- [x] Phase B protocol reviewed.
- [x] Scope lock reviewed.
- [ ] 2-3 trusted internal testers selected.
- [ ] Testers are told the dry run is voluntary.
- [ ] Testers are told they may stop at any time.
- [ ] Testers are told not to enter real banking data.

## Runtime Readiness

- [x] Existing Phase A `/api/banking-pilot` runtime is used unchanged.
- [x] No Phase B routes are enabled.
- [x] No Phase C routes are enabled.
- [x] No real bank integration exists.
- [x] No real CDR, Confirmation of Payee, or payment-processing integration exists.
- [x] Sonnet support remains optional and off by default.
- [x] Local deterministic banking risk policy remains the official result.

## Privacy Readiness

- [ ] Participant notice reviewed with each tester.
- [x] Feedback form excludes real banking details and per-tester sensitive free text.
- [x] Evidence folder is aggregate-only.
- [x] Phase B privacy audit passes before the dry run.
- [x] Existing Phase A privacy audit passes.
- [x] Existing security audit passes.

## Tester Comprehension Gates

Each tester must confirm:

- [ ] The scenarios are fictional.
- [ ] They must not enter real banking data.
- [ ] The prototype does not connect to banks.
- [ ] The prototype does not detect fraud.
- [ ] The prototype does not provide financial advice.
- [ ] The prototype does not process payments.
- [ ] Reports are prototype evidence, not financial determinations.
- [ ] Audit and verify exports show integrity metadata, not banking truth.
- [ ] Withdrawal blocks report export for that session.

## Stop Conditions

Mark no-go if any item is true:

- [ ] A tester wants to use real banking information.
- [ ] A tester asks whether the prototype can confirm a real payment or payee.
- [ ] A tester believes a warning means fraud was detected.
- [ ] A tester enters or attempts to enter sensitive banking values.
- [ ] Any evidence file contains sensitive values.
- [ ] Any Banking Shield privacy/security gate fails.

## Final Decision

- [ ] Go: all readiness and comprehension checks passed.
- [x] No-go: tester selection and tester comprehension confirmations are still pending.

Decision date: 2026-06-12 Australia/Sydney.

Decision owner: Raouf.
