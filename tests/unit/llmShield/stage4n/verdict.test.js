// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import { seismographVerdict } from "../../../../tools/simurgh-attestation/stage4n/core/verdictCore.mjs";
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const fullPolicy = () => ({
  schema: SEISMOGRAPH_GENESIS_SCHEMA,
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
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
  non_claims: [...SEISMOGRAPH_NON_CLAIMS],
  crypto: { canonicalization: "RFC8785_JCS", digest: "SHA-256", signature: "Ed25519" },
});

const roots = {
  stage4k_exposure_root: recordDigest({ s: "4k" }),
  stage4l_cluster_budget_root: recordDigest({ s: "4l" }),
  stage4m_disclosure_root: recordDigest({ s: "4m" }),
};
const mkArgs = () => {
  const policy = fullPolicy();
  const perWindow = new Map();
  for (let k = 0; k <= 4; k++) {
    perWindow.set(k, { roots, rawCounts: { breach_count: 1, consumer_count: 4 } });
  }
  const records = buildChain({ policy, asOfIndex: 4, perWindow });
  return {
    policy,
    records,
    asOfWindow: "synthetic-0004",
    sourceRoots: roots,
    publicArtifacts: [
      { name: "heartbeat-feed.jsonl", value: records },
      { name: "genesis-policy.json", value: policy },
    ],
  };
};

test("clean chain verdicts 0 with no gate", () => {
  assert.deepEqual(seismographVerdict(mkArgs()), {
    rawCode: 0,
    reason: null,
    gate: null,
    as_of_window: "synthetic-0004",
  });
});

test("pinned order: a covered-up drop reports Q11 raw 47 (silence, not a chain error)", () => {
  const args = mkArgs();
  // Cover-up: drop heartbeat 0002, re-number positions, re-forge prev digests. Q10 must
  // pass (the chain is internally perfect); Q11 must catch the silence. This is the T1
  // arm's semantics and the reason Q10 does subsequence matching.
  let prev = recordDigest(args.policy);
  args.records = args.records
    .filter((r) => !(r.record_type === "heartbeat" && r.window_id === "synthetic-0002"))
    .map((r, i) => {
      const relinked = { ...r, position: i, prev_record_digest: prev };
      prev = recordDigest(relinked);
      return relinked;
    });
  const verdict = seismographVerdict(args);
  assert.equal(verdict.rawCode, 47);
  assert.equal(verdict.gate, "Q11");
  assert.equal(verdict.reason, "heartbeat_absent_for_expected_window");
});

test("Q17 fires only when a second artifact is supplied", () => {
  const args = mkArgs();
  const hb = args.records.find(
    (r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003"
  );
  args.secondArtifact = {
    record_type: "heartbeat",
    window_id: "synthetic-0003",
    digest: recordDigest({ fork: true }),
  };
  const verdict = seismographVerdict(args);
  assert.deepEqual({ rawCode: verdict.rawCode, gate: verdict.gate }, { rawCode: 48, gate: "Q17" });
  // same artifact honest -> clean
  args.secondArtifact.digest = recordDigest(hb);
  assert.equal(seismographVerdict(args).rawCode, 0);
});

test("malformed policy or as_of fails closed at Q10", () => {
  const args = mkArgs();
  args.policy = { schema: "nope" };
  assert.equal(seismographVerdict(args).rawCode, 49);
  const args2 = mkArgs();
  args2.asOfWindow = "wall-clock-now";
  assert.equal(seismographVerdict(args2).rawCode, 49);
});
