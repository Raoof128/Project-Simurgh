# Stage 3X Validation Matrix

| Requirement                                                                                        | Where validated                                                                  |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Generic EH verifier (self-inclusion, raw-`..`, absolute, inside-dir, digest match, fails closed)   | `verifyEvidenceHashesLib.mjs`; `verifyEvidenceHashes.test.js`.                   |
| Frozen 12-rung table + tiers + reasons                                                             | `stage3xTimelineLib.VCA_RUNGS`; `timelineLib.test.js`.                           |
| `chain_summary` (12/12/10/5/3/2) + `claim_summary` false                                           | `buildChainSummary`/`buildTimelineIndex`; `timelineLib.test.js`; security audit. |
| `chain_integrity_mode` + `deep_rewalk_mode` per rung                                               | `buildTimelineIndex`; `timelineLib.test.js`.                                     |
| 3M fingerprint from `attestation.public-key.json`                                                  | `resolveFingerprint`; `timelineLib.test.js`.                                     |
| Runner build/hash/verify/write-hashes/verify-hashes (excludes self)                                | `build-3x-timeline.mjs`; `build.test.js`.                                        |
| Own 3X Ed25519 key + canonical signing                                                             | `sign-3x-timeline.mjs`; verifier signature check.                                |
| Two-tier verifier (digests/commits/summary recompute, fails closed)                                | `verify-stage3x-timeline.mjs`; `verifier.test.js`.                               |
| Tamper suite (11 cases incl. EH hardening) all rejected                                            | `llm_shield_stage3x_tamper_runner.mjs`; `tamper.test.js`.                        |
| Reviewer command: tag/commit + evidence-root 10/10 + deep 5/5 + reproduce 3/3, separated summaries | `scripts/reproduce-vca-chain.sh`; `vca-chain-reproduction-results.json`.         |
| Offline gates (no Sigstore/gh); consistency = root 10/10 + deep 5/5                                | `scripts/*-llm-shield-stage3x.*`.                                                |
| Smoke on reserved port 33220 via `boot_server`                                                     | `smoke-llm-shield-stage3x.sh`.                                                   |
| 100% function coverage on both pure libs                                                           | check.sh 3X coverage gate.                                                       |
| Zero `src/llmShield` change                                                                        | `policy-drift-guard-llm-shield-stage3x.sh`.                                      |
| No uniform-12/12 claim; no reduction of `live_capture_origin_self_reported`                        | non_claims + security audit.                                                     |
