# Stage 3N — Threat Model

Stage 3N is a derived-evidence / claim-governance stage. Its threat model is about
the **integrity of the analysis and the claims**, not about stopping attacks.

## In scope (with mitigating gate)

| Threat | Mitigation |
|---|---|
| Misreporting a source metric | claim compiler field-equality (`unresolved_numeric_claim_conflicts = 0`) |
| Ghost baseline / prose-only number leaking into a claim | closed-world rule (`prose_only_metric_claims_excluded`, `claim_evidence_map_complete`) |
| Denominator pooling to mask weakness | metric-contract gate + `denominator-pooling-report.json` (`cross_family_pooling_performed = 0`) |
| Over-reading static zero-ASR as blanket robustness | non-claims + `frontier_status = not_applicable_degenerate` |
| Evidence leakage in generated summaries | privacy audit (`generated_evidence_leakage = 0`) |
| Overclaim wording in docs | security audit overclaim grep (`overclaim_wording_detected = 0`) |
| Silent guard drift hidden in a measurement PR | policy-drift guard (`src_llmShield_policy_drift = 0`) |
| Tampered source evidence | `evidence-hashes.json` binds every cited file; attestation row hash-bound to the three 3M artifacts |

## Out of scope

- New attack generation.
- New guard tuning or any `src/llmShield` change.
- Live provider safety.
- AgentDyn (or any external benchmark) live execution.
- Robustness across all settings.
- External-system comparison (comparator row reserved, not populated).
- Content-harm / refusal classification.

## Trust boundaries

- The HMAC audit chain remains an **internal** tamper-evidence mechanism.
- The Stage 3M Ed25519 signature is the **external** layer; 3N re-verifies it and
  records PASS, but treats it as integrity/authorship evidence, not proof the
  underlying system was truthful.
- 3N's claim compiler is **closed-world over its own registered surface only**: the
  union of generated ledger rows, per-family panel claims, denominator-pooling
  report claims, and the registered historical conflict claim. It does not police
  arbitrary prose elsewhere in the repository.
