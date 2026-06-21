# Stage 3Q — Validation Matrix

Each hard gate → the script/test that enforces it → the evidence file that records it.

| Hard gate                                                            | Enforced by                                                                                | Recorded in                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| timeline manifest valid + fixed UTC timestamps                       | `temporalLib.test.js` (`validateTimelineManifest`, `validateUtcTimestamp`)                 | `registry/timeline-manifest.json`        |
| diff manifest valid (all fields, fixed timestamp)                    | `temporalLib.test.js` (`validateDiffManifest`)                                             | `diffs/diff-manifest.json`               |
| registry derivable from manifest (byte-compare)                      | `registry.mjs build` + consistency audit                                                   | `registry/registry.json`                 |
| manifest source digest bound (canonical)                             | consistency audit (`source.timeline_manifest_digest`)                                      | `registry/registry.json`                 |
| registry hash chain valid                                            | `registryChain.test.js` (`verifyRegistryHashChain`), `verify-stage3q-registry.mjs`         | `registry/registry.json`                 |
| registry signature valid                                             | `verify-stage3q-registry.mjs` (verify-only)                                                | `registry/registry.signature.json`       |
| referenced 3P catalogue/target digests still match                   | `verify-stage3q-registry.mjs` (`verifyRegistryReferences`)                                 | `registry/registry.json`                 |
| append-continuity vs previous head                                   | `registryChain.test.js` (`verifyAppendContinuity`), `verify-stage3q-append.mjs`            | `registry/previous-registry-head.json`   |
| lineage binding (strict, no aliases)                                 | `temporalLib.test.js` (`enforceLineageBinding`, `buildRegressionDiff`)                     | `diffs/*/regression-diff.json`           |
| transition lattice (anti-laundering)                                 | `temporalLib.test.js` (`classifyCellTransition`), `verify-stage3q-diff.mjs` lattice sanity | `diffs/*/regression-diff.json`           |
| diff signature + no ranking fields                                   | `verify-stage3q-diff.mjs`                                                                  | `diffs/*/regression-diff.signature.json` |
| self-proof all detectors fired + `integrity_laundering_successes==0` | `smoke-llm-shield-stage3q-self-proof.sh`, consistency audit                                | `self-proof/self-proof-results.json`     |
| evidence file hashes match (full pack, no tombstones)                | `registry.mjs verify-hashes`                                                               | `evidence-hashes.json`                   |
| no cross-target ranking wording                                      | `security-audit-llm-shield-stage3q.sh` (self-proof exempt)                                 | n/a                                      |
| metadata-only / no forbidden tokens                                  | `privacy-audit-llm-shield-stage3q.mjs`                                                     | n/a                                      |
| `src_llmShield_policy_drift = 0` (fail-closed)                       | `policy-drift-guard-llm-shield-stage3q.sh` (`main...HEAD`, warns + falls back)             | n/a                                      |

The signature-valid gates are produced **only** by the verifiers, never asserted at
generation time. The registry is re-derived from the committed manifest and
byte-compared; the self-proof pack is exempt from the wording audit by design (it
names the violations it provokes).
