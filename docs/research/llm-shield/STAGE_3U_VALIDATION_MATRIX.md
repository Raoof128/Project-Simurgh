# Stage 3U — Validation Matrix

Each invariant → the test/script that enforces it → where it is observed.

| Invariant                                         | Enforced by                                                              | Observed in                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Volume cannot independently corroborate (A10)     | `detectorV2.test.js`, `extractionSelfProofV2.test.js`                    | A10 regression set → `single_signal_observed`                      |
| ≥2 STRONG families required for extraction        | `detectorV2.test.js` (`decideV2`, strong/contextual)                     | `matched_strong_families`, `strong_family_count`                   |
| Strong/contextual split, deep-frozen              | `signalFamiliesV2.test.js`                                               | `Object.isFrozen` true; `splitFamilies`                            |
| Metadata grammar enforced (A9)                    | `metadataGrammar.test.js`, `privacy-audit-llm-shield-stage3u.mjs`        | `metadata_grammar_violation` on payloads/invalid hashes/timestamps |
| Grammar deep-frozen (rules + enums)               | `metadataGrammar.test.js`                                                | `Object.isFrozen(METADATA_GRAMMAR.task_family.values)`             |
| Full-header order-independent digest              | `metaSetV2.test.js` (`metaSetDigestV2`)                                  | reorder = same digest; `set_id` change = different                 |
| Unique `run_id`                                   | `metaSetV2.test.js` + self-proof `duplicate-run-id-rejected`             | `duplicate_run_id_failures: 0`                                     |
| Frozen, total, versioned decision                 | `detectorV2.test.js` + self-proof version-locks                          | `decision_function` in `detector-config.json`                      |
| No post-hoc tuning (threshold/family/grammar)     | `verify-stage3u-attestation.mjs`, config locks                           | `*_change_requires_new_detector_id: true`                          |
| Non-claim / no-intent wall                        | `rendererV2.test.js`, `security-audit-llm-shield-stage3u.mjs`            | `intent_claim_made: false`; `intent_claims_rendered: 0`            |
| Sacred non-claim present                          | `security-audit-llm-shield-stage3u.mjs`                                  | sacred sentence in `rendered_summary` + `non_claims[]`             |
| No named labs in evidence                         | `security-audit-llm-shield-stage3u.mjs`                                  | `stage3u security: PASS`                                           |
| Documented limitation reported (not hidden)       | `extractionSelfProofV2.test.js` (`strong-plus-strong-benign-collision`)  | fixture → `extraction_pattern_observed`; `known_limitations[]`     |
| Both result digests bound to attestation          | `extractionVerifyV2.test.js`, `consistency-audit-llm-shield-stage3u.mjs` | `main_result_digest_binding`, `regression_result_digest_binding`   |
| A10 regression did not escalate (bound)           | `verify-stage3u-attestation.mjs`                                         | `regression_did_not_escalate: true`                                |
| Detector + attestation reproduce byte-for-byte    | CLI `verify`, verifier `--reproduce`, consistency audit                  | `*_reproduces: true`                                               |
| Signature + key fingerprint                       | `extractionVerifyV2.test.js`, consistency audit (calls verifier)         | `signature_valid`, `key_fingerprint_match`                         |
| Evidence hash freeze                              | CLI `verify-hashes`                                                      | `evidence-hashes.json`                                             |
| Tooling-only (zero src/llmShield)                 | `policy-drift-guard-llm-shield-stage3u.sh`                               | `stage3u policy-drift: PASS`                                       |
| Additive (3T v1 + evidence frozen, 3T reproduces) | `v1-freeze-guard-llm-shield-stage3u.sh`                                  | `stage3u v1-freeze: PASS` + 3T reproduces                          |

Pure v2 libs are gated at 100% function coverage; the CLI + signer + verifier are exercised
by subprocess smoke coverage (no gateway run, no network — the "E2E" label is intentionally
avoided). Branch coverage is reported but not gated; the grammar-rejection throw paths are
covered by targeted tests.
