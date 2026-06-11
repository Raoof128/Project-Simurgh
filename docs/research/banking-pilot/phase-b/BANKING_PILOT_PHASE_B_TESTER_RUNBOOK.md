# Banking Shield Phase B Tester Runbook

## Operator Setup

1. Confirm the go/no-go checklist is complete.
2. Start the existing local Banking Shield runtime.
3. Open the public consent page.
4. Keep the participant notice visible.
5. Remind the tester to use fictional categories only.

## Tester Script

Read to the tester:

> This is a fictional internal dry run. Do not enter real banking data. The prototype does not connect to banks, detect fraud, prevent scams, process payments, or provide financial advice. We are testing whether the consent, warning, withdrawal, report, audit, and verify flow is understandable.

## Dry-Run Steps

For each tester:

1. Ask them to read and confirm the participant notice.
2. Ask them to accept consent.
3. Ask them to complete `mock_cdr_consent`.
4. Ask them to complete `mock_confirmation_of_payee`.
5. Ask them to complete `remote_access_warning`.
6. Ask them to complete `mock_payment_pause`.
7. Ask them to complete `mock_ai_agent_finance_action`.
8. Ask them to open one report.
9. Ask them to open audit and verify exports.
10. Ask them to withdraw one session.
11. Ask them to complete the feedback form.
12. Ask them to confirm no real banking data was entered.

Use five fresh sessions for the five submitted scenarios, plus one separate fresh session for the withdrawal path. Do not attempt withdrawal on a session already used for a submitted scenario.

## Operator Checks

After each tester:

- Confirm no real banking data was entered.
- Confirm no free-text sensitive value was copied into evidence.
- Confirm report privacy assertions remain false.
- Record aggregate counts only.

## Stop Protocol

Stop immediately if the tester:

- Enters real banking data.
- Wants to use real bank details.
- Treats a warning as a fraud determination.
- Treats the report as financial advice.
- Is unsure whether the prototype connects to banks.

If stopped, do not retain sensitive content. Record only that a stop condition occurred and rerun privacy audit after cleanup.
