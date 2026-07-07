// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC attestation (two-tier + sealing). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAttestation,
  signAttestation,
  bundleMerkleRoot,
} from "../../../../tools/simurgh-attestation/stage4t/node/build-stage4t-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4t/node/verify-stage4t-attestation.mjs";

test("signed attestation verifies at both tiers", () => {
  const att = signAttestation(computeAttestation());
  assert.deepEqual(verifyAttestation(att, { tier: "public" }), { ok: true });
  assert.deepEqual(verifyAttestation(att, { tier: "audit" }), { ok: true });
});

test("public tier rejects a flipped byte in a Lane A fixture", () => {
  const att = signAttestation(computeAttestation());
  att.content.lane_a_fixtures[0].name = "tampered";
  // Merkle root no longer matches (content changed after signing).
  assert.equal(verifyAttestation(att, { tier: "public" }).ok, false);
});

test("audit tier catches a falsified expected_raw that public tier does not", () => {
  const att = signAttestation(computeAttestation());
  // Flip an expected_raw, then re-seal Merkle + digest + signature so structure passes —
  // only the engine re-run (audit tier) can catch the lie.
  const honest = att.content.lane_a_fixtures.find((c) => c.expected_raw === 0);
  honest.expected_raw = 141;
  const resealed = signAttestation({
    schema: att.schema,
    content: att.content,
    bundle_merkle_root: bundleMerkleRoot(att),
    signing_key_digest: att.signing_key_digest,
  });
  assert.equal(verifyAttestation(resealed, { tier: "public" }).ok, true);
  const audit = verifyAttestation(resealed, { tier: "audit" });
  assert.equal(audit.ok, false);
  assert.equal(audit.reason, "lane_a_fixture_falsified");
});

test("omission test: dropping any Lane A fixture changes the Merkle root", () => {
  const att = computeAttestation();
  const root0 = bundleMerkleRoot(att);
  const tampered = {
    ...att,
    content: { ...att.content, lane_a_fixtures: att.content.lane_a_fixtures.slice(1) },
  };
  assert.notEqual(bundleMerkleRoot(tampered), root0);
});
