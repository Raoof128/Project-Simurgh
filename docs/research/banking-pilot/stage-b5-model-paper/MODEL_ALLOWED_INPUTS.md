# Stage B5 — Allowed Model Inputs

The model may receive ONLY the following classes of input. Everything the model
sees must already be public-safe, aggregate-only, and free of personal or
financial data.

## Allowed

1. `MODEL_REVIEW_INPUT_PACK.md` — the sanitised evidence pack (sole factual source).
2. The prompt files in `prompts/`.
3. Published repo documentation that is already aggregate-only: closeouts,
   claim audits, specs, plans, READMEs.
4. Gate result counts (test totals, smoke pass counts, audit PASS lines).
5. Schema-level descriptions of payloads (field names from the public API
   contract, never values).
6. The generated, attack-scanned evidence fixtures under
   `docs/research/banking-pilot/evidence/` (already privacy-audited).

## Explicitly allowed claims (the model may state these)

```text
Metadata-only integrity evidence
Fictional banking-adjacent prototype
Trusted internal dry run
Deterministic AI privacy firewall
AI-style explanation without sensitive financial payloads
```

## Conditions

- Inputs are frozen at evidence-freeze (main @ `92dabb4`, PR #28 merge,
  2026-06-12). Later code changes do not retroactively enter the pack.
- If a pass appears to need data not listed here, the pass stops and the gap is
  recorded in `MODEL_RESPONSE_LOG.md` — the input pack is never widened
  mid-pass.
