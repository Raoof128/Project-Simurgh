# Stage 3T — Validation Matrix

Each invariant → the test/script that enforces it → where it is observed.

| Invariant                                    | Enforced by                                                                    | Observed in                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Metadata-only + synthetic/offline provenance | `metaSet.test.js` (`validateMetaSet`) + `privacy-audit-llm-shield-stage3t.mjs` | `metadata-set.json` provenance flags; `stage3t privacy: PASS`   |
| Full-header order-independent digest         | `metaSet.test.js` (`metaSetDigest`, `normaliseMetaSet`)                        | reorder = same digest; `set_id` change = different digest       |
| Unique `run_id`                              | `metaSet.test.js` + self-proof `duplicate-run-id-rejected`                     | `duplicate_run_id_failures: 0`                                  |
| Deep-frozen FAMILY_MAP + frozen FAMILY_ORDER | `signalFamilies.test.js`                                                       | `Object.isFrozen` true; emission sorted by FAMILY_ORDER         |
| Distinct-FAMILY counting (not booleans)      | `signalFamilies.test.js`, self-proof `structural-double-count-trap`            | `distinct_family_double_count_failures: 0`                      |
| Frozen, total, versioned decision function   | `detector.test.js` (`decide`), self-proof `threshold-version-lock`             | `decision_function` in `detector-config.json`; threshold = 2    |
| No post-hoc threshold tuning                 | `verify-stage3t-attestation.mjs` (`threshold_lock_present`)                    | `threshold_change_requires_new_detector_id: true`               |
| Non-claim / no-intent wall                   | `renderer.test.js`, `security-audit-llm-shield-stage3t.mjs`                    | `intent_claim_made: false`; `intent_claims_rendered: 0`         |
| Sacred non-claim present                     | `security-audit-llm-shield-stage3t.mjs`                                        | sacred sentence in `rendered_summary` + `non_claims[]`          |
| No named labs in evidence                    | `security-audit-llm-shield-stage3t.mjs` (FORBIDDEN_WORDING scan)               | `stage3t security: PASS`                                        |
| Benign-silence (detector has brakes)         | `extractionSelfProof.test.js`, `self-proof-results.json`                       | `benign_escalation_failures: 0`, `single_family_escalations: 0` |
| Receipt/digest binding                       | `extractionVerify.test.js`, `consistency-audit-llm-shield-stage3t.mjs`         | `meta_set_digest_binding: true`                                 |
| Detector reproduces byte-for-byte            | CLI `verify`, verifier `--reproduce`, consistency audit                        | `detector_result_reproduces: true`                              |
| Attestation reproduces byte-for-byte         | verifier `--reproduce`                                                         | `attestation_reproduces: true`                                  |
| Signature + key fingerprint                  | `extractionVerify.test.js`, `verify-stage3t-attestation.mjs`                   | `signature_valid`, `key_fingerprint_match` true                 |
| Evidence hash freeze                         | CLI `verify-hashes`                                                            | `evidence-hashes.json`                                          |
| Tooling-only (zero src/llmShield)            | `policy-drift-guard-llm-shield-stage3t.sh` (fail-closed)                       | `stage3t policy-drift: PASS`                                    |

Pure libs (`metaSet`, `signalFamilies`, `detector`, `renderer`, `selfProof`) are gated at
100% function coverage; the CLI + signer + verifier are exercised by subprocess smoke
coverage (no gateway run, no network — there is no true end-to-end pipeline, so the "E2E"
label is intentionally avoided).
