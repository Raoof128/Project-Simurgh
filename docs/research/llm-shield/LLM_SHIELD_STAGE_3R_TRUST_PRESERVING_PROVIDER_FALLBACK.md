# LLM Shield — Stage 3R: Trust-Preserving Provider Fallback

> **Stage 3R proves that provider fallback can preserve containment state across model
> unavailability or configured provider over-refusal: the same HMAC chain and risk
> accumulator carry across the swap, the swap is recorded as a signed risk-raising
> event, and fallback output is re-processed through every containment boundary.
> Fallback is resilience, never a firewall bypass.**

**Release target:** `v2.1.0-stage-3r-trust-preserving-provider-fallback`
**Type:** Real gateway / security-path feature. Intentionally modifies
`src/llmShield/gateway/**` — the first deliberate change since Stage 3E. Carries its own
threat model + security review; NOT under the tooling-only policy-drift guard.

## What it redeems

The pitch line "resilient Opus fallbacks / hot-swap to Claude Opus without breaking the
session's underlying trust rating," made real and beyond-industry. Anthropic's
server-side fallback collapses the retry into one response and reports metadata, but it
creates no Simurgh HMAC-chain event, no monotonic risk raise, and no containment
receipt. 3R adds that verifiable control layer.

## The three "no answer" events

| Event                                                   | Behaviour                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Availability failure** (timeout/5xx/unavailable)      | Simurgh-orchestrated client-side fallback (`claude-fable-5` → `claude-opus-4-8`), within budget.                                            |
| **Provider refusal** (`stop_reason:"refusal"`)          | Opt-in (`SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL`, default off), audited, risk-raising, one hop, only when Simurgh's pre-check is non-terminal. |
| **Simurgh firewall denial** (input/context/tool/output) | NEVER fallback. Terminal.                                                                                                                   |

## The anti-bypass invariant (the lock)

> NO fallback of any kind — availability OR refusal — after a Simurgh-terminal pre-check.
> `preCheckNonTerminal := inputVerdict === "safe" AND contextVerdict ∈ {accepted,
not_supplied, demoted}` (explicit allow-sets; any other/unknown value is terminal,
> fail-closed). A provider refusal or outage can never tunnel around Simurgh's own denial.

## The other safety invariants

- **Monotonic trust** — one session record, one HMAC chain, one risk accumulator across
  the swap; the verdict can only hold or worsen (`mergeTrustMonotonic`), and a swap floors
  to ≥ warning (`applySwapFloor`). `blocked + fallback` is impossible (blocked is terminal).
- **Same HMAC chain** — the swap is a `LLM_GATEWAY_FALLBACK_SWAP` event inside the same
  chain, never a new mini-session.
- **Fallback output re-runs every boundary** — the fallback model's output is untrusted;
  it passes the tool gate + output firewall. No velvet rope for Opus.
- **Fresh approved envelope** — the fallback uses the Simurgh-approved request envelope,
  never partial/refused output (genuine provider setup errors stay config-rejections).
- **One fallback authority, one hop** — client-side orchestration only; no provider SDK
  middleware / native multi-chains on the same request; budgeted (`max_hops:1`,
  `timeout_ms:30000`, `max_additional_provider_calls:1`).

## Grounding in the real Fable 5 contract

A refusal is a successful HTTP 200 with `stop_reason:"refusal"` and `stop_details`
(`category ∈ {cyber,bio,frontier_llm,reasoning_extraction}|null`, can be null). Detection
branches on `stop_reason` only; the explanation is hashed, never parsed/stored raw.
Permitted target `claude-fable-5 → claude-opus-4-8`; fallback credit is recorded as
booleans only (never raw tokens). Anthropic's server-side `fallbacks` triggers on refusal
only — so Simurgh orchestrates the availability path itself, client-side.

## Self-proof — the teeth

| Fixture                                      | Proves                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `availability-failure-swap`                  | availability failure → one hop, output re-scanned                  |
| `refusal-fallback-enabled`                   | refusal + flag ON + pre-check non-terminal → swap, risk rises      |
| `refusal-fallback-disabled`                  | refusal + flag OFF → terminal, no swap                             |
| `provider-refusal-unsafe-local-block`        | refusal + flag ON but Simurgh blocks → NO swap                     |
| `availability-failure-unsafe-local-block`    | availability failure + Simurgh blocks → NO swap                    |
| `simurgh-block-never-swaps`                  | the policy gate refuses a terminal pre-check even with the flag on |
| `trust-never-improves`                       | clean primary + swap → ≥ warning; never laundered                  |
| `cap-one-hop`                                | fallback also fails → terminal, no second hop                      |
| `streaming-refusal-partial-output-discarded` | dirty partial refused text never becomes the final answer          |

Summary carries `fallback_bypass_successes: 0`.

## Honest scope note

Stage 3R intentionally modifies the gateway security path (`src/llmShield/gateway/**`).
It is reviewed as a feature change to the containment boundary, with a dedicated threat
model + security audit, and is NOT covered by the measurement-stage policy-drift guard.

## Non-claims

- Resilience and verifiable swap-evidence — NOT proof any model is safe, and NOT a
  refusal-defeating bypass. Simurgh's own denials are terminal.
- Provider-refusal fallback is opt-in, off by default, risk-raising, one-hop, forbidden
  after a terminal pre-check, and built from the approved envelope.
- Live providers are opt-in and `measured_not_certified`; CI is deterministic and offline.

## Out of scope (deferred)

- Feature B — telemetry → defensive-narrative pipeline (separate stage).
- Multi-hop chains, provider-health circuit breakers, sticky-routing replication.

## External anchors

- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit)
- AgentDyn (arXiv:2602.03117); Firewalls (arXiv:2510.05244); PISmith (arXiv:2603.13026); OWASP AI Agent Security; NIST AI RMF.
