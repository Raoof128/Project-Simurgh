// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  buildDfiCertificate,
  certificateDigest,
} from "../../../../tools/simurgh-attestation/stage4h/dfiCertificate.mjs";
import {
  buildSignedPackManifest,
  verifyPackBinding,
} from "../../../../tools/simurgh-attestation/stage4h/packBinding.mjs";

const STAGE4D_PACK_PATH =
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json";

function loadPack() {
  return JSON.parse(readFileSync(STAGE4D_PACK_PATH, "utf8"));
}

const hermeticityAttestationDigest = `sha256:${"a".repeat(64)}`;

test("Stage 4H certificate digest is external and manifest-bound", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pack = loadPack();
  const certificate = buildDfiCertificate({ pack });
  assert.equal(Object.hasOwn(certificate, "certificate_digest"), false);
  const manifest = buildSignedPackManifest({
    certificate,
    privateKey,
    hermeticityAttestationDigest,
  });
  assert.equal(manifest.certificate_digest, certificateDigest(certificate));
  assert.equal(manifest.hermeticity_attestation_digest, hermeticityAttestationDigest);
  assert.equal(verifyPackBinding({ certificate, manifest, publicKey }).ok, true);
});

test("Stage 4H pack binding rejects certificate, digest, and signature tampering", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const certificate = buildDfiCertificate({ pack: loadPack() });
  const manifest = buildSignedPackManifest({
    certificate,
    privateKey,
    hermeticityAttestationDigest,
  });
  assert.equal(
    verifyPackBinding({
      certificate: { ...certificate, premise_digest: `sha256:${"0".repeat(64)}` },
      manifest,
      publicKey,
    }).reason,
    "certificate_digest_mismatch"
  );
  assert.equal(
    verifyPackBinding({
      certificate,
      manifest: { ...manifest, base_pack_digest: `sha256:${"0".repeat(64)}` },
      publicKey,
    }).reason,
    "base_pack_digest_mismatch"
  );
  assert.equal(
    verifyPackBinding({
      certificate,
      manifest: { ...manifest, signature: "base64:ZmFrZQ==" },
      publicKey,
    }).reason,
    "manifest_signature_invalid"
  );
});
