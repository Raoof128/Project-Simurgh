// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U charter tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import {
  attackManifestRoot,
  deriveAttackIds,
  buildCharter,
  signCharter,
  charterDigest,
  verifyCharterShapeAndSignature,
  verifyManifestRoot,
} from "../../../../tools/simurgh-attestation/stage4u/core/charter.mjs";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import {
  FAMILY_COUNTS,
  CAMPAIGN_SEED,
} from "../../../../tools/simurgh-attestation/stage4u/constants.mjs";

const KEYDIR = "tests/fixtures/llmShield/stage4u/test-keys/";
const priv = crypto.createPrivateKey(
  readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta-charter.pem")
);
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const caps = { max_turns: 6, max_tokens: 4000, max_spend_usd: 2 };
const mk = () =>
  signCharter(
    buildCharter({
      seed: CAMPAIGN_SEED,
      familyCounts: FAMILY_COUNTS,
      caps,
      charterKeyDigest: keyDigest(pubPem),
    }),
    priv
  );

test("attack ids are deterministic and count to 58", () => {
  const ids = deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS);
  assert.equal(ids.length, 58);
  assert.deepEqual(ids, deriveAttackIds(CAMPAIGN_SEED, FAMILY_COUNTS));
  assert.match(attackManifestRoot(CAMPAIGN_SEED, FAMILY_COUNTS), /^sha256:[0-9a-f]{64}$/);
});
test("a well-formed signed charter passes shape+sig AND manifest-root", () => {
  const c = mk();
  assert.deepEqual(verifyCharterShapeAndSignature(c, { pubKeyPem: pubPem }), {
    raw: 0,
    reason: "green",
  });
  assert.deepEqual(verifyManifestRoot(c), { raw: 0, reason: "green" });
});
test("tampered signature -> 120 (shape+sig layer only)", () => {
  const c = mk();
  c.signature = c.signature.replace(/^../, "00");
  assert.equal(verifyCharterShapeAndSignature(c, { pubKeyPem: pubPem }).raw, 120);
});
test("manifest root that does not recompute -> 124 (manifest layer only, never 120)", () => {
  const c = mk();
  c.attack_manifest_root = "sha256:" + "b".repeat(64);
  const resigned = signCharter({ ...c, signature: undefined }, priv);
  assert.deepEqual(verifyCharterShapeAndSignature(resigned, { pubKeyPem: pubPem }), {
    raw: 0,
    reason: "green",
  });
  assert.equal(verifyManifestRoot(resigned).raw, 124);
});
test("missing schema -> 119", () => {
  const c = mk();
  delete c.schema;
  assert.equal(verifyCharterShapeAndSignature(c, { pubKeyPem: pubPem }).raw, 119);
});
test("re-signed charter declaring different family counts -> 119 (canonical lock)", () => {
  const c = mk();
  c.attack_family_counts = { ...FAMILY_COUNTS, ghost_hop: 1 };
  const resigned = signCharter({ ...c, signature: undefined }, priv);
  assert.equal(verifyCharterShapeAndSignature(resigned, { pubKeyPem: pubPem }).raw, 119);
});
test("re-signed charter with mutated rails -> 119 (canonical lock)", () => {
  const c = mk();
  c.rails = c.rails.slice(0, 5);
  const resigned = signCharter({ ...c, signature: undefined }, priv);
  assert.equal(verifyCharterShapeAndSignature(resigned, { pubKeyPem: pubPem }).raw, 119);
});
test("valid signature but wrong charter_key_digest -> 120 (key binding)", () => {
  const c = mk();
  c.charter_key_digest = "sha256:" + "b".repeat(64);
  const resigned = signCharter({ ...c, signature: undefined }, priv);
  const r = verifyCharterShapeAndSignature(resigned, { pubKeyPem: pubPem });
  assert.equal(r.raw, 120);
  assert.ok(r.detail.key_digest_mismatch);
});
test("charterDigest ignores the signature field", () => {
  const c = mk();
  assert.equal(charterDigest(c), charterDigest({ ...c, signature: "deadbeef" }));
});
