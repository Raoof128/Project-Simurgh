# Stage 3R — Trust-Preserving Provider Fallback — Design

**Status:** Approved design (brainstorm complete). Implementation follows the normal
writing-plans → executing-plans flow.
**Date:** 2026-06-21
**Naming:** Uses stage id **3R**. The previously-reserved 3R (temporal live-campaign) is
skipped; the number is reused here. Tag target: `v2.1.0`.
**Anchors:** `docs/research/llm-shield/NORTH_STAR_VERIFIABLE_CONTAINMENT_ATTESTATION.md`,
Stage 3E (gateway + live Anthropic adapter), the HMAC audit chain (`src/audit`), the VCA
ladder (3M–3Q). Grounded in the real Claude Fable 5 fallback contract.

## Crown sentence

> **Stage 3R proves that provider fallback can preserve containment state across model
> unavailability or configured provider over-refusal: the same HMAC chain and risk
> accumulator carry across the swap, the swap is recorded as a signed risk-raising
> event, and fallback output is re-processed through every containment boundary.
> Fallback is resilience, never a firewall bypass.**

## What it redeems

The letter's *"resilient Opus fallbacks / hot-swap to Claude Opus without breaking the
session's underlying trust rating."* Beyond-industry: Anthropic's `fallbacks` parameter
swaps **silently** (the refusal vanishes, you get the fallback answer + a credit); Stage
3R makes every swap a **signed, risk-raising, monotonic audit event** a reviewer can see
later — the VCA north star applied to model swaps.

## Grounding in the real Fable 5 contract (verified against the docs)

- A refusal is a **successful HTTP 200** with `stop_reason: "refusal"` and
  `stop_details: { type: "refusal", category, explanation }`.
- `category` ∈ `cyber | bio | frontier_llm | reasoning_extraction`, and **both `category`
  and `explanation` can be `null`**; `stop_details` is `null` for every non-refusal stop
  reason and may be `null` on batch results. **Branch on `stop_reason`, never on
  `stop_details`/`content`.** The `explanation` text is explicitly **not stable — display,
  never parse.**
- A refusal can arrive **before any output or mid-stream after partial output; in either
  case partial output must be treated as incomplete and discarded.**
- Anthropic's **server-side `fallbacks`** (beta `server-side-fallback-2026-06-01`)
  triggers on a **safety-classifier decline only** — "a rate limit, overload, or server
  error on the requested model is returned to you as-is." Therefore Simurgh's
  **availability** fallback is Simurgh-orchestrated (client-side), not that parameter.
- Permitted target for `claude-fable-5` is `claude-opus-4-8` (published as
  `allowed_fallback_models`). **Fallback credit** refunds the prompt-cache cost of
  switching; manual redemption "requires an exact match" of the request body.

## Where 3R sits

3E proved live-provider adapter discipline; 3L proved containment after input-filter
failure; 3M–3Q proved evidence, claims, cross-defence, temporal verification. **3R brings
the same containment discipline into deployment resilience.**

## The three "no answer" events (the trigger model)

| Event | Behaviour |
| ----- | --------- |
| **Availability failure** (timeout/5xx/unavailable) | Simurgh-orchestrated fallback to the next configured model (`claude-fable-5` → `claude-opus-4-8`), **within budget** (see invariant 6). Pure infra resilience. |
| **Provider refusal** (`stop_reason:"refusal"`) | **Opt-in** policy fallback (default OFF), audited, risk-raising, capped at **one hop**, and only when Simurgh's own pre-check is non-terminal (anti-bypass invariant). |
| **Simurgh firewall denial** (input blocked / context rejected / tool blocked / output blocked) | **NEVER** fallback. Terminal. The un-bypassable line. |

## The anti-bypass invariant (the lock on the cage)

> **Provider-refusal fallback is permitted only when Simurgh's own policy pre-check still
> classifies the request as allowed/non-terminal, and the refusal is treated as
> provider-side unavailability or over-refusal. If Simurgh's own guard blocks, warns
> terminally, or cannot classify the request safely, fallback is forbidden.**

```text
Simurgh block / context reject / tool|export deny → no fallback (terminal)
Simurgh uncertainty above threshold              → no fallback (fail-closed) unless explicitly configured
Refusal fallback allowed ONLY if input firewall = allowed AND context guard != rejected.
```

A provider's safety refusal can never tunnel around Simurgh's own denial.

## The other safety invariants

1. **Provider-refusal fallback is not default.** Gated by
   `SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL` (default `false`). The receipt records
   `fallback_on_refusal_enabled: <bool>`.

2. **Fallback raises risk, never lowers it** (`mergeTrustMonotonic(prior, recomputed)`):

   ```text
   clean   + fallback → at least minor-risk / warning
   warning + fallback → warning or worse
   blocked + fallback → impossible (blocked is terminal)
   ```

3. **Same HMAC chain across the swap** — one session record, one chain, one accumulator;
   the swap is an event inside the same chain:

   ```text
   primary_attempt → provider_outcome → fallback_swap → fallback_attempt → boundary_rescan → final_verdict
   ```

4. **Fallback output re-runs every containment boundary** — fallback output is untrusted
   output; fallback tool calls are untrusted tool requests; fallback contexts inherit no
   authority; the answer must pass `scanOutput`. No velvet rope for Opus.

5. **Fresh approved envelope, never dirty continuation (edit 1).**

   > A provider-refusal (or availability) fallback must construct a fresh fallback attempt
   > from the **Simurgh-approved request envelope**, not from partially generated refused
   > output or mutated provider state.

   Because Simurgh never includes partial refused output, the approved envelope equals the
   original approved body in the refusal-before-output case (the common case), so fallback
   credit's exact-match redemption remains possible; for a mid-stream partial we discard
   the partial and resend the approved envelope, which may forfeit credit. **Simurgh
   prioritises containment cleanliness over credit** and records which occurred.

6. **Availability fallback is budgeted — denial-of-wallet guard (edit 4).** Availability
   fallback is automatic only within configured timeout, hop, and cost ceilings. Receipt:

   ```json
   "fallback_budget": { "max_hops": 1, "timeout_ms": 30000, "max_additional_provider_calls": 1 }
   ```

## Normalised refusal shape (edit 3, null-safe, never parsed)

`anthropicResponseNormalise.js` surfaces, metadata-only:

```json
{
  "stop_reason": "refusal",
  "stop_details_present": true,
  "stop_details_type": "refusal",
  "refusal_category": "cyber",
  "refusal_explanation_recorded": false,
  "refusal_explanation_hash": "sha256:..."
}
```

`refusal_category` is one of `cyber | bio | frontier_llm | reasoning_extraction` or
`null`. The explanation is **hashed, never stored raw and never parsed** (the text is
unstable). Refusal detection branches on `stop_reason === "refusal"` only.

## Fallback-credit evidence (edit 2, booleans/hash only — never raw tokens)

`fallback_chain[]` entries carry:

```json
{
  "from": "claude-fable-5",
  "to": "claude-opus-4-8",
  "trigger": "provider_refusal",
  "refusal_category": "cyber",
  "risk_delta": 2,
  "fallback_credit_observed": true,
  "fallback_credit_redeemed": false,
  "fallback_credit_token_recorded": false
}
```

No raw credit tokens are ever stored — booleans or a hash only. 🔐

## Architecture (built on the real gateway)

- **`src/llmShield/gateway/fallbackPolicy.js`** (pure): `classifyProviderOutcome(raw)` →
  `available | provider_refusal | unavailable | timeout`;
  `refusalFallbackAllowed({inputVerdict, contextVerdict, flagEnabled})` (anti-bypass gate);
  `shouldFallback(outcome, policy, preCheck)`; `riskDeltaFor(swapKind)`
  (availability < refusal); `mergeTrustMonotonic(prior, recomputed)`;
  `withinBudget(state, budget)`.
- **`src/llmShield/gateway/fallbackOrchestrator.js`**: runs the primary; on availability
  failure (always, within budget) or provider refusal (only if `refusalFallbackAllowed`),
  runs **exactly one** fallback hop **from the approved envelope**; re-runs the Stage 3D
  boundaries on the fallback output; accumulates risk monotonically; returns the outcome +
  `fallback_chain` + swap audit events.
- Extend **`anthropicResponseNormalise.js`** with the null-safe refusal shape above.
- Extend **`mockGatewayProvider.js`** with deterministic `unavailable` / `refusing`
  scenarios (no network) driving both paths in CI; live `claude-fable-5 →
  claude-opus-4-8` opt-in, disabled by default.
- Extend **`gatewayReceipt.js`** with `fallback_chain`, `fallback_on_refusal_enabled`,
  `fallback_budget`.
- Extend **`gatewayAudit.js`** with `recordGatewayFallbackSwap`.
- Integrate into the **`gatewayRouter.js`** run handler (replace the inline single-provider
  call with the orchestrator).

## Self-proof — the teeth

| Fixture | Must prove |
| ------- | ---------- |
| `availability-failure-swap` | primary unavailable → fallback fires (within budget), output re-scanned |
| `refusal-fallback-enabled` | refusal + flag ON + Simurgh pre-check allowed → swap fires, **risk rises** |
| `refusal-fallback-disabled` | refusal + flag OFF → terminal, no swap |
| `provider-refusal-unsafe-local-block` | refusal + flag ON **but Simurgh local guard blocks** → **NO fallback** (anti-bypass lock) |
| `simurgh-block-never-swaps` | input/context/tool/output block → never enters fallback |
| `trust-never-improves` | clean primary + swap → verdict ≥ warning; swap can't launder |
| `cap-one-hop` | fallback also fails/refuses → terminal (no second hop, no shopping) |
| `streaming-refusal-partial-output-discarded` | partial refused output is not used as final answer; the fallback attempt uses the approved envelope; final fallback output is re-scanned |
| `swap-audited-chain-verifies` | swap recorded in the same HMAC chain; chain still verifies end-to-end |

Unit tests on every `fallbackPolicy` function + an end-to-end self-proof pack;
`fallback_bypass_successes: 0` in the summary.

## Honest scope note — this touches the security path

> Stage 3R intentionally modifies the gateway security path
> (`src/llmShield/gateway/**`) and therefore carries a dedicated threat model, security
> review, regression suite, and evidence pack. It is **not** covered by the tooling-only
> policy-drift guard used for the measurement stages (3F–3Q). It is the first deliberate
> `src/llmShield` change since Stage 3E, reviewed as a feature change to the containment
> boundary.

## Evidence & testing

- Deterministic gateway E2E smoke driving both fallback paths (mock unavailable / mock
  refusing) + the anti-bypass case + the streaming-partial-discard case; verify-only in CI.
- Signed gateway receipts with the `fallback_chain` block; HMAC chain build/verify
  round-trip across the swap.
- 100% function coverage on the pure `fallbackPolicy.js`; orchestrator/router exercised by
  the gateway E2E smoke (honest subprocess coverage).
- A Stage 3R doc quartet (closeout / threat-model / validation-matrix / reviewer-checklist)
  + stage doc; wired into `check.sh`.

## Non-claims

- Resilience and verifiable swap-evidence — **not** proof any model is safe, and **not** a
  refusal-defeating bypass. Simurgh's own denials are terminal.
- Provider-refusal fallback is opt-in, off by default, risk-raising, capped at one hop,
  forbidden when Simurgh's own pre-check is terminal, and built from the approved envelope.
- Live providers are opt-in and `measured_not_certified`; CI is deterministic and offline.

## Out of scope (deferred)

- **Feature B** — telemetry → defensive-narrative pipeline (separate brainstorm/stage).
- Multi-hop chains (>1 hop), provider-health circuit breakers, sticky-routing replication.

## External anchors

- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback) — `stop_reason:"refusal"`, `stop_details`, streaming/partial-discard, server-side `fallbacks` is refusal-only.
- [Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit) — exact-match redemption, prompt-cache refund.
- [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- AgentDyn (arXiv:2602.03117); Firewalls (arXiv:2510.05244); PISmith (arXiv:2603.13026); OWASP AI Agent Security; NIST AI RMF.
