# Stage 3R — Closeout

**Stage:** 3R — Trust-Preserving Provider Fallback (Deployment Resilience track)
**Status:** Complete; all gates green.
**Type:** Real gateway / security-path feature (modifies `src/llmShield/gateway/**`, first
since 3E); own threat model + security review; NOT under the policy-drift guard.

## What 3R adds

3E proved live-provider adapter discipline; 3L proved containment after input-filter
failure; 3M–3Q proved evidence/claims/cross-defence/temporal verification. **3R brings the
same containment discipline into deployment resilience:** when the primary model is
unavailable or its safety classifier over-refuses, Simurgh swaps to a fallback while the
same HMAC chain and risk accumulator carry across, the swap is a signed risk-raising
event, and the fallback output re-runs every containment boundary. Fallback is resilience,
never a firewall bypass.

It redeems the pitch's "resilient Opus fallback without breaking the trust rating" — and
goes beyond Anthropic's silent `fallbacks` parameter by making every swap a verifiable,
monotonic, audited continuity event.

## Deliverables

- `src/llmShield/gateway/fallbackPolicy.js` — outcome classification, fail-closed
  anti-bypass pre-check (real enums), monotonic trust, budget.
- `src/llmShield/gateway/fallbackOrchestrator.js` — one-hop cap, monotonic merge,
  `fallback_chain`.
- `src/llmShield/gateway/fallbackSelfProof.js` — 9-fixture pack, `fallback_bypass_successes:0`.
- `anthropicResponseNormalise.js` — null-safe refusal normaliser; `mockGatewayProvider.js`
  — deterministic unavailable/refusal outcomes.
- `gatewayReceipt.js` + `gatewayAudit.js` — fallback fields + `LLM_GATEWAY_FALLBACK_SWAP`.
- `gatewayRouter.js` — orchestrator wired into the run handler (behavior identical when no
  fallback, plus new default receipt fields).
- E2E `tests/e2e/llm_shield_stage3r_fallback.mjs` (3 real-gateway paths + self-proof);
  security audit + smoke; check.sh wiring (`3A–3R`); doc quartet + stage doc.

## Results

- Pure libs at 100% function coverage; gateway unit 104/104; 3E core + live smokes pass
  (no regression); E2E 4/4; `fallback_bypass_successes: 0`.
- Real enums confirmed against the gateway (`inputVerdict ∈ {safe,warning,blocked}`,
  `contextVerdict ∈ {accepted,demoted,rejected,not_supplied}`) — the anti-bypass lock uses
  explicit fail-closed allow-sets.
- Grounded in the real Fable 5 refusal/fallback contract.

## Next

- Feature B — telemetry → defensive-narrative pipeline (separate brainstorm/stage).
- Optional live `fable-5 → opus-4-8` campaign, run out-of-band, committed + CI-verified.
