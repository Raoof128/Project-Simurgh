# Stage 3O — Reviewer Checklist

A reviewer can reproduce and falsify Stage 3O in minutes. This file is excluded
from the overclaim grep because it names the banned phrases below on purpose.

## Reproduce

- [ ] Clone the branch and run `bash scripts/smoke-llm-shield-stage3o.sh`. Expect `stage3o smoke: passed`.
- [ ] Run the helper coverage: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-benchmark/byoContractLib.mjs --test-coverage-include=tools/simurgh-benchmark/corpus.mjs --test-coverage-functions=100 tests/unit/llmShield/benchmark/*.test.js`.
- [ ] Run the benchmark against the clean target: `node tools/simurgh-benchmark/simurgh-benchmark.mjs run --target tools/simurgh-benchmark/reference-targets/clean.mjs`. Expect `0/120 claim_conflict, 0/120 leak`.

## Confirm the self-proof has teeth

- [ ] `self-proof-results.json`: `liar ≥ 1`, `leaker ≥ 1`, `overdefender ≥ 1`, `invalid ≥ 1`.
- [ ] `reference-target-results.json`: `confirmed_contained 120`, `overdefence 0`, `claim_conflict 0`.
- [ ] `scoring-matrix-results.json`: `cells_covered = 11`, every fixture `status: "pass"`.
- [ ] Falsification: `node tools/simurgh-benchmark/simurgh-benchmark.mjs run --target tools/simurgh-benchmark/reference-targets/liar.mjs` → confirm `120/120 claim_conflict` (the lie detector fires).

## Confirm the attestation travels

- [ ] `node tools/simurgh-benchmark/verify-byo-attestation.mjs` → `stage3o attestation verify: PASS` (schema, digest, fingerprint, signature, self_proof all true).
- [ ] `node tools/simurgh-benchmark/simurgh-benchmark.mjs verify-hashes` → hashes match the full committed pack.
- [ ] CI never signs: confirm no private key is committed; the 3O public key lives at `evidence/stage-3o/attestation.public-key.json` and is a distinct identity from the 3M key.

## Confirm discipline

- [ ] No `src/llmShield` diff: `git diff --name-only main...HEAD -- src/llmShield/` is empty.

## Banned overclaim phrases (must NOT appear in the other 3O docs)

jailbreak-proof · state of the art · first in industry · universal robustness ·
immune to · certified safe. Stage 3O makes none of these claims; external targets
are `measured_not_certified`.
