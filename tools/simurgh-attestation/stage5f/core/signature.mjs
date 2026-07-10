// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — signature gate (plan Task 4, raw 269). The embedded public key is informational;
// trust is decided by an EXTERNALLY supplied pinned fingerprint (checked FIRST). This is the 5E
// "not self-authenticating" lesson: a swapped key has a different fingerprint.
import { createPublicKey, createPrivateKey, sign as edSign, verify as edVerify } from "node:crypto";
import { canonicalJson, fingerprintPublicKey } from "../../canonicalise.mjs";

// Everything except the detached signature is the signed content.
export function contentOf(bundle) {
  const { signature, ...rest } = bundle;
  return rest;
}

export function keyFingerprint(pubPem) {
  return fingerprintPublicKey(pubPem);
}

export function signBundle(content, privatePem) {
  return edSign(
    null,
    Buffer.from(canonicalJson(content), "utf8"),
    createPrivateKey(privatePem)
  ).toString("base64");
}

// 269 unless: pem+signature present AND the embedded key's fingerprint equals the externally pinned
// fingerprint AND the Ed25519 signature verifies over canonicalJson(content).
export function checkSignature(bundle, pinnedKeyFingerprint) {
  try {
    const pem = bundle?.attestation_pub_key_pem;
    if (typeof pem !== "string" || typeof bundle?.signature !== "string") return 269;
    if (!pinnedKeyFingerprint || keyFingerprint(pem) !== pinnedKeyFingerprint) return 269;
    const ok = edVerify(
      null,
      Buffer.from(canonicalJson(contentOf(bundle)), "utf8"),
      createPublicKey(pem),
      Buffer.from(bundle.signature, "base64")
    );
    return ok ? null : 269;
  } catch {
    return 269;
  }
}
