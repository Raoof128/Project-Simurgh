# Stage 3N — Validation Matrix

Each hard gate → the script/test that enforces it → the evidence file that records it.

| Hard gate                                                 | Enforced by                                                | Recorded in                                                |
| --------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `source_index_valid`                                      | runner                                                     | `source-index.json`                                        |
| `metric_contract_schema_valid`                            | `stage3nClaimLedgerLib.test.js` (METRIC_CONTRACT) + runner | `metric-contract.v1.json`                                  |
| `normalised_metrics_schema_valid`                         | `normaliseSources` test + runner                           | `normalised-metrics.json`                                  |
| `all_ledger_rows_hash_to_committed_evidence`              | `computeLedgerHashBinding` test + runner                   | `held-line-ledger.json`, `evidence-hashes.json`            |
| `prose_only_metric_claims_excluded`                       | `compileClaims` test (prose-not-excluded case)             | `claim-consistency-report.json`                            |
| `claim_evidence_map_complete`                             | `compileClaims` test (unrecognised-status case)            | `claim-evidence-map.json`, `claim-consistency-report.json` |
| `claim_consistency_report_generated`                      | runner                                                     | `claim-consistency-report.json`                            |
| `unresolved_numeric_claim_conflicts = 0`                  | `compileClaims` test (drifted-number case)                 | `claim-consistency-report.json`                            |
| `cross_family_pooling_performed = 0`                      | `evaluatePooling` test + consistency audit                 | `denominator-pooling-report.json`                          |
| `mismatched_denominator_pooling_refusal_test_passed`      | `evaluatePooling` test                                     | `denominator-pooling-report.json`                          |
| `pooled_asr_reported = false`                             | security audit                                             | `denominator-pooling-report.json`                          |
| `per_family_panels_present`                               | `buildPerFamilyPanels` test + runner                       | `per-family-panels.json`                                   |
| `frontier_status ∈ {computed, not_applicable_degenerate}` | `enforceStage3nHardGates` test                             | runner gate inputs                                         |
| `frontier_reason_recorded`                                | runner                                                     | `LLM_SHIELD_STAGE_3N_*` writeup (frontier section)         |
| `stage3m_attestation_validation_present`                  | runner (re-runs 3M verifier)                               | `stage3m-attestation-validation.json`                      |
| `source_evidence_hashes_match`                            | runner default-mode verify                                 | `evidence-hashes.json`                                     |
| `generated_evidence_leakage = 0`                          | privacy audit + runner self-check                          | `generated-evidence-privacy-report.json`                   |
| `src_llmShield_policy_drift = 0`                          | `policy-drift-guard-llm-shield-stage3n.sh`                 | n/a (diff guard)                                           |
| `overclaim_wording_detected = 0`                          | `security-audit-llm-shield-stage3n.sh`                     | n/a (grep guard)                                           |

Default-mode runner re-verifies **every** generated JSON artifact against
recomputation (review fix 2), so drift in any file fails the smoke.
