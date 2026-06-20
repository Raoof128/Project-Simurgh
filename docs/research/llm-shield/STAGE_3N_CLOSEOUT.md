# Stage 3N — Closeout

**Status:** SHIPPED (pending merge) — to be finalised on merge with the tag
`v1.7.0-stage-3n-claim-checked-security-utility-ledger`.

## What shipped

- Pure lib `tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs` (dotted-path reader,
  metric contract + anti-pooling, normalisation/ledger/panels, per-row hash
  binding, closed-world claim compiler, leakage scanner, hard-gate enforcer).
- Runner `tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs` (default verify /
  `--update-metrics`), reusing the Stage 3M verifier for the attestation row.
- 12-file frozen evidence pack in `docs/research/llm-shield/evidence/stage-3n/`.
- Five audit scripts + policy-drift guard + `check.sh` wiring (smoke + 100% helper
  coverage).
- Docs quartet + writeup + citation verification.

## Results

- Claim consistency: `unresolved_numeric_claim_conflicts = 0`,
  `claim_evidence_map_complete = true`, `prose_only_metric_claims_excluded = true`.
- Pooling: `cross_family_pooling_performed = 0`, `pooled_asr_reported = false`,
  refusal test passed.
- Attestation: Stage 3M verifier PASS, hash-bound.
- `frontier_status = not_applicable_degenerate` (no strictness knob in the guard
  layer).
- Zero `src/llmShield` change (policy-drift guard clean; `git diff main...HEAD -- src/llmShield/` empty).
- Lib unit tests: 16/16, 100% function coverage. `npm test` 676/676 (660 → +16).
  `scripts/check.sh`: 108 passed; the 4 non-passing steps are pre-existing and
  environmental (vendored `.venv` secret-scan hits, Stage 2.6 Windows .NET daemon
  tests, and Linux Rust daemon fmt/clippy — none runnable on this darwin host, and
  none touching Stage 3N). All Stage 3N steps (smoke + helper coverage) green.

## Non-claims

See `LLM_SHIELD_STAGE_3N_CLAIM_CHECKED_SECURITY_UTILITY_LEDGER.md`. Stage 3N proves
registered claims match frozen evidence; it does not prove blanket robustness,
model safety, or external superiority.

## Next

Stage 3O (BYO-gateway benchmark — others run the same metric contract) is the
natural successor. Not triggered by this stage.
