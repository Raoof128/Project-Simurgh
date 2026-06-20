# Stage 3M — Validation Matrix

Each verifier check maps to what it proves and the field/mechanism behind it. All checks PASS at
`v1.6.0` (portable + `--reproduce`).

| Check                                 | Proves                                               | Mechanism                                                                                                         | Result               |
| ------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------- |
| `schema_valid`                        | Bundle + sidecar are well-formed `simurgh.vca.*.v1`  | `validateBundleSchema` / `validateSidecarSchema` (incl. exactly 7 referenced paths, no dupes, `sha256:`-prefixed) | PASS                 |
| `signature_valid`                     | Bundle issued by the attestation key, unmodified     | `crypto.verify(null, canonicalBytes, pubKey, sig)`                                                                | PASS                 |
| `bundle_digest_match`                 | Canonical digest matches the sidecar anchor          | recompute `sha256Hex(canonicalJson(bundle))`                                                                      | PASS                 |
| `key_fingerprint_match`               | Signing key is the expected Simurgh key              | SPKI-DER SHA-256 fingerprint == sidecar (and `--expected-key-fingerprint` when given)                             | PASS                 |
| `evidence_file_hashes_match`          | Referenced Stage 3L files are unchanged              | per-file `sha256Hex` vs `referenced_evidence[]`                                                                   | PASS                 |
| `gate_results_match`                  | Gate results are honestly recomputed, not decorative | `JSON.stringify(bundle.gate_results) === evaluateGateResults(metrics)`                                            | PASS                 |
| `declared_gates_pass`                 | The run-set actually passed every hard gate          | `evaluateGateResults(metrics).all_hard_gates_passed`                                                              | PASS                 |
| `evidence_leakage_zero`               | Bundle + evidence are metadata-only                  | `scanLeakage(bundle + referenced files)` == 0                                                                     | PASS                 |
| `reproduced_metrics_match`            | Signed metrics are reproducible                      | re-run `buildStage3lCorpus` + `computeStage3lMetrics`                                                             | PASS (`--reproduce`) |
| `reproduced_boundary_breakdown_match` | Signed breakdown is reproducible                     | re-run `buildBoundaryBreakdown`                                                                                   | PASS (`--reproduce`) |
| `reproduced_privacy_report_match`     | Signed privacy result is reproducible                | `generated_evidence_leakage === 0`                                                                                | PASS (`--reproduce`) |

## Hard gates

```
schema_valid                        = true
signature_valid                     = true
bundle_digest_match                 = true
key_fingerprint_match               = true
evidence_file_hashes_match          = true
gate_results_match                  = true
declared_gates_pass                 = true
evidence_leakage_zero               = true
reproduced_metrics_match            = true   (under --reproduce)
private_key_committed               = 0       (security audit)
src_llmShield_policy_drift          = 0
```

## Reproduce

```bash
scripts/smoke-llm-shield-stage3m.sh            # verify --reproduce + all audits
node --test tests/unit/llmShield/attestation/*.test.js
```
