// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC domain-separated digests. Reuses the SHARED canonical/hash utility (single source of
// truth for byte-parity across JS/Python/browser) rather than a stage-local copy.
import { canonicalJson, sha256Hex } from "../../canonicalise.mjs";

export { canonicalJson, sha256Hex };

// digest = sha256(DOMAIN.<obj> + canonicalJson(content)). The domain prefix (trailing newline included)
// guards against cross-object substitution; no object hashes itself (digest lives in the wrapper only).
export function domainDigest(domainSep, contentObj) {
  return sha256Hex(domainSep + canonicalJson(contentObj));
}
