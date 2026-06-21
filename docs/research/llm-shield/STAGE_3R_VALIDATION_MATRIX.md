# Stage 3R — Validation Matrix

Each invariant → the test/script that enforces it → where it is observed.

| Invariant                                                           | Enforced by                                                                                                              | Observed in                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Outcome classification (available/refusal/unavailable/timeout)      | `fallbackPolicy.test.js` (`classifyProviderOutcome`)                                                                     | —                                                                   |
| Anti-bypass pre-check (fail-closed, real enums)                     | `fallbackPolicy.test.js` (`preCheckNonTerminal`, `refusalFallbackAllowed`)                                               | `fallback_terminal_reason: "simurgh_precheck_terminal"`             |
| Availability fallback obeys the anti-bypass lock (fix #1)           | `fallbackPolicy.test.js`, `fallbackOrchestrator.test.js`, self-proof `availability-failure-unsafe-local-block`           | self-proof results                                                  |
| Provider-refusal fallback is opt-in (default off)                   | `fallbackOrchestrator.test.js`, E2E `refusal flag OFF`                                                                   | receipt `fallback_on_refusal_enabled`                               |
| Monotonic trust (never launders; swap floors to ≥ warning)          | `fallbackPolicy.test.js` (`mergeTrustMonotonic`/`applySwapFloor`), `fallbackOrchestrator.test.js` `trust-never-improves` | receipt `risk_verdict`                                              |
| One fallback authority, one hop                                     | `fallbackOrchestrator.test.js` `cap-one-hop`                                                                             | receipt `fallback_budget`, `fallback_terminal_reason`               |
| Same HMAC chain across the swap                                     | `fallbackReceiptAudit.test.js` (`recordGatewayFallbackSwap` + `verifyChain`)                                             | audit event `LLM_GATEWAY_FALLBACK_SWAP`                             |
| Fallback output re-runs every boundary                              | E2E `availability` path (`output_firewall_verdict !== "not_called"`)                                                     | receipt                                                             |
| Fresh approved envelope; setup throws stay config-rejections        | gateway router (no throw-swallow) + 3E core smoke regression                                                             | —                                                                   |
| Null-safe refusal shape (hashed explanation, branch on stop_reason) | `refusalNormalise.test.js`                                                                                               | receipt metadata                                                    |
| Receipt fallback fields                                             | `fallbackReceiptAudit.test.js`, E2E                                                                                      | `fallback_used/_chain/_budget/_on_refusal_enabled/_terminal_reason` |
| End-to-end gateway wiring (3 paths)                                 | `llm_shield_stage3r_fallback.mjs` (availability / refusal-off / blocked-input)                                           | receipts                                                            |
| `fallback_bypass_successes = 0`                                     | `security-audit-llm-shield-stage3r.mjs`, self-proof                                                                      | self-proof summary                                                  |
| No 3E/live regression                                               | `tests/unit/llmShield/gateway/*` (104), 3E core + live smokes                                                            | —                                                                   |

Pure modules (`fallbackPolicy`, `fallbackOrchestrator`, `fallbackSelfProof`) are gated at
100% function coverage; the router + E2E are exercised by the gateway smoke (honest
subprocess coverage). A clean primary produces today's 3E receipt plus the new default
fallback fields.
