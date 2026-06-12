# Banking Shield Phase B Claim Audit

## Purpose

This audit keeps Phase B wording aligned with the internal dry-run evidence. It prevents the dry run from being described as real banking security.

## Claim Table

| Claim                                                                          | Evidence Needed                                 | Allowed Status                                           |
| ------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------- |
| Phase B used trusted internal testers                                          | Completed closeout aggregate count              | Evidence-backed (5 testers)                              |
| Phase B used fictional banking-adjacent scenarios only                         | Participant notice, runbook, aggregate closeout | Evidence-backed                                          |
| Phase B evaluated consent comprehension                                        | Feedback aggregate                              | Evidence-backed (consent clear 5/5)                      |
| Phase B evaluated warning comprehension                                        | Feedback aggregate                              | Evidence-backed (clear 4/5, partly 1/5)                  |
| Phase B evaluated withdrawal comprehension                                     | Feedback aggregate                              | Evidence-backed (withdrawal clear 5/5)                   |
| Phase B evaluated report/audit/verify comprehension                            | Feedback aggregate                              | Evidence-backed (partly pre-patch; 3/3 clear post-patch) |
| Phase B collected no real banking data                                         | Tester confirmation, privacy audit, closeout    | Evidence-backed (0 sensitive values)                     |
| Phase B reports kept sensitive assertions false                                | Report checks, closeout                         | Evidence-backed                                          |
| Phase B privacy audit passed                                                   | `privacy-audit-phase-b.txt`                     | Evidence-backed (PASS over 8 files)                      |
| Phase B main improvement was export-page interpretability, not privacy failure | Feedback aggregate, copy-validation rerun       | Evidence-backed                                          |

## Disallowed Claims

Phase B must not claim:

- Fraud detection.
- Scam prevention.
- Real banking protection.
- Payment safety.
- Real payee verification.
- CDR compliance.
- Confirmation of Payee compliance.
- APRA compliance.
- AML/CTF compliance.
- Financial advice.
- Reimbursement assessment.
- Malware detection.
- Production readiness.

## Review Rule

Before any paper, README, PR, or closeout wording cites Phase B, compare the wording against this file. If the claim implies a real banking capability, rewrite it as a comprehension dry-run claim.
