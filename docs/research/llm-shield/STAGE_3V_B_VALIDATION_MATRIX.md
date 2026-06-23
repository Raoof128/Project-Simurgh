# Stage 3V-B Validation Matrix

| Requirement                                                        | Where validated                                                                        |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| LG4 12B via HF transformers, greedy decode                         | `tools/capture/stage3vb_llama_guard4_capture.py`; `ADAPTER_CONFIG.decode`.             |
| Input = `user_task`, input-only, 180/180 feedable                  | `scripts/assert-stage3l-feedable-inputs.mjs`; `tests/unit/.../feedableInputs.test.js`. |
| LG4 grammar parsed (safe/unsafe/codes/malformed)                   | `llamaGuard4OutputGrammar.mjs`; `llamaGuard4Grammar.test.js`.                          |
| One validated observation per case                                 | `llamaGuard4Adapter.frozenCaptureObservations`; `llamaGuard4Adapter.test.js`.          |
| Seven harness-computed hashes                                      | `captureProvenanceHashes.mjs`; `captureProvenanceHashes.test.js`.                      |
| `adapter_supplied_hash_forbidden`                                  | contract `validateObservation`; tamper `adapter_supplied_hash`.                        |
| Capture-integrity preflight                                        | `assertCaptureIntegrity`; `captureIntegrityScript.test.js`.                            |
| Bundle: stage 3V-B, `model_reexecuted_in_ci:false`, `capture_mode` | runner `buildExternalDefenseBundle`; `bundle.test.js`.                                 |
| `input_manifest_hash` + `stage3l_corpus_manifest_hash`             | runner `deriveForVerify`; recomputed in verifier `--reproduce`.                        |
| `known_limitations` incl `live_capture_origin_self_reported`       | runner constant; security audit assertion.                                             |
| Advisory-invariance (structural)                                   | `advisoryInvariance.test.js`.                                                          |
| Two-tier verifier, fails closed                                    | `verify-stage3vb-external-defense.mjs`; `verifier.test.js`.                            |
| Full tamper suite (≥9 cases)                                       | `tests/e2e/llm_shield_stage3vb_tamper_runner.mjs`; `tamper.test.js`.                   |
| Privacy: no prompts/secrets/tokens/echoed `user_task`              | `privacy-audit-llm-shield-stage3vb.mjs`.                                               |
| Committed replay artifact reproducibility                          | `capture-replay/lg4-frozen-capture.json`; `reproduce-llm-shield-stage3vb.sh`.          |
| Smoke on reserved port 33200 via `boot_server`                     | `smoke-llm-shield-stage3vb.sh`.                                                        |
| 100% function coverage on pure libs                                | check.sh 3V-B coverage gate (grammar, adapter, hashes).                                |
| Zero `src/llmShield` change                                        | `policy-drift-guard-llm-shield-stage3vb.sh`.                                           |
| Release only from real capture                                     | `assert-stage3vb-live-release.sh`.                                                     |
