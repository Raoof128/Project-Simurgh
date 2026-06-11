# Banking Shield Phase A Claim Audit

## Status

Closed with Phase A synthetic evidence captured.

## Claim Table

| Claim                                      | Evidence                                           | Status    |
| ------------------------------------------ | -------------------------------------------------- | --------- |
| Phase A is synthetic-only                  | Protocol, report labels, evidence fixtures         | Confirmed |
| No real bank integration exists            | Source review and non-claims                       | Confirmed |
| Five synthetic scenarios submit            | `smoke-banking-pilot.txt`, full E2E smoke          | Confirmed |
| Forbidden fields are rejected recursively  | Unit/security evidence                             | Confirmed |
| Unknown fields are rejected                | Unit/router/security evidence                      | Confirmed |
| Structural pollution keys are rejected     | Unit/router/security evidence                      | Confirmed |
| Weak consent scope hashes are rejected     | Unit/security evidence                             | Confirmed |
| Local risk policy is official result       | Risk tests and report output                       | Confirmed |
| Sonnet is optional/off by default          | Env docs, sanitiser tests                          | Confirmed |
| Reports emit sensitive assertions as false | Report tests and `accepted-report-fixture.json`    | Confirmed |
| Audit chain verifies                       | Report/verify tests and smoke evidence             | Confirmed |
| Closure returns 410 before auth            | Closure tests and `smoke-banking-pilot-closed.txt` | Confirmed |
| Generated evidence has no sensitive values | `privacy-audit-banking-pilot.txt`                  | Confirmed |
| Complete public/API lifecycle E2E is gated | `smoke-banking-pilot-full-e2e.txt`                 | Confirmed |

## Known Attack Values

The privacy audit must reject generated evidence containing:

- `111111`
- `123456`
- `4111111111111111`
- `VerySecretOtp`
- `MockSensitivePayee`

## Verdict

Accurate for Phase A synthetic-only claims.
