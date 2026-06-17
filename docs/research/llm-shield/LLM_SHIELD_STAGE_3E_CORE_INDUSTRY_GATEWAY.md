<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3E-core — LLM Shield Industry Gateway

**Status:** implemented (no-network gateway shell; mock + synthetic recorded_fixture; live fail-closed)
**Release target:** `v0.7.0-stage-3e-core-industry-gateway`
**Builds on:** Stage 3D provenance & containment (`v0.6.0-stage-3d-llm-containment`).

## Steel-thread sentence

> Stage 3E-core does not prove live-provider jailbreak resistance. It exposes the
> Stage 3D containment core through a no-network provider gateway so reviewers can
> test that unsafe consequences are blocked, audited, and receipt-backed.

Two load-bearing invariants (verbatim):

> Stage 3E-core defines live mode only as a fail-closed contract. It contains no
> live provider adapter and performs no provider network call.

> recorded_fixture mode is not a transcript replay system. It is a synthetic
> provider-shaped fixture replay system.

The provider is an untrusted text generator, not an authority boundary.

## What it adds

A new gateway at `/api/llm-shield/gateway/*` (sessions, run, verify, openapi.json),
mounted **before** the base router and reusing the existing session/token scheme
(`getStore("llmShieldGatewaySessions")`, secret label `llm-shield-gateway`). The
run handler composes the 3A/3C input firewall and the Stage 3D boundaries verbatim:

1. **Context provenance** — untrusted contexts demoted/rejected (provider skipped on reject).
2. **Provider (no network)** — `mock` (reuses 3D scenarios) or `recorded_fixture`
   (synthetic, hash-verified, selected by opaque `case_id` via manifest). `live`
   always fails closed (`gateway_live_provider_not_implemented`).
3. **Tool gate** — provider-side tools off; tool-shaped output → 3D gate, never executed.
4. **Output firewall** — provider output distrusted → 3D firewall; blocked output hash-only.
5. **Risk accumulator** — reuses 3D thresholds; gateway signals additive.
6. **Receipt** — new `gatewayReceipt` (`type simurgh.llm_gateway_receipt.v1`,
   `schema_version "3E"`); `safetyReceipt.js`/`stage3dReceipt.js` untouched.

Denial-of-wallet caps (OWASP LLM10), forbidden-field rejection (no `api_key` /
`provider_response_body` / `synthetic_provider_output` over HTTP), OpenAPI 3.1
(mock examples only), and a non-root Docker default round it out.

## Non-claims (loud)

Inherits all 3A/3B/3C/3D non-claims. New for 3E-core:

- Does **not** prove live-provider jailbreak immunity.
- Does **not** call any live provider and ships **no** live adapter.
- Does **not** execute real tools or enable provider-side tools.
- Does **not** store raw provider transcripts, request/response bodies, or API
  keys (it has no mechanism to obtain them); `recorded_fixture` is synthetic-only.
- Is **not** production deployment and claims no compliance/attestation.
- **Receipts attest what the configured gateway did, not whether the model was
  truly safe.**

## Evidence

70-fixture synthetic corpus (10/category), `metrics.json`, OpenAPI, receipt
samples, captured gate outputs under `evidence/stage-3e/`. Gates:
`scripts/{smoke,security-audit,privacy-audit,docker-smoke}-llm-shield-stage3e.*`,
all wired into `check.sh` (docker skips if unavailable; CI needs no keys, no network).

## References

- Spec: `docs/superpowers/specs/2026-06-17-stage-3e-core-llm-shield-industry-gateway-design.md`
- Plan: `docs/superpowers/plans/2026-06-17-stage-3e-core-llm-shield-industry-gateway.md`
- `STAGE_3E_CORE_THREAT_MODEL.md`, `STAGE_3E_CORE_VALIDATION_MATRIX.md`,
  `STAGE_3E_CORE_REVIEWER_CHECKLIST.md`, `STAGE_3E_CORE_CLOSEOUT.md`.
- Live adapters → `2026-06-17-stage-3e-live-provider-adapters-design.md` (Stage 3E-live).
