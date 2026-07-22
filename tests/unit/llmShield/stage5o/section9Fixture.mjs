// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9 — a valid probability-claim case builder (NOT a test file).
//
// Reuses §8's fixture to obtain a REAL Section7AcceptedContext (minted only by the frozen production
// §7 verifier), then builds the §9 probability policy, its precommitment binding, and a claim whose
// presented values equal the computed ones. Tests mutate single fields to drive one check at a time.
import { buildValidSection8Case, canonicalJson } from "./section8Fixture.mjs";
import { probabilityPolicyDigest } from "../../../../tools/simurgh-attestation/stage5o/core/probabilityPolicy.mjs";
import { mintCommittedProbabilityPolicyContext } from "../../../../tools/simurgh-attestation/stage5o/core/committedProbabilityPolicyContext.mjs";
import { acceptSection7ForSection9 } from "../../../../tools/simurgh-attestation/stage5o/core/acceptSection7ForSection9.mjs";
import {
  pDetect,
  pPair,
  pairRatioActive,
  jStarFromFraction,
} from "../../../../tools/simurgh-attestation/stage5o/core/exactProbability.mjs";
import { formatRational } from "../../../../tools/simurgh-attestation/stage5o/core/probabilityRational.mjs";

/** A complete, valid policy; `basis` fields are supplied by the caller (discriminated shape). */
export function basePolicy(basisFields, overrides = {}) {
  return {
    ...basisFields,
    minimum_detection_bound: { numerator: "1", denominator: "10" },
    k_derivation_version: "simurgh.vsc.k_derivation.v1",
    claim_type: "exact",
    max_probability_decimal_digits: 64,
    max_probability_evaluation_terms: 65536,
    max_probability_intermediate_bits: 2097152,
    max_probability_package_transport_bytes: 65536,
    max_probability_package_canonical_bytes: 32768,
    ...overrides,
  };
}

/**
 * Build a valid §9 case. Returns the sealed contexts plus a claim package whose presented values
 * are exactly the computed ones, so any single mutation drives exactly one check.
 */
export function makeSection9Fixture({ N = 256, k = 8, policyOverride, basis } = {}) {
  const s8 = buildValidSection8Case({ N, k });
  const section7AcceptedContext = s8.acceptedCtx;

  const basisFields = basis || { target_defect_basis: "absolute_count", target_defect_count: "5" };
  const policy = basePolicy(basisFields, policyOverride || {});
  const policyContext = mintCommittedProbabilityPolicyContext({
    probability_policy: policy,
    precommitted_probability_policy_digest: probabilityPolicyDigest(policy),
  });
  const authority = acceptSection7ForSection9(section7AcceptedContext, policyContext);

  // Resolve J* the way the verifier does, then compute the exact claim values.
  const Nb = BigInt(N);
  const kb = BigInt(authority.k);
  const jStar =
    policy.target_defect_basis === "fraction"
      ? jStarFromFraction(
          {
            n: BigInt(policy.target_defect_fraction.numerator),
            d: BigInt(policy.target_defect_fraction.denominator),
          },
          Nb
        )
      : BigInt(policy.target_defect_count);

  const detect = pDetect(Nb, jStar, kb, policy);
  const active = pairRatioActive(Nb, kb);
  const claim = {
    schema_id: "simurgh.vsc.probability_claim.v1",
    challenge_record_digest: section7AcceptedContext.challenge_record_digest,
    claim_type: policy.claim_type,
    detection_probability:
      policy.claim_type === "at_least"
        ? { ...policy.minimum_detection_bound }
        : formatRational(detect.value),
    ...(active ? { pair_ratio: formatRational(pPair(Nb, kb)) } : {}),
  };

  return {
    section7AcceptedContext,
    policyContext,
    authority,
    policy,
    claim,
    raw: canonicalJson(claim),
    N,
    k: authority.k,
    jStar,
    detect,
    active,
  };
}

/**
 * Mint a fresh §9 authority over the SAME accepted §7 context but a differently-tuned policy, so a
 * test can judge an already-valid claim under tightened limits and drive exactly one check.
 */
export function authorityWith(section7AcceptedContext, policyOverride, basis) {
  const policy = basePolicy(
    basis || { target_defect_basis: "absolute_count", target_defect_count: "5" },
    policyOverride || {}
  );
  const policyContext = mintCommittedProbabilityPolicyContext({
    probability_policy: policy,
    precommitted_probability_policy_digest: probabilityPolicyDigest(policy),
  });
  return acceptSection7ForSection9(section7AcceptedContext, policyContext);
}

export { canonicalJson };
