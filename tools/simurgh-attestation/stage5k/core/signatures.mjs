// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC signatures. Low-level Ed25519 + canonical SPKI-DER fingerprint ONLY (ported from 5J).
// The pure vucCore never touches crypto; the node adapter uses these to resolve `facts`.
import { sign as edSign, verify as edVerify, createPublicKey } from "node:crypto";
import { canonicalJson, fingerprintPublicKey } from "../../canonicalise.mjs";

export function fingerprint(pem) {
  return fingerprintPublicKey(pem);
}

function message(domainSep, contentObj) {
  return Buffer.from(domainSep + canonicalJson(contentObj), "utf8");
}

export function signContent(privatePem, domainSep, contentObj) {
  return edSign(null, message(domainSep, contentObj), privatePem).toString("base64");
}

// Recompute the fingerprint from the PEM FIRST and assert it matches the declared key_fingerprint, then
// verify the signature (never verify against an unauthenticated key).
export function verifyContent(identity, domainSep, contentObj, sigB64) {
  const fp = fingerprint(identity.public_key_pem);
  if (fp !== identity.key_fingerprint) {
    throw new Error(`key_fingerprint does not match public_key_pem: ${identity.key_fingerprint}`);
  }
  const pub = createPublicKey(identity.public_key_pem);
  return edVerify(null, message(domainSep, contentObj), pub, Buffer.from(sigB64, "base64"));
}
