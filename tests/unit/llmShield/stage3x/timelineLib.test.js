import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VCA_RUNGS,
  buildChainSummary,
  buildTimelineIndex,
} from "../../../../tools/simurgh-attestation/stage3xTimelineLib.mjs";

test("VCA_RUNGS has 12 frozen rungs 3M..3W", () => {
  assert.equal(VCA_RUNGS.length, 12);
  assert.equal(Object.isFrozen(VCA_RUNGS), true);
  assert.equal(VCA_RUNGS[0].stage, "3M");
  assert.equal(VCA_RUNGS[VCA_RUNGS.length - 1].stage, "3W");
});
test("chain summary matches the locked counts", () => {
  assert.deepEqual(buildChainSummary(), {
    rungs_total: 12,
    tag_commit_pinned: 12,
    evidence_hashes_reverified: 10,
    full_reproduce_available: 3,
    index_only: 2,
  });
});
test("index: schema, claim_summary false, non-claims, deterministic", () => {
  const idx = buildTimelineIndex();
  assert.equal(idx.schema, "simurgh.vca.public_timeline.v1");
  assert.equal(idx.claim_summary.claims_uniform_full_reproduction, false);
  assert.ok(idx.non_claims.includes("does_not_claim_uniform_12_12_full_reproduction"));
  assert.ok(idx.non_claims.includes("does_not_reduce_live_capture_origin_self_reported"));
  assert.deepEqual(idx, buildTimelineIndex());
});
test("every rung is tag+commit pinned with a replay_surface_reason", () => {
  const idx = buildTimelineIndex();
  assert.equal(idx.rungs.length, 12);
  for (const r of idx.rungs) {
    assert.match(r.merge_commit, /^[0-9a-f]{40}$/);
    assert.ok(typeof r.replay_surface_reason === "string" && r.replay_surface_reason.length > 0);
  }
});
test("index_only rungs (3M,3R) carry reasons; 3R has null evidence_dir + digest", () => {
  const idx = buildTimelineIndex();
  const m = idx.rungs.find((r) => r.stage === "3M");
  const rr = idx.rungs.find((r) => r.stage === "3R");
  assert.equal(m.index_only_reason, "index_only_for_3x_chain_hashing");
  assert.equal(rr.index_only_reason, "index_only_source_feature_stage_no_evidence_directory");
  assert.equal(rr.evidence_root_digest, null);
});
test("evidence_hashes rungs expose a sha256 evidence_root_digest", () => {
  const idx = buildTimelineIndex();
  const u = idx.rungs.find((r) => r.stage === "3U");
  assert.equal(u.replay_tier, "evidence_hashes");
  assert.match(u.evidence_root_digest, /^sha256:[0-9a-f]{64}$/);
});
test("3M still gets a public_key_fingerprint from attestation.public-key.json", () => {
  const idx = buildTimelineIndex();
  const m = idx.rungs.find((r) => r.stage === "3M");
  assert.match(m.public_key_fingerprint, /^sha256:[0-9a-f]{64}$/);
});
test("reproduce-tier rungs (3V/3V-B/3W) also have evidence_hashes_available", () => {
  const idx = buildTimelineIndex();
  for (const s of ["3V", "3V-B", "3W"]) {
    const r = idx.rungs.find((x) => x.stage === s);
    assert.equal(r.replay_tier, "reproduce");
    assert.equal(r.evidence_hashes_available, true);
    assert.match(r.evidence_root_digest, /^sha256:[0-9a-f]{64}$/);
  }
});
