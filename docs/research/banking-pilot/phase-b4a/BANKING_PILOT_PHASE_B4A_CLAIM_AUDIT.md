# Banking Shield Stage B4-A Claim Audit

## Purpose

Keeps B4-A wording aligned with the offline evidence. Prevents the AI privacy
firewall from being described as real banking intelligence.

## Claim Table

| Claim                                                | Evidence                                                                    | Allowed Status  |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| Narrative layer receives no sensitive banking fields | input firewall + `bankingAiExplain.test.js` (raw id absent) + privacy audit | Evidence-backed |
| No network egress                                    | no-egress static gate over four modules                                     | Evidence-backed |
| Narrative is deterministic                           | generator determinism test + `narrative_hash`                               | Evidence-backed |
| Affirmative-capability claims are blocked            | output firewall tests + rejected-claim fixture                              | Evidence-backed |
| Official policy result unchanged                     | official-result-unchanged check + tests                                     | Evidence-backed |
| Layer is default-off                                 | `isAiExplainEnabled` test + router 503 test + smoke                         | Evidence-backed |
| Withdrawn sessions are blocked                       | router 403 test + smoke                                                     | Evidence-backed |

## Disallowed Claims (must stay blocked)

Fraud detection, scam prevention, real banking protection, payment safety, real
payee verification, financial advice, CDR compliance, Confirmation of Payee
compliance, APRA compliance, AML/CTF compliance, reimbursement assessment,
malware detection, production readiness.

## Review Rule

Before any paper, README, PR, or closeout cites B4-A, compare wording against this
file. If a claim implies a real banking capability, rewrite it as a bounded
offline explanation claim.
