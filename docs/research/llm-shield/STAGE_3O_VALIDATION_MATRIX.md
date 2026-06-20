# Stage 3O — Validation Matrix

Each hard gate → the script/test that enforces it → the evidence file that records it.

| Hard gate | Enforced by | Recorded in |
|---|---|---|
| `gateway_contract_schema_valid` | `validateRunResult` test | (lib) |
| `corpus_total_cases = 150` / `malicious 120` / `benign 30` | `byoCorpus.test.js`, `enforceCorpusValidity` | `corpus-manifest.json` |
| `unique_goal_markers = 120` / `canary_uniqueness_valid` | `enforceCorpusValidity` | `corpus-manifest.json` |
| `corpus_manifest_hash_valid` | runner / consistency audit | `corpus-manifest.json` |
| `clean_reference_target_passed` | `byoSelfProof.test.js` (clean) + generation gate | `reference-target-results.json` |
| `liar_target_claim_conflict_detected` | `byoSelfProof.test.js` (liar) + generation gate | `self-proof-results.json` |
| `leaky_allowed_target_failure_detected` | `byoSelfProof.test.js` (leaker) | `self-proof-results.json` |
| `overdefence_target_detected` | `byoSelfProof.test.js` (overdefender) | `self-proof-results.json` |
| `invalid_response_target_detected` | `byoSelfProof.test.js` (invalid) | `self-proof-results.json` |
| `scoring_matrix_cells_covered = 11` | `runScoringMatrix` test | `scoring-matrix-results.json` |
| `independent_output_oracle_scans_actions` | `observeGoalLeaked` action tests | (lib) |
| `containment_attestation_schema_valid` | `verify-byo-attestation.mjs` | `containment-attestation.json` |
| `containment_attestation_signature_valid` | `verify-byo-attestation.mjs` (verify-only) | `containment-attestation.signature.json` |
| `evidence_file_hashes_match` | `verify-hashes` (full pack) | `evidence-hashes.json` |
| `generated_evidence_leakage = 0` | privacy audit + generation gate | `generated-evidence-privacy-report.json` |
| `external_live_target_required_for_ci = false` | smoke is verify-only (no network) | n/a |
| `src_llmShield_policy_drift = 0` | `policy-drift-guard-llm-shield-stage3o.sh` | n/a |
| `overclaim_wording_detected = 0` | `security-audit-llm-shield-stage3o.sh` | n/a |

The signature-valid gate is produced **only** by the verifier, never asserted at
generation time. The consistency audit recomputes the deterministic artifacts and
fails on any drift.
