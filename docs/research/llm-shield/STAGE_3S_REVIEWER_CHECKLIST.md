# Stage 3S — Reviewer Checklist

A reviewer can reproduce and falsify Stage 3S in minutes. This file names the banned
concepts (overclaim, finding, bypass) on purpose and is excluded from any overclaim grep.

Stage 3S public key fingerprint: `sha256:abf34ebd286b0ca166d741a30522cc4232850a77eb5f489518d216f1d5e19137`

## Reproduce

- [ ] `bash scripts/smoke-llm-shield-stage3s.sh` → `stage3s smoke: passed` (verify-only, no gateway re-run).
- [ ] Helper coverage (100% functions): `node --test --experimental-test-coverage --test-coverage-include=tools/simurgh-narrative/evidenceDigest.mjs --test-coverage-include=tools/simurgh-narrative/claimChecker.mjs --test-coverage-include=tools/simurgh-narrative/renderer.mjs --test-coverage-include=tools/simurgh-narrative/selfProof.mjs --test-coverage-functions=100 tests/unit/llmShield/narrative/{evidenceDigest,claimChecker,renderer,narrativeSelfProof}.test.js`.
- [ ] Real-gateway E2E: `SIMURGH_LLM_SHIELD_SECRET=… node --test tests/e2e/llm_shield_stage3s_narrative.mjs`.

## Confirm the generation is contained (dogfood)

- [ ] The narrative slots are drafted through the real gateway (recorded_fixture), and `gateway-receipt.json` exists with `output_hash == hashPrompt(model output)`.
- [ ] `model-slots.source.gateway_output_hash == receipt.output_hash` (receipt-binding) — slots cannot be swapped after the run.

## Confirm the narrative cannot lie (the teeth)

- [ ] `security-audit-llm-shield-stage3s.mjs`: self-proof `all_passed`, `automatic_findings_rendered:0`, `narrative_claim_conflicts_rendered:0`, conflict teeth fired (`attempts ≥ 1`).
- [ ] Schema wall: fences / prefixes / arrays / multiple objects → `narrative_schema_violation`.
- [ ] Vocabulary wall: a slot escalating to a misconduct finding or using forbidden wording → rejected.
- [ ] Field-equality: a slot whose ref resolves but the relation is false → `narrative_claim_conflict`, never rendered.

## Confirm the evidence

- [ ] `verify-stage3s-narrative.mjs`: signature valid + digest-binding + receipt-binding + no-finding — all true.
- [ ] `consistency-audit-llm-shield-stage3s.mjs`: every `source_inputs[]` file exists, file-byte digest matches, and the digest re-derives byte-identically.
- [ ] `verify-hashes`: every evidence file matches `evidence-hashes.json`.

## Confirm discipline

- [ ] `policy-drift-guard-llm-shield-stage3s.sh`: PASS — **zero `src/llmShield` change** (fail-closed if no base ref resolves in CI).
- [ ] `privacy-audit-llm-shield-stage3s.mjs`: metadata-only; no raw-data tokens; privacy booleans not overclaimed.
- [ ] Live Fable drafting is opt-in / `measured_not_certified`; CI is deterministic + offline.
- [ ] The private 3S key lives outside the repo (`~/.simurgh/3s-ed25519.pem`); only the public key + fingerprint are committed.
