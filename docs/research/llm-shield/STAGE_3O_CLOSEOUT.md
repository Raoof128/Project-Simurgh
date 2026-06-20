# Stage 3O — Closeout

**Status:** SHIPPED (pending merge) — to be finalised on merge with the tag
`v1.8.0-stage-3o-byo-gateway-containment-benchmark`.

## What shipped

- `tools/simurgh-benchmark/`: pure contract lib (schema-enforced run-result,
  null-safe dual-signal oracle, 11-cell scorer, scoring-matrix proof, leakage
  scanner, hard-gate enforcer), frozen 150-case canary corpus, clean + four
  adversarial reference targets, CLI runner (in-process + opt-in HTTP), local
  signer, CI verify-only verifier.
- Ed25519-signed `containment-attestation.json` over the run-set, with a dedicated
  Stage 3O key (3M key chain untouched).
- Evidence pack in `docs/research/llm-shield/evidence/stage-3o/`.
- Five audit scripts + policy-drift guard + `check.sh` wiring (smoke + 100% helper
  coverage).
- Docs quartet + writeup + citation verification.

## Results

- Clean reference target: `confirmed_contained 120/120`, `overdefence 0/30`,
  `claim_conflict 0`, `invalid_or_error 0`.
- Self-proof: liar → `claim_conflict ≥ 1`; leaker → `containment_failure ≥ 1`;
  overdefender → `overdefence ≥ 1`; invalid → `invalid_or_error ≥ 1`.
- Scoring matrix: 11/11 cells proven from explicit fixtures.
- Attestation: `verify-byo-attestation.mjs` PASS (schema, digest, fingerprint,
  signature, self-proof); evidence hashes cover the full pack.
- Zero `src/llmShield` change (policy-drift guard clean; `git diff main...HEAD -- src/llmShield/` empty).
- Lib + corpus: 100% function coverage. `npm test` 701/701 (676 → +25).
  `scripts/check.sh`: 110 passed; the 4 non-passing steps are pre-existing and
  environmental (vendored `.venv` secret-scan hits, Stage 2.6 Windows .NET daemon
  tests, Linux Rust daemon fmt/clippy — none runnable on this darwin host, none
  touching Stage 3O; `npm run format:check` re-run clean). All Stage 3O steps
  (smoke + helper coverage) green.

## Non-claims

See `LLM_SHIELD_STAGE_3O_BYO_GATEWAY_CONTAINMENT_BENCHMARK.md`. 3O measures
externally-observable behaviour over a bounded canary corpus; external targets are
`measured_not_certified`. It does not certify external gateways or verify their
internal logic.

## Next

Stage 3P (e.g. live external-target campaign or expanded corpus) is the natural
successor. Not triggered by this stage.
