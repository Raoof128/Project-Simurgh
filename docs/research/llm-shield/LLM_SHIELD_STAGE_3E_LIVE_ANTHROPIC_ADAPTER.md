<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# LLM Shield — Stage 3E-live: Anthropic Live Provider Adapter

**Release:** `v0.7.1-stage-3e-live-anthropic-adapter` · **Builds on:** Stage 3E-core (`v0.7.0`)
**Spec:** `docs/superpowers/specs/2026-06-18-stage-3e-live-anthropic-adapter-design.md`
**Plan:** `docs/superpowers/plans/2026-06-18-stage-3e-live-anthropic-adapter.md`

> **A live provider call is an observed gateway event, not a proof of model safety.**

## What this is

Stage 3E-core shipped a no-network gateway around the Stage 3D containment core, with `live`
deliberately left as a fail-closed contract. Stage 3E-live activates the first live adapter —
**Anthropic only** — behind explicit environment gates, a **lazy** SDK import, **no
provider-side tools**, **no raw transcript persistence**, a bounded `minimal_summary` context,
denial-of-wallet caps, and **mandatory Stage 3D containment before export**.

The provider remains an untrusted text generator. Even when a live Anthropic response is
unsafe, tool-shaped, or leakage-shaped, the gateway blocks the consequence before execution or
export and leaves metadata-only, audit-chained evidence.

## How it works

1. **Env gate** (`liveProviderGuard.evaluateLiveProvider`) — live is disabled unless
   `SIMURGH_LIVE_PROVIDER_ENABLED=true`, provider is `anthropic`, a model is set, and a
   server-side `ANTHROPIC_API_KEY` is present. Any miss fails closed with a specific reason.
2. **Forbidden-field guard** — client-supplied `api_key`, provider bodies, etc. are rejected.
3. **Input + raw-context caps** — `SIMURGH_LIVE_MAX_INPUT_CHARS`, and a raw-context reject
   threshold `SIMURGH_LIVE_MAX_CONTEXT_CHARS` (8000) distinct from the provider-summary cap.
4. **Context provenance guard (3D)** — rejected context skips the provider entirely.
5. **Provider-safe context** (`buildProviderSafeContext`) — deterministic `minimal_summary`,
   capped to 500 chars/context and 2 KB total; sent transiently, never persisted raw.
6. **Live-call ledger** (`liveCallLedger`) — per-session / per-minute / per-day caps (OWASP LLM10).
7. **Adapter** (`anthropicProviderAdapter`) — lazy `import("@anthropic-ai/sdk")`, `messages.create`
   with no tools, an `AbortController` timeout, output length-capped.
8. **Containment tail (sealed 3D/3E-core)** — `normaliseProviderOutput` → tool gate →
   output firewall (runs even on refusals) → risk accumulator → 3E receipt → HMAC audit chain.

## What this is NOT

Not jailbreak immunity. Not a claim that Anthropic is safe or unsafe. Not a reproduction of any
public incident. Not production deployment. Receipts attest what the configured gateway did,
not whether the model was truly safe. Live tests are optional and never gate CI.
