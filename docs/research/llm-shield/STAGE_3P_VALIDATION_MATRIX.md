# Stage 3P — Validation Matrix

Each hard gate → the script/test that enforces it → the evidence file that records it.

| Hard gate                                                          | Enforced by                                                         | Recorded in                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------ |
| `matrix_total_cases = 180` / `matrix_canaries 150` / `controls 30` | `crossDefenceMatrix.test.js`, `enforceMatrixValidity`               | `corpus/matrix-manifest.json`                                |
| `unique_markers = 150`                                             | `enforceMatrixValidity`                                             | `corpus/matrix-manifest.json`                                |
| `matrix_manifest_hash_valid`                                       | consistency audit (corpus digest binding)                           | `corpus/matrix-manifest.json`                                |
| fixed cell-result enum                                             | `validateTargetAttestation` (`CELL_RESULTS`)                        | `targets/<id>/containment-attestation.json`                  |
| `provenance_brand_gate_fires`                                      | `crossDefenceLib.test.js` (`checkProvenanceBrand`) + self-proof     | `self-proof/self-proof-results.json`                         |
| `ranking_overclaim_gate_fires`                                     | `crossDefenceLib.test.js` (`checkRankingOverclaim`) + self-proof    | `self-proof/self-proof-results.json`                         |
| `claim_conflict_gate_fires`                                        | `evaluateCoverageClaims` test + self-proof                          | `self-proof/self-proof-results.json`                         |
| `full_coverage_gate_fires`                                         | `evaluateCoverageClaims` test + self-proof                          | `self-proof/self-proof-results.json`                         |
| `catalogue_silent_drop_gate_fires`                                 | `crossDefenceCatalogue.test.js` (`checkSilentDrop`) + self-proof    | `self-proof/self-proof-results.json`                         |
| `every_target_attestation_signature_valid`                         | `verify-stage3p-target.mjs` (verify-only)                           | `targets/<id>/containment-attestation.signature.json`        |
| `catalogue_signature_valid`                                        | `verify-stage3p-catalogue.mjs` (verify-only)                        | `catalogue/attestation-catalogue.signature.json`             |
| `catalogue_binds_target_digests`                                   | `verifyCatalogueBinding` (canonical digest equality)                | `catalogue/attestation-catalogue.json`                       |
| `all_targets_share_corpus_digest`                                  | consistency audit + `verifyCatalogueBinding`                        | `targets/<id>/...`                                           |
| `all_targets_share_matrix_shape`                                   | consistency audit + `verifyCatalogueBinding` (full equality)        | `targets/<id>/...`                                           |
| `self_proof_all_detectors_fired`                                   | `smoke-llm-shield-stage3p-self-proof.sh`                            | `self-proof/self-proof-results.json`                         |
| `evidence_file_hashes_match`                                       | `verify-hashes` (full pack, no null tombstones)                     | `evidence-hashes.json`                                       |
| `generated_evidence_leakage = 0`                                   | privacy audit + generation gate                                     | `self-proof/self-proof-results.json` (declares no pollution) |
| `external_live_target_required_for_ci = false`                     | smoke is verify-only (no network)                                   | n/a                                                          |
| `src_llmShield_policy_drift = 0`                                   | `policy-drift-guard-llm-shield-stage3p.sh` (branch-wide merge-base) | n/a                                                          |
| `overclaim_wording_detected = 0`                                   | `security-audit-llm-shield-stage3p.sh`                              | n/a                                                          |

The signature-valid gates are produced **only** by the verifiers, never asserted
at generation time. The consistency audit recomputes deterministic artifacts and
fails on any drift. The self-proof pack is exempt from the wording audit by design
(it names the violations it provokes); the published catalogue and target
attestations are scanned strictly.
