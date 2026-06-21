// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttestation,
  deriveForVerify,
} from "../../../../tools/simurgh-extraction/simurgh-extraction.mjs";

test("buildAttestation binds digest, decision, rendered prose, sacred non-claim", async () => {
  const { attestation: att } = await deriveForVerify();
  assert.equal(att.detector_id, "stage3t_frozen_detector_v1");
  assert.equal(att.decision, "extraction_pattern_observed");
  assert.equal(att.distinct_family_count, 3);
  assert.match(att.meta_set_digest, /^sha256:[0-9a-f]{64}$/);
  assert.ok(att.rendered_summary.includes("manual review"));
  assert.ok(att.non_claims.includes("match_is_not_accusation"));
});

test("buildAttestation is a pure function of the committed set", async () => {
  const { set } = await deriveForVerify();
  assert.equal(JSON.stringify(buildAttestation(set)), JSON.stringify(buildAttestation(set)));
});
