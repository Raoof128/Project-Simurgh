// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.5 — the probability policy preimage and its digest.
//
// T3.5 requires the target basis, threshold, minimum detection bound and k-derivation version to be
// precommitted BEFORE the anchor. The policy is digest-bound under §9's OWN domain rather than as a
// §7 registry pair — adding a pair would flip the seventeen framed registry digests and trigger the
// A34 invalidation rule. This is exactly how §8 owned its disclosure policy.
//
// The basis is a DISCRIMINATED exact-key shape: the inactive alternative must be ABSENT, so no field
// changes JSON type according to the value of another field.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { encodeDigestToken } from "./digestTokenCodec.mjs";
import {
  parseRational,
  ratIsZeroToOne,
  ratIsPositiveToOne,
  isCanonicalUnsignedDecimal,
} from "./probabilityRational.mjs";

const sha256 = (b) => createHash("sha256").update(b).digest();

export const PROBABILITY_POLICY_DOMAIN = "simurgh.vsc.probability_policy.v1";

export const PROBABILITY_POLICY_BASES = Object.freeze(["absolute_count", "fraction"]);
export const PROBABILITY_CLAIM_TYPES = Object.freeze(["exact", "at_least"]);

/** The §9-owned semantic/resource limits. Never §7 lexical grammars. */
export const PROBABILITY_POLICY_LIMITS = Object.freeze([
  "max_probability_decimal_digits",
  "max_probability_evaluation_terms",
  "max_probability_intermediate_bits",
  "max_probability_package_transport_bytes",
  "max_probability_package_canonical_bytes",
]);

const COMMON_KEYS = Object.freeze([
  "target_defect_basis",
  "minimum_detection_bound",
  "k_derivation_version",
  "claim_type",
  ...PROBABILITY_POLICY_LIMITS,
]);

const BASIS_KEYS = Object.freeze({
  absolute_count: "target_defect_count",
  fraction: "target_defect_fraction",
});

const posInt = (n) => Number.isSafeInteger(n) && n > 0;

/** Canonicalise the policy into exactly the frozen key set for its basis, rejecting anything else. */
export function canonicalProbabilityPolicy(policy) {
  if (policy === null || typeof policy !== "object" || Array.isArray(policy)) {
    throw new TypeError("probability_policy_object");
  }
  const basis = policy.target_defect_basis;
  if (!PROBABILITY_POLICY_BASES.includes(basis)) {
    throw new Error("probability_policy_target_defect_basis");
  }
  // Exact-key schema: common keys plus EXACTLY the active basis field. The inactive alternative
  // being present is a schema rejection, not a silently ignored extra.
  const want = [...COMMON_KEYS, BASIS_KEYS[basis]].sort();
  const got = Object.keys(policy).sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw new Error("probability_policy_exact_key_schema");
  }

  if (basis === "absolute_count") {
    // J* is an integer threshold, not a rational; 1 <= J* is enforced here, J* <= N needs N.
    if (!isCanonicalUnsignedDecimal(policy.target_defect_count)) {
      throw new Error("probability_policy_target_defect_count");
    }
    if (BigInt(policy.target_defect_count) < 1n) {
      throw new Error("probability_policy_target_defect_count");
    }
  } else {
    let f;
    try {
      f = parseRational(policy.target_defect_fraction);
    } catch {
      throw new Error("probability_policy_target_defect_fraction");
    }
    // f* in (0,1]: a generic rational rule must not silently permit 0 or a value above 1.
    if (!ratIsPositiveToOne(f)) throw new Error("probability_policy_target_defect_fraction");
  }

  let pmin;
  try {
    pmin = parseRational(policy.minimum_detection_bound);
  } catch {
    throw new Error("probability_policy_minimum_detection_bound");
  }
  if (!ratIsZeroToOne(pmin)) throw new Error("probability_policy_minimum_detection_bound");

  if (typeof policy.k_derivation_version !== "string" || policy.k_derivation_version.length === 0) {
    throw new Error("probability_policy_k_derivation_version");
  }
  if (!PROBABILITY_CLAIM_TYPES.includes(policy.claim_type)) {
    throw new Error("probability_policy_claim_type");
  }
  for (const k of PROBABILITY_POLICY_LIMITS) {
    if (!posInt(policy[k])) throw new Error(`probability_policy_${k}`);
  }
  if (
    policy.max_probability_package_canonical_bytes > policy.max_probability_package_transport_bytes
  ) {
    throw new Error("probability_policy_canonical_over_transport");
  }

  const out = {};
  for (const k of [...COMMON_KEYS, BASIS_KEYS[basis]]) out[k] = policy[k];
  return out;
}

/** probability_policy_digest = SHA256(PROBABILITY_POLICY_DOMAIN || canonicalJson(policy)), bare-hex. */
export function probabilityPolicyDigest(policy) {
  const canonical = canonicalProbabilityPolicy(policy);
  const pre = Buffer.concat([
    Buffer.from(PROBABILITY_POLICY_DOMAIN, "utf8"),
    Buffer.from(canonicalJson(canonical), "utf8"),
  ]);
  return encodeDigestToken(sha256(pre));
}
