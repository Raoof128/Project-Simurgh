# Stage 3V-A — Reviewer Checklist

- [ ] **Tooling-only:** zero `src/llmShield/**` changes — confirm `policy-drift-guard-llm-shield-stage3v.sh` PASS.
- [ ] **Additive:** no Stage 3L/3M/3T/3U module or committed evidence modified.
- [ ] **Recorded-fixture honesty:** `target_defense.live === false`, `fixture_provenance === "synthetic_deterministic"`, and `recorded_fixture_not_live_external_defence` is in `limitations`. No claim of wrapping a real live defence.
- [ ] **Generic contract, no stubs:** only `recordedFixtureExternalDefenseAdapter` exists; no `llamaGuardAdapter`/`nemoGuardrailsAdapter`/`guardrailsAiAdapter`. Contract validates `target:"llama_guard"` (Fix 3) with no target-specific branching.
- [ ] **Harness-computed hashes:** adapter carries no hash field; `adapter_supplied_hash_forbidden` enforced; verifier `--reproduce` shows `trusted_harness_hashes_recomputed` and `stage3l_corpus_manifest_recomputed`.
- [ ] **Advisory-invariance:** containment tail = `evaluateStage3lCase()` (fixture only); flipping the external verdict changes nothing.
- [ ] **Metadata-only:** privacy audit PASS; raw external output only in `tests/fixtures/stage-3v/`, never in evidence (Fix 2).
- [ ] **Verifier fails closed:** malformed input → `ok:false`, never throws.
- [ ] **Zero unsafe outcomes:** tool/output/context counters all 0; receipt + audit coverage complete.
- [ ] **Tamper suite:** all eight cases rejected, counters zero.
- [ ] **Coverage wording qualified:** "100% function coverage on the pure 3V libs + branch tests on throw paths"; verifier/runner CLIs subprocess-covered (3U precedent).
- [ ] **Keys:** only the public key committed; private key outside repo (mode 0600).
- [ ] **No named labs / accusatory wording** in machine JSON artifacts (security audit scopes to `.json`; docs may negate).
