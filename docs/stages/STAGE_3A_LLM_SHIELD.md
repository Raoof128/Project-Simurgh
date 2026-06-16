# Stage 3A-alpha — Simurgh LLM Shield

Input-only LLM safety boundary. Classifies direct jailbreak and
system-prompt-extraction attempts in user input _before_ model invocation, calls a
deterministic local mock provider only for safe input, skips the provider for
blocked input, and emits a metadata-only safety receipt linked to a per-session
HMAC audit chain.

## Routes

- `POST /api/llm-shield/sessions`
- `POST /api/llm-shield/:sessionId/run` (Bearer token; `{ task_type, input }`)
- `GET  /api/llm-shield/:sessionId/verify` (Bearer token)

Enable by setting `SIMURGH_LLM_SHIELD_SECRET`.

## Verdicts

`safe` (mock model called) | `blocked` (model skipped). `safe` is a classification
result, not a policy permission.

## Audit event order

- Blocked: `LLM_INPUT_BLOCKED` -> `LLM_PROVIDER_SKIPPED` -> `LLM_RECEIPT_EXPORTED`
- Safe: `LLM_INPUT_ACCEPTED` -> `LLM_PROVIDER_CALLED` -> `LLM_OUTPUT_ACCEPTED` -> `LLM_RECEIPT_EXPORTED`

## Reproduce

    bash scripts/smoke-llm-shield.sh

## Non-claims

- Not a guarantee against all jailbreaks.
- Not a replacement for provider-side safety.
- Not proof that a live LLM is safe.
- Not production deployment.
- Not a universal content-moderation system.
- No network-egress guarantee absent host-level controls.
- Phrase matching is incomplete by construction.
- Receipts attest process, not ground truth.

## Out of scope (later stages)

Untrusted `contexts[]` + provenance guard (3C), tool gate (3D), output firewall for
leaked-prompt detection (3D/3B), obfuscation + `warning` verdict (3B), full 100+50
corpus (3B), demo UI (3A PR8), live model providers (3F).
