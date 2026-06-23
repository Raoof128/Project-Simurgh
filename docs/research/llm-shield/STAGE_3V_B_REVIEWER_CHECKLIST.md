# Stage 3V-B Reviewer Checklist

Run from the repo root.

- [ ] `scripts/reproduce-llm-shield-stage3vb.sh` → `Stage 3V-B reproduction: PASS`.
- [ ] `node tools/simurgh-attestation/verify-stage3vb-external-defense.mjs --reproduce` → `"ok": true`,
      with `trusted_harness_hashes_recomputed`, `stage3l_corpus_manifest_recomputed`, and
      `input_manifest_recomputed` all `true`.
- [ ] `node tests/e2e/llm_shield_stage3vb_tamper_runner.mjs` → `"all_passed": true`, counters zero.
- [ ] `node scripts/privacy-audit-llm-shield-stage3vb.mjs` → metadata-only PASS.
- [ ] `scripts/security-audit-llm-shield-stage3vb.sh` → pass.
- [ ] `scripts/policy-drift-guard-llm-shield-stage3vb.sh` → no `src/llmShield` change.
- [ ] Confirm `attestation.bundle.json` has `model_reexecuted_in_ci: false` and
      `known_limitations` includes `live_capture_origin_self_reported`.
- [ ] Confirm `capture-replay/lg4-frozen-capture.json` contains only `case_id` + `raw_lg4_output` +
      provenance — no prompt text.

## For the live release (v2.6.0)

- [ ] `scripts/assert-stage3vb-live-release.sh` → PASS (capture `live`, `runpod_gpu`, every
      provenance digest a real `sha256:`, timestamp not 1970).
- [ ] `capture-summary.json` headline reflects the real Llama Guard 4 run.
