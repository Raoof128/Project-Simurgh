# Stage 3W Validation Matrix

| Requirement                                                                  | Where validated                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Pin sealed 3V-B (commit/tag/url)                                             | `stage3wWitnessLib.WITNESSED_3VB`; `witnessLib.test.js`.                 |
| Compute 3V-B subject digests                                                 | `computeStage3vbSubjects`; `witnessLib.test.js`.                         |
| Deterministic CI verdict (expected + ci_observed + expected_equals_observed) | `buildWitnessVerdict`; `witnessLib.test.js`.                             |
| `verification_mode: ci_observed_not_echoed`                                  | `buildWitnessVerdict`; CI workflow builds observed from real exit codes. |
| In-toto statement binds 3V-B digests + witness-verdict FILE (not Sigstore)   | `buildReleaseWitnessStatement`; `witnessLib.test.js`, `bundle.test.js`.  |
| `online_witness.required_for_offline_verification:false`                     | `buildReleaseWitnessStatement`; security audit.                          |
| Sacred non-claim `does_not_reduce_live_capture_origin_self_reported`         | lib constant; security audit assertion.                                  |
| Offline bundle runner (build/hash/verify/write-hashes/verify-hashes)         | `build-3w-witness.mjs`; `bundle.test.js`.                                |
| `evidence-hashes.json` excludes itself; no Sigstore object hashed            | runner `walk()`; security audit.                                         |
| Own 3W Ed25519 key + canonical signing                                       | `sign-3w-witness.mjs`; verifier signature check.                         |
| Two-tier offline verifier (subjects_recomputed + witness_verdict_recomputed) | `verify-stage3w-witness.mjs`; `verifier.test.js`.                        |
| Verifier fails closed, never throws                                          | `verify-stage3w-witness.mjs`; `verifier.test.js`.                        |
| Tamper suite (≥9 cases) all rejected, counters zero                          | `llm_shield_stage3w_tamper_runner.mjs`; `tamper.test.js`.                |
| Online CI witness over witness-verdict                                       | `.github/workflows/stage-3w-witness.yml` (`attest-build-provenance@v3`). |
| No online dependency in offline gates                                        | offline scripts contain no Sigstore/gh calls; security audit.            |
| Smoke on reserved port 33210 via `boot_server`                               | `smoke-llm-shield-stage3w.sh`.                                           |
| 100% function coverage on pure lib                                           | check.sh 3W coverage gate (`stage3wWitnessLib.mjs`).                     |
| Zero `src/llmShield` change                                                  | `policy-drift-guard-llm-shield-stage3w.sh`.                              |
