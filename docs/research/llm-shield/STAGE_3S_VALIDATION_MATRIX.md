# Stage 3S — Validation Matrix

Each invariant → the test/script that enforces it → where it is observed.

| Invariant                                           | Enforced by                                                                                                                                      | Observed in                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Deterministic, source-bound digest                  | `evidenceDigest.test.js` (`buildEvidenceDigest`, `digestSourceInput`, `resolveDigestRef`)                                                        | `digest/evidence-digest.json` (`source_inputs[]`)               |
| Strict single-object schema wall (pen-not-passport) | `claimChecker.test.js` (`parseModelSlots`)                                                                                                       | `narrative_schema_violation`                                    |
| Field-equality claim check, no prose NLP            | `claimChecker.test.js` (`verifySlots`, `evalOperator`)                                                                                           | `model-slots` → verified/rejected                               |
| No-automatic-finding vocabulary wall                | `claimChecker.test.js` (`ALLOWED_WORDING`/`FORBIDDEN_WORDING`/`ALLOWED_SEVERITY`) + `renderer.test.js` + `security-audit-llm-shield-stage3s.mjs` | rendered_summary; `automatic_finding_made:false`                |
| Deterministic renderer (verified slots only)        | `renderer.test.js`                                                                                                                               | `renderer-determinism` self-proof fixture                       |
| Conflict accounting (attempts vs rendered)          | `narrativeSelfProof.test.js`, self-proof summary                                                                                                 | `narrative_claim_conflict_attempts > 0`, `_rendered: 0`         |
| Receipt-binding (slots ↔ gateway output_hash)       | `narrativeCli.test.js`, E2E, `consistency-audit-llm-shield-stage3s.mjs`                                                                          | `model-slots.source.gateway_output_hash == receipt.output_hash` |
| Gateway-mediated generation (dogfood)               | `llm_shield_stage3s_narrative.mjs` (real gateway via recorded_fixture)                                                                           | `gateway-receipt.json`                                          |
| Source-binding (digest re-derives from sources)     | `consistency-audit-llm-shield-stage3s.mjs`; CLI verify                                                                                           | byte-identical digest                                           |
| Signature + digest-binding + no-finding             | `narrativeVerify.test.js`, `verify-stage3s-narrative.mjs`                                                                                        | signature checks all true                                       |
| Determinism (verify never re-runs gateway)          | CLI `build` (verify) re-derives + byte-compares                                                                                                  | `stage3s evidence: verified committed`                          |
| Evidence hash freeze                                | CLI `verify-hashes`                                                                                                                              | `evidence-hashes.json`                                          |
| Tooling-only (zero src/llmShield)                   | `policy-drift-guard-llm-shield-stage3s.sh` (fail-closed)                                                                                         | `policy-drift: PASS`                                            |
| Metadata-only / no privacy overclaim                | `privacy-audit-llm-shield-stage3s.mjs`                                                                                                           | `privacy: PASS`                                                 |

Pure libs (`evidenceDigest`, `claimChecker`, `renderer`, `selfProof`) are gated at 100%
function coverage; the CLI + signer + verifier + the gateway run are exercised by the smoke

- E2E (honest subprocess coverage).
