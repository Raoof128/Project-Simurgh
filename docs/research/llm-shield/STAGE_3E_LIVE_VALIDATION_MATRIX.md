<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-live — Validation Matrix

> A live provider call is an observed gateway event, not a proof of model safety.

| Assertion                                                             | Where verified                                                                                       |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `anthropic` is the only live provider                                 | `tests/unit/llmShield/gateway/providerTypesLive.test.js`                                             |
| Live disabled by default → fail closed                                | `liveProviderGuard.test.js`; `llm_shield_stage3e_live_disabled_smoke.mjs`; fixtures `live_config`    |
| Missing key / model / wrong provider / bad context-mode → fail closed | `liveProviderGuard.test.js`; `llm_shield_stage3e_live_missing_key_smoke.mjs`; `live_config` fixtures |
| Zero / exceeded call caps block before any provider call              | `liveCallLedger.test.js`; `llm_shield_stage3e_live_rate_limit_smoke.mjs`                             |
| Per-minute / per-day caps (OWASP LLM10)                               | `liveCallLedger.test.js`                                                                             |
| Request never contains tools/tool_choice/cache_control (default)      | `anthropicMessageBuild.test.js`; `live_request_build` fixtures; security audit                       |
| Context summary deterministic + capped (500/ctx, 2 KB total)          | `anthropicMessageBuild.test.js`; `live_context_mode` fixtures                                        |
| Raw-context reject threshold distinct from summary cap                | `gatewayRouter` live caps; spec §9                                                                   |
| Tool-use response → sanitized hashed `tool_request`, never executed   | `anthropicResponseNormalise.test.js`; `live_provider_error` fixtures                                 |
| Refusal still runs the output firewall                                | `anthropicResponseNormalise.test.js` (classification only)                                           |
| Real timeout enforced (`AbortController`) → `gateway_live_timeout`    | `anthropicProviderAdapter.test.js`                                                                   |
| Output length-capped before hashing                                   | `anthropicProviderAdapter.test.js`                                                                   |
| Authority-forging context rejected, provider skipped                  | `llm_shield_stage3e_live_context_rejected_smoke.mjs`                                                 |
| Client-supplied api_key rejected                                      | same smoke; forbidden-field guard                                                                    |
| Receipt: egress true on live; `*_recorded:false`, no-tools booleans   | `gatewayReceiptLive.test.js`                                                                         |
| No static SDK import under gateway; dynamic only in adapter           | `security-audit-llm-shield-stage3e-live.sh`                                                          |
| No forbidden raw keys in evidence                                     | `privacy-audit-llm-shield-stage3e-live.mjs`                                                          |
| Mock/recorded paths undrifted; 3B benchmark no drift                  | `npm test` (589); 3B gate                                                                            |
| Optional live smoke skips without env; CI key-free                    | `llm_shield_stage3e_live_optional_anthropic_smoke.mjs`                                               |
