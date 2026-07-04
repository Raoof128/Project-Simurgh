// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_GENESIS_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";
import {
  bandVectorSpaceSize,
  leakageBitsUpperBound,
  validateGenesisPolicy,
} from "../../../../tools/simurgh-attestation/stage4n/core/genesisCore.mjs";

const goodPolicy = () => ({
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: "stage4n-extraction-seismograph-v0",
  scope: { lane: "extraction", source_stages: ["4K", "4L", "4M"], reserved_exit_families: [] },
  publication: {
    surface: "in_repo_jsonl",
    feed_path: "docs/research/llm-shield/evidence/stage-4n/heartbeat-feed.jsonl",
    append_only: true,
  },
  window_policy: {
    clock: "synthetic",
    cadence: "P1D",
    genesis_window: "synthetic-0000",
    max_overdue_heartbeats: 0,
  },
  reveal_policy: { aggregate_reveal_delay_windows: 2, freshest_oracle_non_claim: true },
  band_policy: {
    dimensions: BAND_DIMENSIONS,
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: LEAKAGE_BITS_MAX,
  },
  non_claims: [
    "band_not_count",
    "quiet_trace_not_safe_model",
    "reporting_liveness_not_detection_guarantee",
    "synthetic_clock_not_deployment_sla",
    "equivocation_detection_requires_two_artifacts",
    "inclusion_proofs_are_bilateral_not_public",
  ],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
});

test("leakage math is computed over the band VECTOR SPACE — spec §5.1 Fix 2", () => {
  assert.equal(bandVectorSpaceSize(BAND_DIMENSIONS), 9); // 3 × 3
  assert.equal(leakageBitsUpperBound(BAND_DIMENSIONS), 4); // ceil(log2 9)
  assert.equal(LEAKAGE_BITS_MAX, 4); // clean policy satisfies its own budget with equality
  // three 3-value dimensions would blow the v0 budget — the draft's defect, kept as a guard
  const three = { ...BAND_DIMENSIONS, cluster_count: ["0", "1-10", ">10"] };
  assert.equal(leakageBitsUpperBound(three), 5);
});

test("clean genesis policy validates; each mutation fails closed with a reason", () => {
  assert.deepEqual(validateGenesisPolicy(goodPolicy()), { ok: true });
  const cases = [
    [(p) => (p.schema = "wrong.v9"), "schema_mismatch"],
    [(p) => delete p.window_policy, "missing_field:window_policy"],
    [(p) => (p.window_policy.clock = "wall"), "clock_not_synthetic"],
    [(p) => (p.reveal_policy.aggregate_reveal_delay_windows = 0), "delay_not_positive_integer"],
    [(p) => (p.band_policy.band_vector_space_size = 27), "band_space_mismatch"],
    [(p) => (p.band_policy.leakage_bits_per_reveal_max = 3), "leakage_bound_exceeds_budget"],
    [(p) => (p.non_claims = p.non_claims.slice(1)), "non_claims_incomplete"],
    [(p) => (p.extra_top_level = 1), "unknown_field:extra_top_level"],
  ];
  for (const [mutate, reason] of cases) {
    const p = goodPolicy();
    mutate(p);
    assert.deepEqual(validateGenesisPolicy(p), { ok: false, reason }, reason);
  }
});
