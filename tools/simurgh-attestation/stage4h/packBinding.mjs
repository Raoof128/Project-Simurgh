// SPDX-License-Identifier: AGPL-3.0-or-later
import { sign, verify } from "node:crypto";
import { merkleRoot } from "../stage4d/merkle.mjs";
import { domainBytes } from "../stage4d/stage4dCrypto.mjs";
import { MANIFEST_DOMAIN, MANIFEST_VERSION } from "./constants.mjs";
import { digest } from "./canonicalPremises.mjs";
import { certificateDigest } from "./dfiCertificate.mjs";
import { validateDfiCertificate, validateSignedPackManifest } from "./schema.mjs";

function manifestPayload(manifest) {
  const { signature, signed_pack_manifest_digest, ...payload } = manifest;
  return payload;
}

function manifestDigest(payload) {
  return digest(payload);
}

export function buildSignedPackManifest({ certificate, privateKey, hermeticityAttestationDigest }) {
  if (!/^sha256:[0-9a-f]{64}$/.test(hermeticityAttestationDigest)) {
    throw new Error("hermeticity_attestation_digest is required for Stage 4H.5 manifests");
  }
  const certCheck = validateDfiCertificate(certificate);
  if (!certCheck.ok) throw new Error(`invalid certificate: ${certCheck.reason}:${certCheck.field}`);
  const certDigest = certificateDigest(certificate);
  const payload = {
    manifest_version: MANIFEST_VERSION,
    base_pack_digest: certificate.base_pack_digest,
    certificate_digest: certDigest,
    hermeticity_attestation_digest: hermeticityAttestationDigest,
    merkle_root: `sha256:${merkleRoot([
      certificate.base_pack_digest.replace(/^sha256:/, ""),
      certDigest.replace(/^sha256:/, ""),
      hermeticityAttestationDigest.replace(/^sha256:/, ""),
    ])}`,
  };
  const signed_pack_manifest_digest = manifestDigest(payload);
  const signature = `base64:${sign(null, domainBytes(MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return { ...payload, signed_pack_manifest_digest, signature };
}

export function verifyPackBinding({ certificate, manifest, publicKey }) {
  const certCheck = validateDfiCertificate(certificate);
  if (!certCheck.ok) return { ok: false, reason: certCheck.reason, field: certCheck.field };
  const manifestCheck = validateSignedPackManifest(manifest);
  if (!manifestCheck.ok) {
    return { ok: false, reason: manifestCheck.reason, field: manifestCheck.field };
  }
  if (manifest.base_pack_digest !== certificate.base_pack_digest) {
    return { ok: false, reason: "base_pack_digest_mismatch" };
  }
  if (manifest.certificate_digest !== certificateDigest(certificate)) {
    return { ok: false, reason: "certificate_digest_mismatch" };
  }
  const payload = manifestPayload(manifest);
  if (manifest.signed_pack_manifest_digest !== manifestDigest(payload)) {
    return { ok: false, reason: "signed_pack_manifest_digest_mismatch" };
  }
  const expectedRoot = `sha256:${merkleRoot([
    manifest.base_pack_digest.replace(/^sha256:/, ""),
    manifest.certificate_digest.replace(/^sha256:/, ""),
    manifest.hermeticity_attestation_digest.replace(/^sha256:/, ""),
  ])}`;
  if (manifest.merkle_root !== expectedRoot) return { ok: false, reason: "merkle_root_mismatch" };
  try {
    const ok = verify(
      null,
      domainBytes(MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(manifest.signature.replace(/^base64:/, ""), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "manifest_signature_invalid" };
  } catch {
    return { ok: false, reason: "manifest_signature_invalid" };
  }
}
