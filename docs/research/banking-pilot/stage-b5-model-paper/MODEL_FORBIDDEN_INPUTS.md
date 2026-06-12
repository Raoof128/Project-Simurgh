# Stage B5 — Forbidden Model Inputs

The model must NEVER receive, request, or reconstruct:

## Forbidden inputs

1. Real banking data of any kind (credentials, OTPs, account identifiers,
   balances, payees, payment amounts, transaction text, statements).
2. Raw tester free text, screenshots, identities, or any per-participant Phase B
   record (aggregate-only evidence is the boundary).
3. Secrets: peppers, token signing keys, HMAC keys, environment variable values.
4. Raw audit-chain signatures or anything that could let the model "verify" the
   chain (verification is a CI job, not a model task).
5. Device/proctoring telemetry of any kind (window titles, process names,
   screenshots, keystrokes) — Banking Shield does not collect these, and the
   model must not be primed as if it did.
6. Any non-public personal information about the researcher or testers.

## Forbidden output claims (flag, never strengthen)

```text
Fraud detection
Scam prevention
Real banking protection
Payment safety
Real payee verification
Financial advice
CDR / APRA / AML / CTF compliance
Production readiness
Bank-grade security
```

## Enforcement

- The input pack is the only factual source; passes citing facts outside it are
  scored REJECTED in the response log.
- The claim prosecutor pass (02) and the final claim audit re-scan every model
  artifact for the forbidden-claim list above.
- The same forbidden-claim boundary is enforced at runtime by the B4-A output
  claim firewall — the paper pipeline mirrors the system's own discipline.
