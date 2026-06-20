# Stage 3N evidence pack

Metadata-only, regenerated deterministically by
`tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs`. No payloads, no
transcripts, no secrets.

| File | Contents |
|---|---|
| `source-index.json` | The five families and their frozen source files. |
| `metric-contract.v1.json` | Per-family denominator basis + pooling rules. |
| `normalised-metrics.json` | One normalised row per family (security/utility/attestation + `source_files`). |
| `held-line-ledger.json` | Held-line rows (committed fields only; no ghost baseline). |
| `per-family-panels.json` | One panel per family; no pooled total. |
| `denominator-pooling-report.json` | Pooling refusals; `cross_family_pooling_performed = 0`, `pooled_asr_reported = false`. |
| `claim-evidence-map.json` | The registered closed-world claim surface (verified + excluded). |
| `claim-consistency-report.json` | Compiler result: conflicts, completeness, prose-exclusion. |
| `stage3m-attestation-validation.json` | Stage 3M verifier PASS, hash-bound. |
| `evidence-hashes.json` | sha256 of every cited source file (4 families + 3 Stage 3M artifacts). |
| `generated-evidence-privacy-report.json` | Forbidden-token findings (must be 0). |
| `runner-output.txt` | Runner pass marker. |

To regenerate: `SIMURGH_RUN_STAGE3N=1 bash scripts/smoke-llm-shield-stage3n.sh`.
