<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — Validation Matrix

| Area                | Check                                                                   | Gate                                                                    |
| ------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Input regression    | 3A smoke still passes                                                   | `scripts/smoke-llm-shield.sh`                                           |
| Benchmark freeze    | 3B frozen baseline no drift                                             | `scripts/smoke-llm-shield-bench.sh`                                     |
| 3D regression       | 3D smoke/security/privacy still pass                                    | `scripts/*-llm-shield-stage3d.*`                                        |
| Receipt non-drift   | `safetyReceipt.js` `v1`+`3C`, `stage3dReceipt.js` `3D`                  | `security-audit-llm-shield-stage3e.sh`                                  |
| Mount order         | gateway router before base router                                       | `security-audit-llm-shield-stage3e.sh`                                  |
| Live fail-closed    | `provider_mode:live` → `gateway_live_provider_not_implemented`          | unit `gatewayEnv` + live-disabled smoke + security audit                |
| No live surface     | no adapter file, no provider/network import under `gateway/`            | `security-audit-llm-shield-stage3e.sh`                                  |
| Forbidden fields    | `api_key`/`provider_response_body`/`synthetic_provider_output` rejected | mock smoke + security audit                                             |
| Fixture selector    | path-like `case_id` rejected; manifest-only resolution                  | unit `recordedFixtureProvider` + recorded smoke + security audit        |
| Recorded provenance | synthetic-only + `provider_output_hash` match                           | unit + security audit + privacy audit                                   |
| Tool boundary       | tool-shaped output blocked, never executed                              | unit + tool_request smoke                                               |
| Output boundary     | leakage blocked before export; hash-only                                | unit + output_firewall smoke                                            |
| Risk                | thresholds reused; gateway signals additive                             | unit `runRiskAccumulator` (reused)                                      |
| Denial-of-wallet    | over-cap input rejected                                                 | unit `gatewayRateLimit` + rate_limit smoke                              |
| Audit chain         | verify valid on accepted/blocked/fail-closed paths                      | unit `gatewayAudit` + smokes                                            |
| Corpus              | 70 fixtures, 10/category, all match expected                            | `llm_shield_stage3e_fixture_runner.mjs`                                 |
| Metadata-only       | no raw key/transcript in generated evidence                             | `privacy-audit-llm-shield-stage3e.mjs`                                  |
| OpenAPI             | 3.1, Bearer scheme, mock examples, no keys/payloads                     | unit `openapi`                                                          |
| Docker              | mock default, non-root, `.env` excluded                                 | `docker-smoke-llm-shield-stage3e.sh` (skips if absent) + security audit |
| Non-claims          | immunity/production wording absent; non-claims documented               | `LLM_SHIELD_STAGE_3E_CORE_INDUSTRY_GATEWAY.md`                          |
