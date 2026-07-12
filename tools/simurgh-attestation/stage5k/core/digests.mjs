// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC domain-separated digests. Reuses the SHARED canonical/hash utility (single source of
// truth for byte-parity across JS/Python/browser). Ported from 5J.
import { canonicalJson, sha256Hex } from "../../canonicalise.mjs";

export { canonicalJson, sha256Hex };

// digest = sha256(DOMAIN.<obj> + canonicalJson(content)). Domain prefix guards cross-object substitution.
export function domainDigest(domainSep, contentObj) {
  return sha256Hex(domainSep + canonicalJson(contentObj));
}

// Committed-artifact digests are plain canonical digests (standalone artifacts, no cross-object risk).
export function artifactDigest(obj) {
  return sha256Hex(canonicalJson(obj));
}

// Identity digest binds subject + fingerprint ONLY — never the PEM.
export function identityDigest(identity) {
  return artifactDigest({
    identity_subject: identity.identity_subject,
    key_fingerprint: identity.key_fingerprint,
  });
}
