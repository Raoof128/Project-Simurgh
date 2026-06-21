// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { verifyTarget } from "../../../../tools/simurgh-attestation/verify-stage3p-target.mjs";

function sign(bundle, privPem) {
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.cross_defence.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    signature: "base64:" + signature.toString("base64"),
  };
}

test("verifyTarget accepts a correctly signed valid bundle and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const bundle = {
    type: "simurgh.cross_defence.target_attestation.v1",
    stage: "3P",
    target: {
      target_id: "keyword-filter-replica",
      display_name: "Keyword Filter Replica",
      provenance: "reference_replica",
      execution_trust: "project_generated",
      real_product_claimed: false,
      brand_reference_allowed: false,
    },
    corpus: {
      corpus_type: "canary_discrimination_matrix",
      corpus_digest: "sha256:CORPUS",
      matrix_shape: { total_cases: 180 },
    },
    coverage_profile: {
      full_coverage_claimed: false,
      numeric_summary_exported: false,
      ordering_metric_exported: false,
      cells: {
        "direct_input::plain_marker": { result: "contained", observed_canary_leaked: false },
      },
    },
    non_claims: ["This attestation does not rank defences."],
  };
  const sidecar = {
    ...sign(bundle, privPem),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
  };
  assert.equal(verifyTarget({ bundle, sidecar, publicKeyPem: pubPem }).ok, true);
  const tampered = JSON.parse(JSON.stringify(bundle));
  tampered.coverage_profile.cells["direct_input::plain_marker"].result = "allowed";
  assert.equal(verifyTarget({ bundle: tampered, sidecar, publicKeyPem: pubPem }).ok, false);
});
