# Banking Shield Phase B Go/No-Go Checklist

## Status

Use this checklist before any trusted tester starts the internal dry run.

## Governance

- [ ] Phase B protocol reviewed.
- [ ] Scope lock reviewed.
- [ ] 2-3 trusted internal testers selected.
- [ ] Testers are told the dry run is voluntary.
- [ ] Testers are told they may stop at any time.
- [ ] Testers are told not to enter real banking data.

## Runtime Readiness

- [ ] Existing Phase A `/api/banking-pilot` runtime is used unchanged.
- [ ] No Phase B routes are enabled.
- [ ] No Phase C routes are enabled.
- [ ] No real bank integration exists.
- [ ] No real CDR, Confirmation of Payee, or payment-processing integration exists.
- [ ] Sonnet support remains optional and off by default.
- [ ] Local deterministic banking risk policy remains the official result.

## Privacy Readiness

- [ ] Participant notice reviewed with each tester.
- [ ] Feedback form excludes real banking details and per-tester sensitive free text.
- [ ] Evidence folder is aggregate-only.
- [ ] Phase B privacy audit passes before the dry run.
- [ ] Existing Phase A privacy audit passes.
- [ ] Existing security audit passes.

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
- [ ] No-go: at least one stop condition was triggered.

Decision date:

Decision owner:
