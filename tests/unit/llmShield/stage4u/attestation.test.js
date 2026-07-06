// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attestation build+verify tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  computeStructural,
  computeAttestation,
  signAttestation,
  bundleMerkleRoot,
} from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs";

test("structural attestation has 58 fixtures and no observed_raw (public tier)", () => {
  const s = computeStructural();
  assert.equal(s.per_fixture.length, 58);
  assert.ok(!("observed_raw" in s.per_fixture[0]));
  assert.match(s.attack_manifest_root, /^sha256:/);
});
test("audit attestation adds observed_raw + outcome_class + lane_b_capture", () => {
  const a = computeAttestation();
  assert.ok("observed_raw" in a.per_fixture[0]);
  assert.ok("outcome_class" in a.per_fixture[0]);
  assert.ok(Array.isArray(a.lane_b_capture));
});
test("bundle Merkle root seals all FIVE groups incl. lane_b_capture", () => {
  const a = computeAttestation();
  const root0 = bundleMerkleRoot(a);
  const tampered = { ...a, lane_b_capture: [{ injected: true }] };
  assert.notEqual(bundleMerkleRoot(tampered), root0);
});
test("signature verifies against the signer public key (ESM)", () => {
  const priv = crypto.createPrivateKey(readFileSync("tests/fixtures/llmShield/stage4u/test-keys/INSECURE_FIXTURE_ONLY_vrta.pem"));
  const pub = crypto.createPublicKey(priv);
  const att = signAttestation(computeAttestation(), priv);
  const { signature, ...body } = att;
  assert.ok(crypto.verify(null, Buffer.from(canonicalJson(body)), pub, Buffer.from(signature, "hex")));
});
