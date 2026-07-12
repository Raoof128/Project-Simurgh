// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — real Ed25519 end-to-end (plan Task 2.1). A really-signed bundle verifies raw 0 under
// the full adapter → pure-core path; a byte-flip in any signed content flips the matching sig fact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vrcLaneKeys } from "../../../../tools/simurgh-attestation/stage5j/node/laneKeys.mjs";
import { buildSignedVrcBundle } from "../../../../tools/simurgh-attestation/stage5j/node/buildSignedBundle.mjs";
import {
  makeAdapterFacts,
  verifyVrc,
} from "../../../../tools/simurgh-attestation/stage5j/node/adapter.mjs";

test("a really-signed VRC bundle verifies raw 0 (public + audit) through the real adapter", () => {
  const keys = vrcLaneKeys();
  const { bundle, cfg } = buildSignedVrcBundle(keys);
  const facts = makeAdapterFacts(bundle, cfg);
  assert.equal(facts.vpc_verdict, 0, "embedded 5I bundle re-verifies to raw 0");
  assert.equal(verifyVrc(bundle, cfg, { tier: "public" }).raw, 0);
  assert.equal(verifyVrc(bundle, cfg, { tier: "audit" }).raw, 0);
});

test("byte-flip in a reviewer rating flips its signature fact (→ 340)", () => {
  const keys = vrcLaneKeys();
  const { bundle, cfg } = buildSignedVrcBundle(keys);
  bundle.reviewer_ratings[0].content.value = "critical"; // content changed, signature no longer valid
  const facts = makeAdapterFacts(bundle, cfg);
  assert.equal(facts.reviewerSigValid[bundle.reviewer_ratings[0].entry_digest], false);
});
