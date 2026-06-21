// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../../../../tools/simurgh-attestation/canonicalise.mjs";
import { buildRegistryFromManifest } from "../../../../tools/simurgh-temporal/registryChain.mjs";
import { verifyRegistry } from "../../../../tools/simurgh-temporal/verify-stage3q-registry.mjs";

function sign(obj, privPem, pubPem) {
  const canonical = Buffer.from(canonicalJson(obj), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.temporal.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + signature.toString("base64"),
  };
}
function manifest() {
  return {
    type: "simurgh.temporal.timeline_manifest.v1",
    stage: "3Q",
    registry_id: "r",
    snapshots: [
      {
        entry_index: 0,
        snapshot_id: "s0",
        snapshot_label: "v0",
        created_at_utc: "2026-06-21T00:00:00Z",
        catalogue_digest: "sha256:c",
        catalogue_path: "p",
        corpus_digest: "sha256:corpus",
        target_attestations: [],
      },
    ],
  };
}

test("verifyRegistry accepts a signed valid ledger and rejects tampering", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pubPem = publicKey.export({ type: "spki", format: "pem" });
  const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
  const reg = buildRegistryFromManifest(manifest(), "sha256:M");
  const sidecar = sign(reg, privPem, pubPem);
  assert.equal(verifyRegistry({ registry: reg, sidecar, publicKeyPem: pubPem }).ok, true);
  const tampered = JSON.parse(JSON.stringify(reg));
  tampered.entries[0].entry_body.snapshot.snapshot_label = "evil";
  assert.equal(verifyRegistry({ registry: tampered, sidecar, publicKeyPem: pubPem }).ok, false);
});
