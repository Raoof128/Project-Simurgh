<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — Threat Model

**Asset protected:** the Stage 3D containment boundary; gateway session tokens;
HMAC audit-chain integrity; the metadata-only receipt boundary; the tool-execution
boundary; the output-export boundary; generated-evidence privacy.

## In-scope attacker capabilities

- Malicious `input`; untrusted `contexts[]` and indirect injection via context content.
- Inducing tool-shaped provider output (via `recorded_fixture`) → must be gated, never executed.
- Inducing leakage-shaped provider output → must be blocked before export.
- Smuggling raw provider output / response body / API key through HTTP fields →
  rejected (`gateway_forbidden_field`).
- Attempting to enable `live` mode → fails closed (`gateway_live_provider_not_implemented`).
- Path-like `case_id` fixture selectors → rejected (`gateway_fixture_selector_invalid`).
- Denial-of-wallet via oversized input/context → capped.
- Inferring provider config from receipts → receipts are metadata-only.

## Out of scope (→ Stage 3E-live / 3F)

Real provider calls, live SDK invocation, provider-side tools, real tool execution,
browser/computer use, MCP, multi-agent, enterprise auth, persistent DB, production
hardening, live-model exploit benchmarks.

## Trust assumptions

Server env vars not attacker-controlled; HMAC audit secret not attacker-known; CI
runs `mock`; raw fixture text allowed only under `fixtures/**` and only synthetic;
generated evidence is metadata-only; no network egress exists in core.

## Containment invariant

Even a (future) live response must survive the Stage 3D consequence boundaries
before export. In core there is no live response — but the gateway proves the
boundary shell against mock + synthetic provider-shaped outputs with zero network.
