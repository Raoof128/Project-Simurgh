# Stage 3X Reviewer Checklist

For an external reviewer with no private context. Run from the repo root, offline.

## One command

- [ ] `scripts/reproduce-vca-chain.sh` → `Stage 3X VCA chain reproduction: PASS` with
      `rungs_passed: 12, rungs_failed: 0` and the three separated summaries:
  - `tier_summary`: reproduce 3/3, evidence_hashes 7/7, index_only 2/2
  - `evidence_root_pinned_summary`: 10/10
  - `deep_per_file_rewalk_summary`: 5/5

## Offline core (no network, no gh, no Sigstore)

- [ ] `node tools/simurgh-attestation/verify-stage3x-timeline.mjs --reproduce` → `"ok": true`, with
      `evidence_root_digests_recomputed`, `merge_commits_recomputed`, `chain_summary_recomputed` true.
- [ ] `node tests/e2e/llm_shield_stage3x_tamper_runner.mjs` → `"all_passed": true`, counters zero.
- [ ] `node scripts/consistency-audit-llm-shield-stage3x.mjs` → index + signature + evidence-root
      10/10 + deep 5/5.
- [ ] `scripts/security-audit-llm-shield-stage3x.sh` → pass (no uniform claim; sacred non-claim present).

## Read the signed claims

- [ ] `timeline.index.json` → `claim_summary.claims_uniform_full_reproduction: false`;
      `non_claims` includes `does_not_reduce_live_capture_origin_self_reported` and
      `does_not_claim_uniform_12_12_full_reproduction`.
- [ ] Each rung carries a `replay_surface_reason`; the 2 index-only rungs (3M, 3R) state why.
