import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeAttestation,
  signAttestation,
  bundleMerkleRoot,
} from "../../../../tools/simurgh-attestation/stage4v/node/build-stage4v-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4v/node/verify-stage4v-attestation.mjs";

test("public tier verifies a freshly signed attestation", () => {
  const att = signAttestation(computeAttestation());
  assert.deepEqual(verifyAttestation(att, { tier: "public" }), { ok: true });
});

test("flipped merkle root -> bundle_merkle_root_mismatch", () => {
  const att = signAttestation(computeAttestation());
  const bad = JSON.parse(JSON.stringify(att));
  bad.bundle_merkle_root = "sha256:" + "0".repeat(64);
  assert.equal(verifyAttestation(bad, { tier: "public" }).ok, false);
});

test("audit tier reruns Lane A + Lane B and passes", () => {
  const att = signAttestation(computeAttestation());
  assert.deepEqual(verifyAttestation(att, { tier: "audit" }), { ok: true });
});

test("audit tier catches a falsified expected_raw (root recomputed to pass public tier)", () => {
  const att = signAttestation(computeAttestation());
  const bad = JSON.parse(JSON.stringify(att));
  const honest = bad.content.lane_a_fixtures.find((f) => f.name === "honest-contest");
  honest.expected_raw = 153;
  // A sophisticated forger recomputes the merkle root and re-signs, so the public
  // tier passes; only the audit rerun (actual raw 0 != claimed 153) catches it.
  bad.bundle_merkle_root = bundleMerkleRoot(bad);
  const resigned = signAttestation(bad);
  assert.equal(verifyAttestation(resigned, { tier: "public" }).ok, true);
  const res = verifyAttestation(resigned, { tier: "audit" });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "lane_a_fixture_falsified");
});
