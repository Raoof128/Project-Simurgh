// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H — VSD domain-separated digests. Reuses the SHARED canonical/hash utility (single source of
// truth for byte-parity across JS/Python/browser) rather than a stage-local copy.
import { canonicalJson, sha256Hex } from "../../canonicalise.mjs";

export { canonicalJson, sha256Hex };

// digest = sha256(DOMAIN.<obj> + canonicalJson(content)). The domain prefix (trailing newline included)
// guards against cross-object substitution; no object hashes itself (digest lives in the wrapper only).
export function domainDigest(domainSep, contentObj) {
  return sha256Hex(domainSep + canonicalJson(contentObj));
}

// Committed-artifact digests are plain canonical digests (standalone artifacts, no cross-object risk).
export function artifactDigest(obj) {
  return sha256Hex(canonicalJson(obj));
}

// Identity digest binds subject + fingerprint ONLY — never the PEM, so PEM re-wrapping cannot change an
// identity, and not domain-separated (identities are not one of the six wrapped objects; no dead domain).
export function identityDigest(identity) {
  return artifactDigest({
    identity_subject: identity.identity_subject,
    key_fingerprint: identity.key_fingerprint,
  });
}
