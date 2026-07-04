// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import {
  scanPublicSurface,
  verifyLeakageBudget,
  verifyRevealSchedule,
} from "../../../../tools/simurgh-attestation/stage4n/core/gatesCore.mjs";

const policy = {
  reveal_policy: { aggregate_reveal_delay_windows: 2 },
  band_policy: {
    dimensions: {
      breach_count: ["0", "1-5", ">5"],
      consumer_count: ["0", "1-10", ">10"],
    },
    band_vector_space_size: 9,
    leakage_bits_per_reveal_max: 4,
  },
};
const perWindow = (n) => {
  const m = new Map();
  for (let k = 0; k <= n; k++) {
    m.set(k, {
      roots: {
        stage4k_exposure_root: recordDigest({ k, s: "4k" }),
        stage4l_cluster_budget_root: recordDigest({ k, s: "4l" }),
        stage4m_disclosure_root: recordDigest({ k, s: "4m" }),
      },
      rawCounts: { breach_count: 3, consumer_count: 7 },
    });
  }
  return m;
};
const clean = () => buildChain({ policy, asOfIndex: 4, perWindow: perWindow(4) });

test("Q13 passes clean; early (T6), overdue (T7), and commitment mismatch (T8) fail exactly", () => {
  assert.deepEqual(verifyRevealSchedule(clean(), policy, 4), { raw: 0 });

  const early = clean().map((r) =>
    r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0000"
      ? { ...r, revealed_at_window: "synthetic-0000" }
      : r
  );
  assert.deepEqual(verifyRevealSchedule(early, policy, 4), { raw: 52, reason: "reveal_early" });

  const overdue = clean().filter(
    (r) => !(r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0001")
  );
  assert.deepEqual(verifyRevealSchedule(overdue, policy, 4), { raw: 52, reason: "reveal_overdue" });

  const mismatched = clean().map((r) =>
    r.record_type === "aggregate_reveal" && r.window_id === "synthetic-0000"
      ? { ...r, bands: { ...r.bands, breach_count: ">5" } }
      : r
  );
  assert.deepEqual(verifyRevealSchedule(mismatched, policy, 4), {
    raw: 50,
    reason: "reveal_commitment_mismatch",
  });

  // Fix 3: windows inside the delay horizon are PENDING, never overdue — as_of=1, d=2
  const young = buildChain({ policy, asOfIndex: 1, perWindow: perWindow(1) });
  assert.deepEqual(verifyRevealSchedule(young, policy, 1), { raw: 0 });
});

test("Q14 recomputes leakage from policy alone (T9 + recompute mismatch)", () => {
  assert.deepEqual(verifyLeakageBudget(clean(), policy), { raw: 0 });

  const lyingCopy = clean().map((r) =>
    r.record_type === "aggregate_reveal"
      ? { ...r, self_leakage: { ...r.self_leakage, leakage_bits_upper_bound: 2 } }
      : r
  );
  assert.deepEqual(verifyLeakageBudget(lyingCopy, policy), {
    raw: 53,
    reason: "self_leakage_recompute_mismatch",
  });

  const fatPolicy = structuredClone(policy);
  fatPolicy.band_policy.dimensions.cluster_count = ["0", "1-10", ">10"]; // 27 vectors -> 5 bits
  fatPolicy.band_policy.band_vector_space_size = 27;
  assert.deepEqual(verifyLeakageBudget(clean(), fatPolicy), {
    raw: 53,
    reason: "band_vector_space_exceeds_budget",
  });
});

test("Q16 catches raw counts (T10) and bilateral material in public artifacts (T11)", () => {
  const publicArtifacts = [
    { name: "heartbeat-feed.jsonl", value: clean() },
    { name: "genesis-policy.json", value: policy },
  ];
  assert.deepEqual(scanPublicSurface(publicArtifacts), { raw: 0 });

  const rawCount = [...publicArtifacts, { name: "summary.json", value: { breach_count: 7 } }];
  assert.deepEqual(scanPublicSurface(rawCount), { raw: 54, reason: "raw_count_public" });

  const proofLeak = [
    ...publicArtifacts,
    { name: "oops.json", value: { nested: { proof_path: [] } } },
  ];
  assert.deepEqual(scanPublicSurface(proofLeak), {
    raw: 54,
    reason: "inclusion_proof_material_public",
  });

  const tierLeak = [...publicArtifacts, { name: "oops2.json", value: { bundle_tier: "Tier-R" } }];
  assert.deepEqual(scanPublicSurface(tierLeak), { raw: 54, reason: "tier_label_public" });

  const respondentLeak = [
    ...publicArtifacts,
    { name: "oops3.json", value: [{ respondent_id_digest: "sha256:aa" }] },
  ];
  assert.deepEqual(scanPublicSurface(respondentLeak), {
    raw: 54,
    reason: "respondent_material_public",
  });
});
