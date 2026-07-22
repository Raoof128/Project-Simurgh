// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.8 — the probability-claim verifier: a pure, prefix-ordered, first-failure relation.
//
// It executes T3.5's frozen rejection (`P_detect(N,J*,k) >= p_min`) AND verifies the number the
// producer put on the label. The floor alone is not enough: a producer presenting 9/10 over a
// computed 4/5 would pass any floor at or below 4/5, so checks 13 and 14 compare presented against
// computed before check 15 compares computed against the floor.
//
// Resource layering. Check 1 bounds RAW transport bytes before any parsing; check 3 bounds canonical
// bytes after parsing. Both precede every integer conversion, so by the time check 7 computes a GCD
// the numerals are already bounded by the canonical ceiling — the megabyte-numeral DoS is closed
// structurally. Check 10's per-field digit limit is a policy-level tightening on top of that, never
// the only thing standing between an untrusted string and BigInt().
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { RAW_VERIFIER_CODES } from "../../stage4h/exitCodes.mjs";
import { isSection9AuthorityContext } from "./acceptSection7ForSection9.mjs";
import { probabilityPolicyDigest } from "./probabilityPolicy.mjs";
import {
  isCanonicalUnsignedDecimal,
  ratCompare,
  ratIsZeroToOne,
  ratIsPositiveToOne,
} from "./probabilityRational.mjs";
import { pDetect, pPair, pairRatioActive, jStarFromFraction } from "./exactProbability.mjs";

/** Symbolic check identifiers — prose names checks by identity, never by ordinal (A/R3 discipline). */
export const SECTION9_CHECK_IDS = Object.freeze([
  "s9_check.transport_ceiling",
  "s9_check.canonical_encoding",
  "s9_check.canonical_ceiling",
  "s9_check.claim_shape",
  "s9_check.rational_grammar",
  "s9_check.denominator_positive",
  "s9_check.rational_lowest_terms",
  "s9_check.precommitment_binding",
  "s9_check.parameter_domain",
  "s9_check.evaluation_bounds",
  "s9_check.claim_type",
  "s9_check.pair_ratio_activation",
  "s9_check.detection_value",
  "s9_check.pair_ratio_value",
  "s9_check.detection_floor",
]);

/** The frozen first-failure order; index i corresponds to check i+1 and to SECTION9_CHECK_IDS[i]. */
export const SECTION9_FIRST_FAILURE_ORDER = Object.freeze([
  "s9_policy_package_transport_oversize",
  "s9_noncanonical",
  "s9_policy_package_canonical_oversize",
  "s9_probability_claim_shape",
  "s9_rational_grammar",
  "s9_denominator_not_positive",
  "s9_rational_not_lowest_terms",
  "s9_policy_binding_mismatch",
  "s9_parameter_domain_violation",
  "s9_evaluation_bound_exceeded",
  "s9_claim_type_mismatch",
  "s9_pair_ratio_activation_mismatch",
  "s9_detection_claim_value_mismatch",
  "s9_pair_ratio_value_mismatch",
  "s9_detection_floor_unmet",
]);

const CLAIM_REQUIRED_KEYS = [
  "schema_id",
  "challenge_record_digest",
  "claim_type",
  "detection_probability",
];
const CLAIM_OPTIONAL_KEYS = ["pair_ratio"];
const CLAIM_SCHEMA_ID = "simurgh.vsc.probability_claim.v1";

const reject = (n) => ({ accept: false, reason: SECTION9_FIRST_FAILURE_ORDER[n - 1], check: n });

function gcdBig(a, b) {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

/**
 * The §9 relation. Returns { accept: true } or the FIRST failure with its symbolic reason and the
 * one-based check index. Pure: it reads the sealed authority context and the raw claim only.
 */
export function verifySection9Relation(section9AuthorityContext, claimPackageRaw) {
  if (!isSection9AuthorityContext(section9AuthorityContext)) {
    throw new TypeError("verifySection9Relation_requires_section9_authority_context");
  }
  if (typeof claimPackageRaw !== "string") throw new TypeError("section9_claim_raw_string");
  const ctx = section9AuthorityContext;
  const policy = ctx.probability_policy;

  // --- 1. raw transport ceiling: the ONLY pre-parse ceiling, resolved from the precommitted policy.
  if (Buffer.byteLength(claimPackageRaw, "utf8") > ctx.max_probability_package_transport_bytes) {
    return reject(1);
  }

  // --- 2. canonical encoding (canonical size cannot be measured before parsing).
  let claim;
  try {
    claim = JSON.parse(claimPackageRaw);
  } catch {
    return reject(2);
  }
  if (claim === null || typeof claim !== "object" || Array.isArray(claim)) return reject(2);
  let canonical;
  try {
    canonical = canonicalJson(claim);
  } catch {
    return reject(2);
  }
  if (canonical !== claimPackageRaw) return reject(2);

  // --- 3. canonical ceiling.
  if (Buffer.byteLength(canonical, "utf8") > ctx.max_probability_package_canonical_bytes) {
    return reject(3);
  }

  // --- 4. exact-key shape (pair_ratio is OPTIONAL here; its activation is check 12's business).
  const keys = Object.keys(claim);
  for (const k of CLAIM_REQUIRED_KEYS) if (!keys.includes(k)) return reject(4);
  for (const k of keys) {
    if (!CLAIM_REQUIRED_KEYS.includes(k) && !CLAIM_OPTIONAL_KEYS.includes(k)) return reject(4);
  }
  if (claim.schema_id !== CLAIM_SCHEMA_ID) return reject(4);
  if (typeof claim.challenge_record_digest !== "string") return reject(4);
  if (typeof claim.claim_type !== "string") return reject(4);
  const rationalFields = [claim.detection_probability];
  if ("pair_ratio" in claim) rationalFields.push(claim.pair_ratio);
  for (const r of rationalFields) {
    if (r === null || typeof r !== "object" || Array.isArray(r)) return reject(4);
    const rk = Object.keys(r).sort();
    if (rk.length !== 2 || rk[0] !== "denominator" || rk[1] !== "numerator") return reject(4);
  }

  // --- 5/6/7. PC-0 canonicality, one rule per pass so each owns its own first failure.
  for (const r of rationalFields) {
    if (!isCanonicalUnsignedDecimal(r.numerator) || !isCanonicalUnsignedDecimal(r.denominator)) {
      return reject(5);
    }
  }
  const rats = rationalFields.map((r) => ({ n: BigInt(r.numerator), d: BigInt(r.denominator) }));
  for (const r of rats) if (r.d === 0n) return reject(6);
  for (const r of rats) if (gcdBig(r.n, r.d) !== 1n) return reject(7);
  const presentedDetection = rats[0];
  const presentedPair = rationalFields.length > 1 ? rats[1] : null;

  // --- 8. precommitment binding: this claim belongs to THIS accepted challenge, and the policy in
  //        force is the one the anchor bound.
  if (claim.challenge_record_digest !== ctx.challenge_record_digest) return reject(8);
  if (probabilityPolicyDigest(policy) !== ctx.precommitted_probability_policy_digest) {
    return reject(8);
  }

  // --- 9. parameter domain. PC-3 INACTIVITY (k<2 or N<2) is NOT a violation; check 12 owns it.
  const N = BigInt(ctx.N);
  const k = BigInt(ctx.k);
  if (N < 1n || k < 1n || k > N) return reject(9);
  let jStar;
  if (policy.target_defect_basis === "fraction") {
    const f = {
      n: BigInt(policy.target_defect_fraction.numerator),
      d: BigInt(policy.target_defect_fraction.denominator),
    };
    if (!ratIsPositiveToOne(f)) return reject(9);
    jStar = jStarFromFraction(f, N);
  } else {
    jStar = BigInt(policy.target_defect_count);
  }
  if (jStar < 1n || jStar > N) return reject(9);
  const pMin = {
    n: BigInt(policy.minimum_detection_bound.numerator),
    d: BigInt(policy.minimum_detection_bound.denominator),
  };
  if (!ratIsZeroToOne(pMin)) return reject(9);
  if (!ratIsZeroToOne(presentedDetection)) return reject(9);
  if (presentedPair && !ratIsZeroToOne(presentedPair)) return reject(9);

  // --- 10. "No Unbounded Binomial": bounded exact arithmetic, verified before it is performed.
  const maxDigits = policy.max_probability_decimal_digits;
  for (const r of rationalFields) {
    if (r.numerator.length > maxDigits || r.denominator.length > maxDigits) return reject(10);
  }
  let detect;
  try {
    detect = pDetect(N, jStar, k, policy);
  } catch {
    return reject(10); // term bound or intermediate-width bound
  }

  // --- 11. the claim type must be the precommitted one; the producer does not choose the reading.
  if (claim.claim_type !== policy.claim_type) return reject(11);

  // --- 12. PC-3 activation: a field that cannot be computed must not be emitted.
  const active = pairRatioActive(N, k);
  if (active !== (presentedPair !== null)) return reject(12);

  // --- 13. the number on the label equals the computed number.
  const expectedDetection = policy.claim_type === "at_least" ? pMin : detect.value;
  if (ratCompare(presentedDetection, expectedDetection) !== 0) return reject(13);

  // --- 14. the pair ratio likewise, when active.
  if (active && ratCompare(presentedPair, pPair(N, k)) !== 0) return reject(14);

  // --- 15. T3.5's frozen rejection, decided by exact cross multiplication.
  if (ratCompare(detect.value, pMin) < 0) return reject(15);

  return { accept: true };
}

/** Fail-closed wrapper: any unexpected internal condition becomes raw 29, never a §9 reason. */
export function evaluateSection9Safe(section9AuthorityContext, claimPackageRaw) {
  try {
    return verifySection9Relation(section9AuthorityContext, claimPackageRaw);
  } catch {
    return { accept: false, raw: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED };
  }
}
