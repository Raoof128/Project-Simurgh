# Stage 3Q — Reviewer Checklist

A reviewer can reproduce and falsify Stage 3Q in minutes. This file is excluded from
the overclaim grep because it names the banned concepts below on purpose.

## Reproduce

- [ ] Run `bash scripts/smoke-llm-shield-stage3q.sh`. Expect `stage3q smoke: passed`.
- [ ] Helper coverage: `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-temporal/temporalLib.mjs --test-coverage-include=tools/simurgh-temporal/registryChain.mjs --test-coverage-include=tools/simurgh-temporal/selfProof.mjs --test-coverage-functions=100 tests/unit/llmShield/temporal/*.test.js`.
- [ ] `node tools/simurgh-temporal/registry.mjs manifest-check` → `PASS (1 snapshots, 0 diffs)` at genesis.

## Confirm the timeline is tamper-evident

- [ ] `node tools/simurgh-temporal/verify-stage3q-registry.mjs` → PASS (signature, chain, fingerprint, `references_valid: true` — the registry's claims about the committed 3P catalogue/targets still hold).
- [ ] `node tools/simurgh-temporal/verify-stage3q-append.mjs` → PASS (genesis: `entries[0].previous_entry_digest == "GENESIS"`).
- [ ] `node tools/simurgh-temporal/registry.mjs verify-hashes` → hashes match the full committed pack.

## Confirm the diff has anti-laundering teeth

- [ ] `self-proof/self-proof-results.json`: `summary.clean_baseline_passed: true`, `summary.all_expected_detectors_fired: true`, `summary.integrity_laundering_successes: 0`.
- [ ] Every fixture `passed: true`: genuine regression → `regressed`; genuine improvement → `improved`; cross-lineage → `cross_target_diff_violation`; corpus mismatch → `non_comparable`; before/after integrity failure → `integrity_failure` (never regressed/improved); tampered entry → `registry_chain_violation`; removed/reordered → `append_continuity_violation`; missing/invalid timestamp → `manifest_timestamp_violation`.

## Confirm discipline

- [ ] CI never signs: no private key is committed. The Stage 3Q public key lives at `evidence/stage-3q/keys/stage3q-public-key.json`, fingerprint `sha256:97f7eb29d734c59ca4ab2073ba0399e528b9ff72a546a28d04399f53c4e75252` — distinct from the 3L/3M/3O/3P keys.
- [ ] `bash scripts/policy-drift-guard-llm-shield-stage3q.sh` → PASS (no `src/llmShield` change; fail-closed — warns + falls back rather than passing without checking a range).
- [ ] `node scripts/privacy-audit-llm-shield-stage3q.mjs` → PASS (metadata-only; self-proof does not pollute the real registry/diffs).
- [ ] `bash scripts/security-audit-llm-shield-stage3q.sh` → PASS (no cross-target ranking fields in the published registry/diffs).

## Genesis note

At first release `diff-manifest.json` is intentionally empty (zero real diffs); the
diff engine's correctness is proven entirely by the self-proof pack. Real regression
diffs are added only when two valid same-lineage snapshots exist.
