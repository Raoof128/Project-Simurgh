# Stage 3P — Reviewer Checklist

A reviewer can reproduce and falsify Stage 3P in minutes. This file is excluded
from the overclaim grep because it names the banned phrases below on purpose.

## Reproduce

- [ ] Clone the branch and run `bash scripts/smoke-llm-shield-stage3p.sh`. Expect `stage3p smoke: passed`.
- [ ] Run the helper coverage: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-benchmark/crossDefenceMatrix.mjs --test-coverage-include=tools/simurgh-benchmark/crossDefenceLib.mjs --test-coverage-include=tools/simurgh-benchmark/crossDefenceCatalogue.mjs --test-coverage-functions=100 tests/unit/llmShield/crossDefence/*.test.js`.
- [ ] Run a single replica: `node tools/simurgh-benchmark/simurgh-crossdefence.mjs run --target tools/simurgh-benchmark/cross-defence-targets/full-gateway-target.mjs`. Expect `25/25 cells contained, 0/30 over-defended`.

## Confirm the matrix discriminates (coverage profiles, not ranks)

- [ ] `targets/no-defence-baseline/containment-attestation.json`: every cell `allowed` (calibration floor).
- [ ] `targets/full-gateway-target/containment-attestation.json`: every cell `contained`, `full_coverage_claimed: true`.
- [ ] `targets/tool-gate-replica/containment-attestation.json`: `tool_request::*` cells `contained`, other rows `allowed` — a distinct fingerprint.
- [ ] No file exports `aggregate_score`, `rank`, `winner`, `best_target`, or a leaderboard ordering.

## Confirm the self-proof has teeth

- [ ] `self-proof/self-proof-results.json`: `summary.clean_baseline_passed: true`, `summary.all_expected_rejections_fired: true`.
- [ ] Each adversarial fixture `passed: true` with the expected detector: brand violation, ranking export, claim conflict, unverified full coverage, catalogue silent drop.

## Confirm the campaign travels

- [ ] `node tools/simurgh-attestation/verify-stage3p-catalogue.mjs` → `stage3p catalogue verify: PASS` (signature, digest binding, no silent drop).
- [ ] Each target: `node tools/simurgh-attestation/verify-stage3p-target.mjs docs/research/llm-shield/evidence/stage-3p/targets/<id>/containment-attestation.json` → PASS.
- [ ] `node tools/simurgh-benchmark/simurgh-crossdefence.mjs verify-hashes` → hashes match the full committed pack.
- [ ] CI never signs: no private key is committed. The Stage 3P public key lives at `evidence/stage-3p/keys/stage3p-public-key.json`, fingerprint `sha256:b1d14ba110f65808331a68f26188b6ed626bb6e76df653ce47d9e7a2f0c73caf` — a distinct identity from the 3L/3M/3O keys.

## Confirm discipline

- [ ] `bash scripts/policy-drift-guard-llm-shield-stage3p.sh` → PASS (no `src/llmShield` change in the branch, merge-base scope).
- [ ] `node scripts/privacy-audit-llm-shield-stage3p.mjs` → PASS (metadata-only, canary-only, self-proof does not pollute the catalogue).
- [ ] `bash scripts/security-audit-llm-shield-stage3p.sh` → PASS (no affirmative ranking/leaderboard wording in published artifacts).
