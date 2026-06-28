// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { paretoFrontier } from "../../../../tools/simurgh-attestation/stage4f/frontier.mjs";
import { privacyAuditObject } from "../../../../tools/simurgh-attestation/stage4f/verifyFrontier.mjs";

test("privacy audit rejects raw content classes", () => {
  const result = privacyAuditObject({
    frontier: "ok",
    raw_model_output: "the model said the secret is sk-test",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "privacy_leak_detected");
});

test("privacy audit rejects secret-shaped string values", () => {
  const result = privacyAuditObject({
    metadata: {
      description: "credential candidate sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "privacy_leak_detected");
  assert.equal(result.path, "$.metadata.description");
});

test("ugly but honest frontier is not a quality failure", () => {
  const result = paretoFrontier([
    {
      point_id: "P4",
      attack_success_rate: 1,
      over_block_rate: 1,
      benign_utility: 0,
      utility_under_attack: 0,
      verified: true,
    },
  ]);
  assert.equal(result.plotted_frontier.length, 1);
  assert.equal(result.excluded_points.length, 0);
});
