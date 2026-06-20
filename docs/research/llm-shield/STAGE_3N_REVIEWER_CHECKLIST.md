# Stage 3N — Reviewer Checklist

A reviewer can reproduce and falsify Stage 3N in minutes. This file is excluded
from the overclaim grep because it names the banned phrases below on purpose.

## Reproduce

- [ ] Clone the branch and run `bash scripts/smoke-llm-shield-stage3n.sh`. Expect it to end with `stage3n smoke: passed`.
- [ ] Regenerate from frozen sources: `SIMURGH_RUN_STAGE3N=1 bash scripts/smoke-llm-shield-stage3n.sh`. Expect the same pass with no diff in `docs/research/llm-shield/evidence/stage-3n/`.
- [ ] Run the lib tests with coverage: `node --test --experimental-test-coverage --test-coverage-include=tests/e2e/llm_shield_stage3n_claim_ledger_lib.mjs --test-coverage-functions=100 tests/unit/llmShield/stage3nClaimLedgerLib.test.js`.

## Confirm the claims

- [ ] `claim-consistency-report.json` shows `unresolved_numeric_claim_conflicts: 0`, `claim_evidence_map_complete: true`, `prose_only_metric_claims_excluded: true`.
- [ ] The historical claim `3n.claim.stage3h_l2_historical_overdefence` is `status: "excluded_from_ledger"` with a reason — NOT a ledger row.
- [ ] `denominator-pooling-report.json` shows `cross_family_pooling_performed: 0` and `pooled_asr_reported: false`.
- [ ] `evidence-hashes.json` contains 7 entries (4 source families + 3 Stage 3M artifacts).
- [ ] `stage3m-attestation-validation.json` shows `verifier_pass: true`.

## Confirm the discipline

- [ ] No `src/llmShield` diff: `git diff --name-only main...HEAD -- src/llmShield/` is empty.
- [ ] Falsification test: temporarily edit a registered `expected` value in `tests/e2e/llm_shield_stage3n_claim_ledger_runner.mjs` and re-run — the runner must FAIL with a hard-gate error. Revert.

## Banned overclaim phrases (must NOT appear in the other 3N docs)

jailbreak-proof · state of the art · first in industry · universal robustness ·
immune to. Stage 3N makes none of these claims; it only proves registered claims
match frozen evidence.
