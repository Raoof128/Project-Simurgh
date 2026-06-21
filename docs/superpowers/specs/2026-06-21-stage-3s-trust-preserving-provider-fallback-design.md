# Stage 3S — Trust-Preserving Provider Fallback — Design

**Status:** Approved design (brainstorm complete). Implementation follows the normal
writing-plans → executing-plans flow.
**Date:** 2026-06-21
**Anchors:** `docs/research/llm-shield/NORTH_STAR_VERIFIABLE_CONTAINMENT_ATTESTATION.md`,
Stage 3E (gateway + live Anthropic adapter), the HMAC audit chain (`src/audit`), the
VCA attestation ladder (3M–3Q). Grounded in the real Claude Fable 5 contract
(`claude-fable-5`, `stop_reason:"refusal"`, server-side `fallbacks`, fallback credit;
fallback target `claude-opus-4-8`).

## Crown sentence

> **Stage 3S proves that provider fallback can preserve containment state across model
> unavailability or configured provider over-refusal: the same HMAC chain and risk
> accumulator carry across the swap, the swap is recorded as a signed risk-raising
> event, and fallback output is re-processed through every containment boundary.
> Fallback is resilience, never a firewall bypass.**

## What it redeems

The letter's *"resilient Opus fallbacks / hot-swap to Claude Opus without breaking the
session's underlying trust rating."* Made literally true and beyond-industry: where
Anthropic's `fallbacks` parameter swaps **silently** (the refusal vanishes, you get the
fallback answer + a credit), Stage 3S makes every swap a **signed, risk-raising,
monotonic audit event** — a reviewer can later see "this session required a fallback
past a Fable-5 safety classifier," which the raw API hides. That is the VCA north star
applied to model swaps.

## Where 3S sits

3E proved live-provider adapter discipline; 3L proved containment after input-filter
failure; 3M–3Q proved evidence, claims, cross-defence, and temporal verification. **3S
brings the same containment discipline into deployment resilience.**

## The three "no answer" events (the trigger model)

| Event                                   | Behaviour                                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Availability failure** (timeout/5xx/unavailable) | Fallback to the next configured model (e.g. `claude-fable-5` → `claude-opus-4-8`). Pure infra resilience. |
| **Provider refusal** (`stop_reason:"refusal"` + classifier) | **Opt-in** policy fallback (default OFF), audited, risk-raising, capped at **one hop** — and only when Simurgh's own pre-check is non-terminal (see anti-bypass invariant). |
| **Simurgh firewall denial** (input blocked / context rejected / tool blocked / output blocked) | **NEVER** fallback. Terminal. This is the un-bypassable line. |

## The anti-bypass invariant (the lock on the cage)

> **Provider-refusal fallback is permitted only when Simurgh's own policy pre-check
> still classifies the request as allowed/non-terminal, and the refusal is treated as
> provider-side unavailability or over-refusal. If Simurgh's own guard blocks, warns
> terminally, or cannot classify the request safely, fallback is forbidden.**

Concretely, before any refusal-fallback is allowed:

```text
Simurgh block           → no fallback (terminal)
Simurgh context reject  → no fallback (terminal)
Simurgh tool/export deny → no fallback (terminal)
Simurgh uncertainty above threshold → no fallback (fail-closed) unless explicitly configured
Only if input firewall = allowed AND context guard != rejected may a provider refusal be fallback'd.
```

This guarantees a provider's safety refusal can never be used as a tunnel around
Simurgh's own denial.

## The four other safety invariants

1. **Provider-refusal fallback is not default.** Gated by
   `SIMURGH_GATEWAY_FALLBACK_ON_REFUSAL` (default `false`). The receipt records
   `fallback_on_refusal_enabled: <bool>` whenever a refusal path is reachable.

2. **Fallback raises risk, never lowers it** (`mergeTrustMonotonic(prior, recomputed)`):

   ```text
   clean   + fallback → at least minor-risk / warning
   warning + fallback → warning or worse
   blocked + fallback → impossible (blocked is terminal; never reaches fallback)
   ```

3. **Same HMAC chain across the swap** — one session record, one chain, one accumulator;
   the swap is an event *inside* the same chain, never a new mini-session:

   ```text
   primary_attempt → provider_outcome → fallback_swap → fallback_attempt → boundary_rescan → final_verdict
   ```

4. **Fallback output re-runs every containment boundary** — fallback output is untrusted
   output; fallback tool calls are untrusted tool requests; fallback contexts inherit no
   authority; the fallback answer must pass `scanOutput`. No velvet rope for Opus.

## Architecture (built on the real gateway)

- **`src/llmShield/gateway/fallbackPolicy.js`** (pure): `classifyProviderOutcome(raw)` →
  `available | provider_refusal | unavailable | timeout`; `refusalFallbackAllowed({inputVerdict,
  contextVerdict, flagEnabled})` (the anti-bypass gate); `shouldFallback(outcome, policy,
  preCheck)`; `riskDeltaFor(swapKind)` (availability < refusal); `mergeTrustMonotonic(prior,
  recomputed)`.
- **`src/llmShield/gateway/fallbackOrchestrator.js`**: runs the primary provider; on an
  availability failure (always) or a provider refusal (only if `refusalFallbackAllowed`),
  runs **exactly one** fallback hop; re-runs the Stage 3D boundaries on the fallback output;
  accumulates risk monotonically; returns the outcome + a `fallback_chain` record + swap
  audit events. Simurgh firewall blocks are terminal upstream and never reach here.
- Extend **`anthropicResponseNormalise.js`** to surface `stop_reason:"refusal"` + the
  declining classifier name (the real Fable 5 response shape).
- Extend **`mockGatewayProvider.js`** with deterministic `unavailable` / `refusing`
  scenarios so both fallback paths are driven with no network in CI; live
  `claude-fable-5 → claude-opus-4-8` is opt-in, disabled by default (3E pattern).
- Extend **`gatewayReceipt.js`** with a `fallback_chain` block
  (`[{from, to, trigger, classifier?, risk_delta}]`) + `fallback_on_refusal_enabled`.
- Extend **`gatewayAudit.js`** with `recordGatewayFallbackSwap`.
- Integrate into the **`gatewayRouter.js`** run handler (replace the inline single-provider
  call with the orchestrator).

## Self-proof — the teeth

| Fixture | Must prove |
| ------- | ---------- |
| `availability-failure-swap` | primary unavailable → fallback fires, output re-scanned |
| `refusal-fallback-enabled` | refusal + flag ON + Simurgh pre-check allowed → swap fires, **risk rises** |
| `refusal-fallback-disabled` | refusal + flag OFF → terminal, no swap |
| `provider-refusal-unsafe-local-block` | refusal + flag ON **but Simurgh local guard blocks** → **NO fallback** (the anti-bypass lock) |
| `simurgh-block-never-swaps` | input/context/tool/output block → never enters fallback |
| `trust-never-improves` | clean primary + swap → verdict ≥ warning; swap can't launder |
| `cap-one-hop` | fallback also fails/refuses → terminal (no second hop, no shopping) |
| `swap-audited-chain-verifies` | swap recorded in the same HMAC chain; chain still verifies end-to-end |

Unit tests on every `fallbackPolicy` function + an end-to-end self-proof pack;
`fallback_bypass_successes: 0` in the summary.

## Honest scope note — this touches the security path

> Stage 3S intentionally modifies the gateway security path
> (`src/llmShield/gateway/**`) and therefore carries a dedicated threat model, security
> review, regression suite, and evidence pack. It is **not** covered by the tooling-only
> policy-drift guard used for the measurement stages (3F–3Q). It is the first deliberate
> `src/llmShield` change since Stage 3E, and is reviewed as a feature change to the
> containment boundary.

## Evidence & testing

- Deterministic gateway E2E smoke driving both fallback paths (mock unavailable / mock
  refusing) + the anti-bypass case; verify-only in CI.
- Signed gateway receipts with the `fallback_chain` block; HMAC chain build/verify
  round-trip across the swap.
- 100% function coverage on the pure `fallbackPolicy.js`; orchestrator/router exercised
  by the gateway E2E smoke (honest subprocess coverage).
- A Stage 3S doc quartet (closeout / threat-model / validation-matrix / reviewer-checklist)
  + stage doc; wired into `check.sh`.

## Non-claims

- Resilience and verifiable swap-evidence — **not** proof any model is safe, and **not** a
  refusal-defeating bypass. Simurgh's own denials are terminal.
- Provider-refusal fallback is opt-in, off by default, risk-raising, capped at one hop,
  and forbidden when Simurgh's own pre-check is terminal.
- Live providers are opt-in and `measured_not_certified`; CI is deterministic and offline.

## Out of scope (deferred)

- **Feature B** — telemetry → defensive-narrative pipeline (separate brainstorm/stage).
- Multi-hop fallback chains (>1 hop) and provider-health circuit breakers.

## External anchors

- [Introducing Claude Fable 5 and Claude Mythos 5](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5) — `stop_reason:"refusal"`, server-side `fallbacks`, fallback credit, `claude-fable-5` / `claude-mythos-5` / `claude-opus-4-8`.
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
- [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- AgentDyn (arXiv:2602.03117); Firewalls (arXiv:2510.05244); PISmith (arXiv:2603.13026); OWASP AI Agent Security; NIST AI RMF.
