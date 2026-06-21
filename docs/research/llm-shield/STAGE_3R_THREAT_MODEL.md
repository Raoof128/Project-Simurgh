# Stage 3R — Threat Model

Stage 3R changes the gateway security path, so its threat model is about ensuring the
_resilience_ feature cannot become an _attack amplifier_. The asset is containment: a
fallback must never produce an answer that Simurgh's own boundaries would have denied.

## Adversaries and mitigations

| Adversary / risk                                                                    | Mitigation                                                                                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Refusal-shopping (retry the same prompt across models until one complies)           | One fallback authority, one hop, capped budget; provider refusal fallback is opt-in and risk-raising                        |
| Firewall bypass via refusal (use a provider refusal to tunnel past Simurgh's block) | Anti-bypass lock: no fallback of any kind after a Simurgh-terminal pre-check (`preCheckNonTerminal`, fail-closed)           |
| Firewall bypass via outage (use an availability failure to escape a Simurgh block)  | Fix #1: the same lock covers availability fallback, proven by `availability-failure-unsafe-local-block`                     |
| Trust laundering (a swap turns a warning/blocked session "clean")                   | Monotonic trust merge + swap floor (`mergeTrustMonotonic`/`applySwapFloor`); blocked is terminal and never reaches fallback |
| Dirty continuation (partial refused output becomes the final answer)                | Fresh approved envelope; partial output discarded; proven by `streaming-refusal-partial-output-discarded`                   |
| Unscanned fallback output (the "stronger model" gets a velvet rope)                 | The fallback output re-runs the tool gate + output firewall like any untrusted output                                       |
| Denial-of-wallet (unbounded retries)                                                | `fallback_budget` (max_hops/timeout/max_additional_provider_calls); live denial-of-wallet ledger preserved on the primary   |
| Double-fallback (provider SDK middleware + Simurgh both retry)                      | One fallback authority per request; Simurgh client-side orchestration only                                                  |
| Evidence tampering after a swap                                                     | Swap recorded as an Ed25519/HMAC-chained `LLM_GATEWAY_FALLBACK_SWAP` event in the same session chain; chain verifies        |
| Raw secret leakage (credit tokens, provider bodies)                                 | Fallback-credit fields are booleans only; existing forbidden-field gate + metadata-only receipt unchanged                   |

## Trust boundaries

- The fallback decision logic is pure and unit-proven (`fallbackPolicy`,
  `fallbackOrchestrator`); the router injects the real attempt runner.
- A genuine provider setup error (bad fixture, live SDK failure) remains a terminal
  config-rejection, not an availability fallback.
- Live providers are opt-in; the deterministic mock drives both fallback paths in CI.

## Residual risk (accepted)

- Live fallback (`fable-5 → opus-4-8` over the network) is opt-in and not exercised in
  deterministic CI; the same orchestration + boundaries apply.
- The fallback live call reuses the primary's denial-of-wallet posture via the one-hop
  budget rather than a second ledger gate (bounded by `max_additional_provider_calls:1`).
