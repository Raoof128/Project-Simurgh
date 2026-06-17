<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3D — Validation Matrix

| Area                  | Check                                                                               | Gate                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Input regression      | 3A smoke still passes (plain `{input}` path)                                        | `scripts/smoke-llm-shield.sh`                                                       |
| Benchmark freeze      | 3B frozen baseline does not drift                                                   | `scripts/smoke-llm-shield-bench.sh`                                                 |
| Receipt non-drift     | `safetyReceipt.js` stays `v1` + `3C`                                                | `scripts/security-audit-llm-shield.sh`, `...-stage3d.sh`                            |
| Additive activation   | plain `{input}` → 3C receipt; `stage3d:true` → 3D receipt                           | `...-stage3d.sh`, `llm_shield_stage3d_activation_smoke.mjs`                         |
| No output injection   | HTTP rejects `mock_provider_output`; unknown scenario rejected                      | `...-stage3d.sh`                                                                    |
| Context provenance    | authority-forging / malformed / unsigned-trusted rejected; benign untrusted demoted | unit `contextProvenanceGuard.test.js` + `llm_shield_stage3d_context_smoke.mjs`      |
| Tool gate             | unsafe + unknown tool classes blocked before execution; tool never executed         | unit `toolPolicy.test.js`, `toolInvocationGate.test.js` + `..._tool_gate_smoke.mjs` |
| Output firewall       | leakage blocked before export; blocked output hash-only                             | unit `outputLeakageFirewall.test.js` + `..._output_firewall_smoke.mjs`              |
| Risk accumulator      | per-session monotonic; multi-turn softening escalates                               | unit `runRiskAccumulator.test.js` + `..._risk_smoke.mjs`                            |
| Corpus                | 60 fixtures, 10/category, all match expected                                        | `llm_shield_stage3d_fixture_runner.mjs`                                             |
| Receipt metadata-only | no raw context/tool-args/output in receipt/metrics                                  | `scripts/privacy-audit-llm-shield-stage3d.mjs`                                      |
| Audit chain           | `/verify` valid after accepted/demoted/rejected/tool-blocked/output-blocked         | all 3D smokes                                                                       |
| No egress             | mock-only modules import no network/provider SDK                                    | `...-stage3d.sh`                                                                    |
| Non-claims present    | immunity/production wording absent; non-claims documented                           | `LLM_SHIELD_STAGE_3D_PROVENANCE_CONTAINMENT.md`                                     |
