// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { verifyNarrative } from "../../../../tools/simurgh-narrative/verify-stage3s-narrative.mjs";

test("verifyNarrative accepts a signed, evidence-bound artifact and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const digest = {
    type: "simurgh.defensive_narrative.evidence_digest.v1",
    session_hash: "sha256:s",
  };
  const receipt = { output_hash: "sha256:out" };
  const modelSlots = { source: { gateway_output_hash: "sha256:out" } };
  const artifact = {
    type: "simurgh.defensive_narrative.verified_artifact.v1",
    evidence_digest_hash: sha256Hex(canonicalJson(digest)),
    claim_check_passed: true,
    narrative_claim_conflicts_rendered: 0,
    automatic_finding_made: false,
    rendered_summary: "Manual review is recommended.",
  };
  const canonical = Buffer.from(canonicalJson(artifact), "utf8");
  const sig = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  const sidecar = {
    schema: "simurgh.defensive_narrative.signature.v1",
    algorithm: "Ed25519",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + sig.toString("base64"),
  };
  assert.equal(
    verifyNarrative({ artifact, sidecar, publicKeyPem: pubPem, digest, modelSlots, receipt }).ok,
    true
  );
  // tamper the artifact
  const tampered = { ...artifact, rendered_summary: "cheated" };
  assert.equal(
    verifyNarrative({
      artifact: tampered,
      sidecar,
      publicKeyPem: pubPem,
      digest,
      modelSlots,
      receipt,
    }).ok,
    false
  );
  // break receipt binding
  assert.equal(
    verifyNarrative({
      artifact,
      sidecar,
      publicKeyPem: pubPem,
      digest,
      modelSlots: { source: { gateway_output_hash: "sha256:other" } },
      receipt,
    }).ok,
    false
  );
  // break digest binding
  assert.equal(
    verifyNarrative({
      artifact,
      sidecar,
      publicKeyPem: pubPem,
      digest: { changed: true },
      modelSlots,
      receipt,
    }).checks.digest_binding,
    false
  );
});
