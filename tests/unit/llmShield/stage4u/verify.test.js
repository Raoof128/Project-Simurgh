// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U attestation verify tests. Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4u/node/verify-stage4u-attestation.mjs";
import { signAttestation } from "../../../../tools/simurgh-attestation/stage4u/node/build-stage4u-attestation.mjs";

const KEYDIR = "tests/fixtures/llmShield/stage4u/test-keys/";
const priv = crypto.createPrivateKey(readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta.pem")); // attestation + findings
const pub = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const charterPub = crypto
  .createPublicKey(
    crypto.createPrivateKey(readFileSync(KEYDIR + "INSECURE_FIXTURE_ONLY_vrta-charter.pem"))
  )
  .export({ type: "spki", format: "pem" })
  .toString();
const att = JSON.parse(
  readFileSync(
    "docs/research/llm-shield/evidence/stage-4u/attestation/vrta-attestation.json",
    "utf8"
  )
);
const K = { attestationPubKeyPem: pub, charterPubKeyPem: charterPub, findingPubKeyPem: pub };

test("public tier verifies GREEN", () => {
  assert.equal(verifyAttestation(att, { tier: "public", ...K }).raw, 0);
});
test("audit tier verifies GREEN (engine re-run)", () => {
  assert.equal(verifyAttestation(att, { tier: "audit", ...K }).raw, 0);
});
test("charter key and attestation key are NOT interchangeable (key binding)", () => {
  assert.notEqual(
    verifyAttestation(att, {
      tier: "public",
      attestationPubKeyPem: pub,
      charterPubKeyPem: pub,
      findingPubKeyPem: pub,
    }).raw,
    0
  );
});
test("tamper WITHOUT re-sign -> PUBLIC tier catches 120 (signature)", () => {
  const t = JSON.parse(JSON.stringify(att));
  t.per_fixture[0].observed_raw = 0;
  assert.equal(verifyAttestation(t, { tier: "public", ...K }).raw, 120);
});
test("tamper observed_raw + re-sign -> PUBLIC passes, AUDIT catches 129 (true two-tier proof)", () => {
  const t = JSON.parse(JSON.stringify(att));
  const i = t.per_fixture.findIndex(
    (p) => p.outcome_class === "survived" && p.observed_raw !== 0 && p.observed_raw !== 105
  );
  t.per_fixture[i].observed_raw = 105; // wrong; engine will not return this
  const resigned = signAttestation({ ...t, signature: undefined }, priv);
  assert.equal(verifyAttestation(resigned, { tier: "public", ...K }).raw, 0);
  assert.equal(verifyAttestation(resigned, { tier: "audit", ...K }).raw, 129);
});
