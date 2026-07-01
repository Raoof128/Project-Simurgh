# Stage 4H Validation Matrix

| Gate | Claim                                                         | First-failing evidence                                               |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Q0   | Clean disconnected-untrusted certificate is accepted          | raw `0`                                                              |
| Q1   | Explicit-flow derivation is independently re-derived          | raw `24` or `26` for forged or stripped derivations                  |
| Q2   | Premise digest binds replay material                          | raw `22`                                                             |
| Q3   | Checker path is offline-hermetic at process/interpreter level | clean hits `0`, egress double raw `28`                               |
| Q4   | Dirty one-edge delta falsifies forged-safe claims             | raw `22`, `24`, or `26` by arm                                       |
| Q5   | Manifest and certificate binding is load-bearing              | raw `25`                                                             |
| Q6   | Single-delta tamper closure rejects every mutation arm        | `tampered_accepted_count: 0`                                         |
| Q7   | Privacy export is bounded and typed                           | raw `27` for value smuggling, raw `20` for schema-owned unknown keys |

## Reviewer-Reproducible Outputs

The closeout evidence set is `offline-report.json`, `hermeticity-attestation.json`, `exit-map.json`, `q-gate-results.json`, `tamper-results.json`, `privacy-report.json`, `verifier-results.json`, and `reproduce-summary.json`.

## Boundaries

This matrix is not kernel sandboxing, not model safety, not execution truth, not implicit-flow security, and not multi-field collusion closure.
