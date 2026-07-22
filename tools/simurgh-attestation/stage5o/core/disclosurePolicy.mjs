// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §8.3 — the disclosure policy preimage. Section 4.7 froze only the binding SLOT
// `disclosure_policy_digest`; Section 8 defines its preimage. The policy is precommitted before the
// beacon, so every opening limit and the budget are producer-fixed ahead of the challenge.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "./digestTokenCodec.mjs";

const sha256 = (b) => createHash("sha256").update(b).digest();

export const DISCLOSURE_POLICY_DOMAIN = "simurgh.vsc.disclosure_policy.v1";

// The six limits the policy owns (the presented history is itself an allocation surface, so bounding
// only the new opening bundle is insufficient). max_cumulative_disclosed_indices is the budget B.
export const DISCLOSURE_POLICY_LIMITS = Object.freeze([
  "max_opening_package_transport_bytes",
  "max_opening_package_canonical_bytes",
  "max_presented_history_transport_bytes",
  "max_presented_history_canonical_bytes",
  "max_presented_history_entries",
  "max_cumulative_disclosed_indices",
]);

const posInt = (n) => Number.isSafeInteger(n) && n > 0;

/** Canonicalise the six-limit policy into exactly the frozen key order, rejecting anything else. */
export function canonicalDisclosurePolicy(policy) {
  if (policy === null || typeof policy !== "object")
    throw new TypeError("disclosure_policy_object");
  const keys = Object.keys(policy).sort();
  const want = [...DISCLOSURE_POLICY_LIMITS].sort();
  if (keys.length !== want.length || keys.some((k, i) => k !== want[i])) {
    throw new Error("disclosure_policy_exact_key_schema");
  }
  for (const k of DISCLOSURE_POLICY_LIMITS)
    if (!posInt(policy[k])) throw new Error(`disclosure_policy_${k}`);
  if (policy.max_opening_package_canonical_bytes > policy.max_opening_package_transport_bytes) {
    throw new Error("disclosure_policy_opening_canonical_over_transport");
  }
  if (policy.max_presented_history_canonical_bytes > policy.max_presented_history_transport_bytes) {
    throw new Error("disclosure_policy_history_canonical_over_transport");
  }
  return DISCLOSURE_POLICY_LIMITS.reduce((o, k) => ((o[k] = policy[k]), o), {});
}

/** disclosure_policy_digest = SHA256(DISCLOSURE_POLICY_DOMAIN || canonicalJson(policy)), bare-hex. */
export function disclosurePolicyDigest(policy) {
  const canonical = canonicalDisclosurePolicy(policy);
  const pre = Buffer.concat([
    Buffer.from(DISCLOSURE_POLICY_DOMAIN, "utf8"),
    Buffer.from(canonicalJson(canonical), "utf8"),
  ]);
  return encodeDigestToken(sha256(pre));
}
