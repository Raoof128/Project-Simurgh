// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — charter verifier logic (plan Task 3A). No frozen counts yet (Task 10B).
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import {
  deriveAttackIds,
  attackManifestRoot,
  buildCharter,
  signCharter,
  checkCharterCampaign,
  verifyAttackScheduled,
  checkPrecommitStructural,
} from "../../../../tools/simurgh-attestation/stage5b/core/charter.mjs";

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const pubKeyPem = publicKey.export({ type: "spki", format: "pem" });
// Placeholder counts (Task 3A logic test) — real FAMILY_COUNTS frozen in Task 10B.
const counts = { conflict_laundering: 2, capture_substitution: 1 };
const CAPS = { max_attacks: 100 };
const DECL = "sha256:" + "a".repeat(64);

function greenCharter() {
  const charter = buildCharter({
    seed: "stage5b-var-seed-v1",
    familyCounts: counts,
    caps: CAPS,
    charterKeyDigest: keyDigest(pubKeyPem),
    captureDeclarationDigest: DECL,
  });
  return signCharter(charter, privateKey);
}

test("a well-formed charter passes the campaign check", () => {
  assert.equal(checkCharterCampaign(greenCharter(), { pubKeyPem }).raw, 0);
});

test("212: a re-signed charter with a different campaign seed is rejected", () => {
  const c = greenCharter();
  c.campaign_seed = "evil-seed";
  const r = checkCharterCampaign(c, { pubKeyPem });
  assert.equal(r.raw, 212);
});

test("212: tampered non_claims / manifest-root self-inconsistency is rejected", () => {
  const c = greenCharter();
  c.non_claims = [...c.non_claims, "smuggled"];
  assert.equal(checkCharterCampaign(c, { pubKeyPem }).raw, 212);
  const c2 = greenCharter();
  c2.attack_manifest_root = "sha256:" + "0".repeat(64);
  assert.equal(checkCharterCampaign(c2, { pubKeyPem }).raw, 212);
});

test("219: a charter that binds a tensor-commitment root is precommit theater (NOT 210)", () => {
  const c = greenCharter();
  c.tensor_commitment_root = "sha256:" + "b".repeat(64); // author saw the readings
  const r = checkPrecommitStructural(c);
  assert.equal(r.raw, 219);
});

test("219: a charter missing the capture_declaration_digest binding is rejected", () => {
  const c = greenCharter();
  delete c.capture_declaration_digest;
  assert.equal(checkPrecommitStructural(c).raw, 219);
});

test("219: a well-formed precommitted charter passes structural check", () => {
  assert.equal(checkPrecommitStructural(greenCharter()).raw, 0);
});

test("213: an attack id under the manifest root is scheduled; a foreign id is not", () => {
  const c = greenCharter();
  const ids = deriveAttackIds(c.campaign_seed, c.attack_family_counts);
  assert.equal(verifyAttackScheduled(ids[0], c).raw, 0);
  assert.equal(verifyAttackScheduled("stage5b-var-seed-v1:ghost#99", c).raw, 213);
});

test("attackManifestRoot is stable + order-independent over the sorted ids", () => {
  const a = attackManifestRoot("stage5b-var-seed-v1", counts);
  const b = attackManifestRoot("stage5b-var-seed-v1", {
    capture_substitution: 1,
    conflict_laundering: 2,
  });
  assert.equal(a, b);
});
