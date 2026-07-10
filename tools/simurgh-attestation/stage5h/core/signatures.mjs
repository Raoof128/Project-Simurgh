// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H — VSD signatures. Low-level Ed25519 + canonical SPKI-DER fingerprint ONLY. Owns no policy
// (pin presence, host registry, tier logic live in the check modules).
import { sign as edSign, verify as edVerify, createPublicKey } from "node:crypto";
import { canonicalJson, fingerprintPublicKey } from "../../canonicalise.mjs";

// Canonical SPKI-DER fingerprint (robust to PEM wrapping / line endings; works on a key extracted from
// a certificate). Shared single source of truth across stages.
export function fingerprint(pem) {
  return fingerprintPublicKey(pem);
}

function message(domainSep, contentObj) {
  return Buffer.from(domainSep + canonicalJson(contentObj), "utf8");
}

// sign(key, DOMAIN.<obj> + canonicalJson(content)) — signatures are domain-separated too.
export function signContent(privatePem, domainSep, contentObj) {
  return edSign(null, message(domainSep, contentObj), privatePem).toString("base64");
}

// Recompute the fingerprint from the PEM FIRST and assert it matches the declared key_fingerprint
// (throws on mismatch — never verify against an unauthenticated key), then verify the signature.
export function verifyContent(identity, domainSep, contentObj, sigB64) {
  const fp = fingerprint(identity.public_key_pem);
  if (fp !== identity.key_fingerprint) {
    throw new Error(`key_fingerprint does not match public_key_pem: ${identity.key_fingerprint}`);
  }
  const pub = createPublicKey(identity.public_key_pem);
  return edVerify(null, message(domainSep, contentObj), pub, Buffer.from(sigB64, "base64"));
}
