// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S attestation + two-tier verifier (4S spec §14). Public tier verifies
// structural claims + signature; audit tier additionally re-runs the engine. The
// separation proof: a re-signed attestation with a tampered observed_raw passes
// public but is caught by audit.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeAttestation,
  signAttestation,
} from "../../../../tools/simurgh-attestation/stage4s/node/build-stage4s-attestation.mjs";
import { verifyAttestation } from "../../../../tools/simurgh-attestation/stage4s/node/verify-stage4s-attestation.mjs";
import { keyDigest } from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const KEYDIR = join(ROOT, "tests/fixtures/llmShield/stage4s/test-keys");
const priv = crypto.createPrivateKey(
  readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_stage-signer.pem"))
);
const pubPem = crypto.createPublicKey(priv).export({ type: "spki", format: "pem" }).toString();
const pubKeyPem = readFileSync(join(KEYDIR, "INSECURE_FIXTURE_ONLY_stage-signer.pub.pem"));

function freshAttestation() {
  return signAttestation(computeAttestation(undefined, keyDigest(pubPem)), priv);
}

test("committed attestation verifies GREEN at both tiers", () => {
  const att = freshAttestation();
  assert.equal(verifyAttestation(att, { tier: "public", pubKeyPem }).ok, true);
  assert.equal(verifyAttestation(att, { tier: "audit", pubKeyPem }).ok, true);
});

test("public tier catches an unsigned tamper via the signature", () => {
  const att = freshAttestation();
  att.corpus_digest = "sha256:" + "0".repeat(64); // tamper WITHOUT re-signing
  const res = verifyAttestation(att, { tier: "public", pubKeyPem });
  assert.equal(res.ok, false);
  assert.ok(res.failures.some((f) => f.code === "signature_invalid"));
});

test("two-tier separation: re-signed observed_raw tamper passes public, caught by audit", () => {
  const att = computeAttestation(undefined, keyDigest(pubPem));
  // Flip one observed_raw to a lie, then RE-SIGN so the signature is valid again.
  const target = att.per_fixture.find((f) => f.expected_raw === 111);
  target.observed_raw = 0; // claim the ghost hop was allowed
  const resigned = signAttestation(att, priv);

  // Public tier only checks structural digests + signature -> it passes.
  assert.equal(verifyAttestation(resigned, { tier: "public", pubKeyPem }).ok, true);

  // Audit tier re-runs the engine -> the lie is exposed.
  const audit = verifyAttestation(resigned, { tier: "audit", pubKeyPem });
  assert.equal(audit.ok, false);
  assert.ok(
    audit.failures.some((f) => f.code === "observed_raw_mismatch" && f.name === "orphan-crossing")
  );
});
