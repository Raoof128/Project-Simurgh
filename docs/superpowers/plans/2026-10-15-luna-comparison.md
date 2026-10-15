# Frozen Luna 6 comparison

Owner authorization: supplied API key and requested Luna 6. This additive study preserves all
eleven earlier source/evidence families. No environment settings change or external outreach.

## Protocol before inference

- Exact model `gpt-6-luna`, Responses API, `store:false`, reasoning effort `none`, temperature
  0.7, top_p 0.9, 128 output tokens, plain text JSON prompting. No schema coercion or repair.
- Reuse the exact 24 Meta-study cases and prompt builder. Three repetitions, two host-orchestrated
  turns per case: 144 requests maximum. Repetition indices are not API sampling seeds.
- Fixed HTTPS origin, default certificate verification, redirects disabled, no retries, 45-second
  timeout, 8 KiB request body maximum and 1 MiB response maximum. Only synthetic inputs sent.
  Key read from an external file in memory, never forwarded to runtime children or written to logs.
- First transport, HTTP or response-envelope failure stops subsequent API requests; retain the
  failed attempt and every remaining slot as skipped. Refusals/incomplete outputs remain invalid
  tool proposals. No replacements. Exclusive capture/journal creation prevents accidental reruns.
- At most 18,432 output tokens. Official short-context standard prices observed 2026-10-15:
  input $0.10/M, cached input $0.01/M, cache writes $0.125/M, output $0.50/M.
  Small synthetic requests make expected spend well below $1. Report usage and a conservative
  estimate using $0.125/M for every input token; this is not an invoice or hard account spend cap.
- Freeze protocol and exact source inventory in Git before collection. Capture records that commit.
  Replay requires unchanged files and ancestor commit blobs, complete ordered 72-row inventory,
  matching messages/observed feedback, provider response-derived proposals and valid usage.
- Replay all saved proposals under enforced, bypass and deny-all through the existing real
  SDK/Redis/kernel runtime. These are fixed-action controls, not independent agent continuations.
  Select the first complete enforced workflow for both existing process-kill recovery probes.
- Publish all outcomes. No model ranking, production assurance, incident prevention or population
  robustness claim. API template/tokenizer, serving backend and nondeterminism differ from Meta.
  Existing cases are already visible in this repository; no external holdout claim.

## Gate lifecycle

- active_phase: Luna comparison capture and offline replay.
- protected_surface: new comparison tools/protocol plus the exact frozen inherited input set.
- next_phase_behaviour: preserve this capture; successor experiments add their own artifacts.
- maintenance_behaviour: never rewrite raw responses; a correction creates a versioned successor.
- sunset_or_migration_condition: retire explicitly if pinned dependencies cannot be reproduced;
  retain evidence and failed checks, never silently bypass validation.
- anti_vacuity_condition: exact nonempty 24 × 3 × 2 inventory, all three control identities,
  response/proposal linkage and semantic effect equality; missing rows or failed calls cannot pass
  as successful generation or containment.

## Work ledger

- Design recorded before implementation. Twelve tests exercise transport failures, refusal handling,
  inventory tampering and credential containment without paid calls. All pass; inherited 21-test
  native runtime suite also passes. No paid inference before protocol commitment.
