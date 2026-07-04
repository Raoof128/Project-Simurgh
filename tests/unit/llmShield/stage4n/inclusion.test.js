// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  merkleRootSorted,
  recordDigest,
} from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  merklePathSorted,
  verifyMerklePath,
} from "../../../../tools/simurgh-attestation/stage4n/core/merklePath.mjs";
import {
  verifyInclusionProof,
  verifyNoEquivocation,
} from "../../../../tools/simurgh-attestation/stage4n/core/inclusionCore.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4n/core/chainCore.mjs";
import { SEISMOGRAPH_INCLUSION_SCHEMA } from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";

const leaves = [recordDigest({ b: 1 }), recordDigest({ b: 2 }), recordDigest({ b: 3 })];
const root = merkleRootSorted(leaves);

test("merklePathSorted round-trips against merkleRootSorted for every leaf", () => {
  for (const leaf of leaves) {
    const path = merklePathSorted(leaves, leaf);
    assert.equal(verifyMerklePath(leaf, path, root), true);
  }
  // wrong root / wrong leaf both fail
  assert.equal(verifyMerklePath(leaves[0], merklePathSorted(leaves, leaves[0]), leaves[1]), false);
  assert.equal(
    verifyMerklePath(recordDigest({ evil: 1 }), merklePathSorted(leaves, leaves[0]), root),
    false
  );
  // singleton tree: empty path, leaf === root
  assert.deepEqual(merklePathSorted([leaves[0]], leaves[0]), []);
  assert.equal(verifyMerklePath(leaves[0], [], leaves[0]), true);
});

const policy = { reveal_policy: { aggregate_reveal_delay_windows: 2 } };
const mkFeed = (disclosureRoot) => {
  const perWindow = new Map();
  for (let k = 0; k <= 3; k++) {
    perWindow.set(k, {
      roots: {
        stage4k_exposure_root: recordDigest({ k, s: "4k" }),
        stage4l_cluster_budget_root: recordDigest({ k, s: "4l" }),
        stage4m_disclosure_root: disclosureRoot,
      },
      rawCounts: { breach_count: 1, consumer_count: 2 },
    });
  }
  return buildChain({ policy, asOfIndex: 3, perWindow });
};

const mkProof = (feed, bundleDigest) => ({
  schema: SEISMOGRAPH_INCLUSION_SCHEMA,
  stage: "4N",
  distribution: "bilateral_only",
  window_id: "synthetic-0003",
  heartbeat_digest: recordDigest(
    feed.find((r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003")
  ),
  bundle_digest: bundleDigest,
  bundle_tier: "Tier-A",
  included_under: "stage4m_disclosure_root",
  proof_path: merklePathSorted(leaves, bundleDigest),
  root,
});

test("Q12 accepts a valid bilateral proof and fails each tamper", () => {
  const feed = mkFeed(root);
  assert.deepEqual(verifyInclusionProof({ proof: mkProof(feed, leaves[1]), feedRecords: feed }), {
    raw: 0,
  });

  const badTier = { ...mkProof(feed, leaves[1]), bundle_tier: "Tier-X" };
  assert.deepEqual(verifyInclusionProof({ proof: badTier, feedRecords: feed }), {
    raw: 51,
    reason: "unknown_tier",
  });

  const absent = { ...mkProof(feed, leaves[1]), heartbeat_digest: recordDigest({ ghost: 1 }) }; // T5
  assert.deepEqual(verifyInclusionProof({ proof: absent, feedRecords: feed }), {
    raw: 51,
    reason: "referenced_heartbeat_absent",
  });

  const badPath = { ...mkProof(feed, leaves[1]), bundle_digest: recordDigest({ other: 1 }) };
  assert.deepEqual(verifyInclusionProof({ proof: badPath, feedRecords: feed }), {
    raw: 51,
    reason: "proof_path_invalid",
  });
});

test("Q17 needs two artifacts and detects a forked story (T2)", () => {
  const feed = mkFeed(root);
  const hb3 = feed.find((r) => r.record_type === "heartbeat" && r.window_id === "synthetic-0003");
  const honest = {
    record_type: "heartbeat",
    window_id: "synthetic-0003",
    digest: recordDigest(hb3),
  };
  assert.deepEqual(verifyNoEquivocation({ feedRecords: feed, secondArtifact: honest }), { raw: 0 });

  const forked = { ...honest, digest: recordDigest({ otherStory: true }) };
  assert.deepEqual(verifyNoEquivocation({ feedRecords: feed, secondArtifact: forked }), {
    raw: 48,
    reason: "cross_artifact_digest_mismatch",
  });
});
