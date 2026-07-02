// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey, sign, verify } from "node:crypto";
import { canonicalJson, publicKeyFingerprint, sha256Canonical } from "../stage4d/stage4dCrypto.mjs";

export const PCTA_SCHEMA = "simurgh.pcta.authorization.v1";
export const PCTA_MANIFEST_DOMAIN = "SIMURGH_STAGE4J_PCTA_MANIFEST_V1\0";
export const ACTION_CLASSES = Object.freeze([
  "read_only",
  "internal_mutation",
  "external_egress",
  "irreversible_external_effect",
]);
export const AUTHORITY_SOURCES = Object.freeze([
  "user_confirmed",
  "policy_preauthorized",
  "agent_derived",
  "untrusted_context",
]);

const DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const isDigest = (v) => typeof v === "string" && DIGEST_RE.test(v);

export function computeProofDigest(payload) {
  return `sha256:${sha256Canonical(payload)}`;
}

export function validateProofShape(proof) {
  if (!proof || typeof proof !== "object") return { ok: false, reason: "schema_invalid" };
  const { payload, signature, public_key_fingerprint } = proof;
  if (!payload || typeof payload !== "object") return { ok: false, reason: "schema_invalid" };
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "schema_invalid" };
  }
  if (!isDigest(public_key_fingerprint)) return { ok: false, reason: "schema_invalid" };
  if (payload.schema !== PCTA_SCHEMA) return { ok: false, reason: "schema_invalid" };
  if (typeof payload.tool !== "string") return { ok: false, reason: "schema_invalid" };
  if (!ACTION_CLASSES.includes(payload.action_class))
    return { ok: false, reason: "schema_invalid" };
  if (!AUTHORITY_SOURCES.includes(payload.authority_source)) {
    return { ok: false, reason: "schema_invalid" };
  }
  for (const f of [
    "authorized_action_digest",
    "user_intent_digest",
    "policy_digest",
    "dfi_certificate_digest",
  ]) {
    if (!isDigest(payload[f])) return { ok: false, reason: "schema_invalid" };
  }
  if (typeof payload.untrusted_context_reached_authority !== "boolean") {
    return { ok: false, reason: "schema_invalid" };
  }
  if (!Number.isInteger(payload.epoch) || payload.epoch < 0)
    return { ok: false, reason: "schema_invalid" };
  if (typeof payload.nonce !== "string" || payload.nonce.length === 0) {
    return { ok: false, reason: "schema_invalid" };
  }
  if (payload.nonce_scope !== "signed_pack") return { ok: false, reason: "schema_invalid" };
  const e = payload.enforcement;
  if (!e || typeof e !== "object") return { ok: false, reason: "schema_invalid" };
  if (typeof e.required !== "boolean" || typeof e.applied !== "boolean") {
    return { ok: false, reason: "schema_invalid" };
  }
  if (!ACTION_CLASSES.includes(e.applied_action_class))
    return { ok: false, reason: "schema_invalid" };
  if (!isDigest(e.applied_action_digest)) return { ok: false, reason: "schema_invalid" };
  return { ok: true };
}

export function verifyProofSignature(proof, pinnedKeyset) {
  const fail = { ok: false, reason: "authorization_signature_invalid" };
  if (!pinnedKeyset || !pinnedKeyset.has(proof.public_key_fingerprint)) return fail;
  try {
    const pub = pinnedKeyset.get ? pinnedKeyset.get(proof.public_key_fingerprint) : null;
    if (!pub) return fail; // pinned keyset must resolve fingerprint -> public key (see verifier)
    const ok = verify(
      null,
      Buffer.from(canonicalJson(proof.payload), "utf8"),
      pub,
      Buffer.from(proof.signature.replace(/^ed25519:/, ""), "base64")
    );
    return ok ? { ok: true } : fail;
  } catch {
    return fail;
  }
}

// Acyclic run-root binding: PCTA manifest references the 4H run-root; it never mutates the
// signed 4H manifest. Signed with the PCTA key.
export function buildPctaManifest({ proof, runRoot, dfiCertificateDigest, privateKey }) {
  const payload = {
    manifest_version: "simurgh.pcta.manifest.v1",
    run_root: runRoot,
    dfi_certificate_digest: dfiCertificateDigest,
    pcta_proof_digest: computeProofDigest(proof.payload),
  };
  const pcta_manifest_digest = `sha256:${sha256Canonical(payload)}`;
  const signature = `ed25519:${sign(
    null,
    Buffer.concat([
      Buffer.from(PCTA_MANIFEST_DOMAIN, "utf8"),
      Buffer.from(canonicalJson(payload), "utf8"),
    ]),
    privateKey
  ).toString("base64")}`;
  return { ...payload, pcta_manifest_digest, signature };
}

export function verifyPctaManifest({
  pctaManifest,
  proof,
  runRoot,
  dfiCertificateDigest,
  publicKey,
}) {
  if (pctaManifest.run_root !== runRoot) return { ok: false, reason: "run_root_mismatch" };
  if (pctaManifest.dfi_certificate_digest !== dfiCertificateDigest) {
    return { ok: false, reason: "dfi_binding_mismatch" };
  }
  if (pctaManifest.pcta_proof_digest !== computeProofDigest(proof.payload)) {
    return { ok: false, reason: "pcta_proof_digest_mismatch" };
  }
  const { signature, pcta_manifest_digest, ...payload } = pctaManifest;
  if (pcta_manifest_digest !== `sha256:${sha256Canonical(payload)}`) {
    return { ok: false, reason: "pcta_manifest_digest_mismatch" };
  }
  try {
    const ok = verify(
      null,
      Buffer.concat([
        Buffer.from(PCTA_MANIFEST_DOMAIN, "utf8"),
        Buffer.from(canonicalJson(payload), "utf8"),
      ]),
      createPublicKey(
        publicKey.export ? publicKey.export({ type: "spki", format: "pem" }) : publicKey
      ),
      Buffer.from(signature.replace(/^ed25519:/, ""), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "pcta_manifest_signature_invalid" };
  } catch {
    return { ok: false, reason: "pcta_manifest_signature_invalid" };
  }
}
