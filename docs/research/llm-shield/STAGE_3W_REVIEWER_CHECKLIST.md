# Stage 3W Reviewer Checklist

Run from the repo root.

## Offline (core — no network)

- [ ] `scripts/reproduce-llm-shield-stage3w.sh` → `Stage 3W reproduction: PASS`.
- [ ] `node tools/simurgh-attestation/verify-stage3w-witness.mjs --reproduce` → `"ok": true`, with
      `subjects_recomputed` and `witness_verdict_recomputed` both `true`.
- [ ] `node tests/e2e/llm_shield_stage3w_tamper_runner.mjs` → `"all_passed": true`, counters zero.
- [ ] `scripts/security-audit-llm-shield-stage3w.sh` → pass (sacred non-claim present; no Sigstore
      object in offline evidence).
- [ ] `node scripts/privacy-audit-llm-shield-stage3w.mjs` → metadata-only PASS.
- [ ] `scripts/policy-drift-guard-llm-shield-stage3w.sh` → no `src/llmShield` change.
- [ ] Confirm `attestation.bundle.json` predicate has `witnessed_stage: "3V-B"`,
      `model_reexecuted_in_ci: false`, `online_witness.required_for_offline_verification: false`, and
      `non_claims` includes `does_not_reduce_live_capture_origin_self_reported`.

## Online (additive — NOT required for offline verification)

- [ ] After the v2.7.0 tag triggers the witness workflow:
      `gh attestation verify docs/research/llm-shield/evidence/stage-3w/github-witness-verdict.json --repo Raoof128/Project-Simurgh`.
- [ ] `gh run list --workflow stage-3w-witness.yml --limit 1` shows a successful run.
