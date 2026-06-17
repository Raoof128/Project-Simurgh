<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->

# Stage 3D — Threat Model

**Asset protected:** the boundaries _after_ input classification — preventing a
jailbreak that slipped past the input filter from becoming (a) trusted context,
(b) an unsafe tool call, or (c) an exported hidden-policy/secret leak, and
producing tamper-evident proof of what each boundary did.

## Attacker capabilities (in scope for 3D)

- Supplies untrusted `contexts[]` that forge system/developer authority, attempt
  role escalation, carry malformed schema or forbidden fields, claim `trusted`
  without a signature, are oversize, or embed secret/policy markers (context
  poisoning / indirect prompt injection).
- Drives the (mock) model toward an unsafe tool request — shell, network, secret
  access, prompt/policy export, file read, credential request, or an unknown tool.
- Drives the (mock) model toward output that leaks a system prompt, developer
  instruction, hidden policy, classifier internals, secrets, or raw tool args.
- Applies multi-turn softening across runs within a session.

## Out of scope (deferred, with stage names)

- Live model provider + HTTP gateway/API/Docker shell → **Stage 3E** (the
  "Anthropic can test it" layer; adapters behind `SIMURGH_LIVE_PROVIDER_ENABLED`).
- Live-model-specific exploits → **Stage 3F**.
- True semantic understanding of context/output (3D is deterministic heuristics
  over finite tables; an adversary aware of the tables can craft around them).
- Transport security / DoS — handled by existing 3A controls (size caps, token
  binding); not re-litigated here.

## Trust assumptions

- The audit HMAC secret is not attacker-known.
- Fixtures are the only place raw payloads live.
- All generated evidence (metrics, receipts, audit chain) is metadata-only.
- The mock provider is deterministic (no network/clock/randomness) and never
  echoes raw input; the live route never accepts a request-supplied model output.

## Containment invariant

Even when a jailbreak is not detected at the input boundary, Stage 3D ensures the
consequence is contained at the next boundary it reaches and that the containment
decision is recorded as a verifiable, metadata-only audit event.
