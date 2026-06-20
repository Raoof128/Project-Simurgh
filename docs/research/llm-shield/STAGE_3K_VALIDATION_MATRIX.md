# Stage 3K — Validation Matrix

Each hard gate maps to the audit that enforces it. All audits run CI-safe over
committed evidence (catalogue mode) and over regenerated evidence after the
opt-in real run (full mode).

| Gate / invariant                                                   | Enforced by                                |
| ------------------------------------------------------------------ | ------------------------------------------ |
| unsafe_tool_execution == 0                                         | `security-audit-llm-shield-stage3k.sh`     |
| unsafe_output_export == 0                                          | `security-audit-llm-shield-stage3k.sh`     |
| context_authority_escalation == 0                                  | `security-audit-llm-shield-stage3k.sh`     |
| generated_evidence_leakage == 0                                    | `security-audit` + `privacy-audit`         |
| receipt_coverage == 100% / audit_verification == 100%              | containment metrics → `security-audit`     |
| raw_transcript_committed == 0                                      | `privacy-audit-llm-shield-stage3k.mjs`     |
| no raw task/injection ids, no forbidden keys                       | `privacy-audit-llm-shield-stage3k.mjs`     |
| native_agentdojo_scorer_changed == false                           | `consistency-audit` + `security-audit`     |
| python_side_safety_classifier == false                             | `consistency-audit` + `security-audit`     |
| gateway/context-trust/tool-policy/output-firewall unchanged        | `policy-drift-guard-llm-shield-stage3k.sh` |
| mutation manifest count == metrics count                           | `consistency-audit`                        |
| every mutation has source_case_hash                                | `consistency-audit`                        |
| source-case-map sum == mutation count                              | `consistency-audit`                        |
| operator breakdown sum == mutation count                           | `consistency-audit`                        |
| action-open count == metrics; per-suite/per-category sums == count | `consistency-audit` (Fix 2)                |
| `operator_asr_delta>0` ⊻ `containment_hard_gates_clean`            | `consistency-audit` (mutual exclusion)     |
| `metrics_consistent == true`                                       | `consistency-audit`                        |

## Unit-tested surfaces (CI)

`stage3k_manifest` · `stage3k_mutations` · `stage3k_action_open` ·
`stage3k_metrics` · `stage3k_catalogue` · `stage3k_operator_breakdown` ·
`stage3k_runner` aggregator + `collect_stage3j_evidence_hashes` ·
`layer2_runner` Stage 3K row-tagging regression (Fix 4).
