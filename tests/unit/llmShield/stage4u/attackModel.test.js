// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attack model tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateFixture,
  fixtureDigest,
  bindsCharter,
  nonMaliceViolation,
} from "../../../../tools/simurgh-attestation/stage4u/core/attackModel.mjs";

const good = {
  schema: "simurgh.vrta_attack_fixture.v1",
  attack_id: "stage4u-vrta-seed-v1:ghost_hop#0",
  family: "ghost_hop",
  charter_digest: "sha256:" + "a".repeat(64),
  target: "vdcc_verifier",
  payload: { kind: "chain_bundle", bundle: {} },
  expected_raw: 111,
  key_refs: ["INSECURE_FIXTURE_ONLY_delegator"],
  endpoint: "in_repo",
};

test("well-formed fixture validates", () => {
  assert.deepEqual(validateFixture(good), { raw: 0, reason: "green" });
  assert.match(fixtureDigest(good), /^sha256:[0-9a-f]{64}$/);
});
test("missing field -> 119", () => {
  const bad = { ...good };
  delete bad.expected_raw;
  assert.equal(validateFixture(bad).raw, 119);
});
test("bad target enum -> 119", () => {
  assert.equal(validateFixture({ ...good, target: "the_internet" }).raw, 119);
});
test("bad payload.kind -> 119", () => {
  assert.equal(validateFixture({ ...good, payload: { kind: "malware", bundle: {} } }).raw, 119);
});
test("malformed charter_digest -> 119", () => {
  assert.equal(validateFixture({ ...good, charter_digest: "not-a-digest" }).raw, 119);
});
test("attack_id not matching <seed>:<family># -> 119", () => {
  assert.equal(validateFixture({ ...good, attack_id: "wrong#0" }).raw, 119);
});
test("bindsCharter compares digests (3-arg)", () => {
  assert.equal(bindsCharter(good, {}, "sha256:" + "a".repeat(64)), true);
  assert.equal(bindsCharter(good, {}, "sha256:" + "c".repeat(64)), false);
});
test("non-fixture key ref is a non-malice violation (feeds 122)", () => {
  assert.equal(nonMaliceViolation(good), null);
  assert.match(nonMaliceViolation({ ...good, key_refs: ["prod_signing_key"] }), /non_fixture_key/);
});
test("third-party endpoint is a non-malice violation (feeds 122)", () => {
  assert.match(nonMaliceViolation({ ...good, endpoint: "https://api.example.com" }), /third_party_endpoint/);
});
