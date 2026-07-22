// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.7 — the sealed §7 -> §9 authority handoff.
//
// Section 9 consumes the frozen Section7AcceptedContext and mints its own opaque authority context.
// It PROJECTS N, k, the challenge identity, the expected policy digest and the trusted outer package
// ceilings. It never alters §7 acceptance, never accepts a structural lookalike, never trusts a
// producer-resupplied N or k, and never resolves a pre-parse ceiling from the unverified package
// being judged — the ceilings come from the precommitment-authenticated policy context.
//
// The constructor is module-private and there is no exported mint.
import { isSection7AcceptedContext } from "./acceptSection7ForSection8.mjs";
import { isCommittedProbabilityPolicyContext } from "./committedProbabilityPolicyContext.mjs";

const MINTED = new WeakSet();

function mint(fields) {
  const ctx = Object.freeze(fields);
  MINTED.add(ctx);
  return ctx;
}

export function isSection9AuthorityContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}

export function acceptSection7ForSection9(
  section7AcceptedContext,
  committedProbabilityPolicyContext
) {
  if (!isSection7AcceptedContext(section7AcceptedContext)) {
    throw new TypeError("acceptSection7ForSection9_requires_section7_accepted_context");
  }
  if (!isCommittedProbabilityPolicyContext(committedProbabilityPolicyContext)) {
    throw new TypeError("acceptSection7ForSection9_requires_committed_probability_policy");
  }
  const policy = committedProbabilityPolicyContext.probability_policy;
  return mint({
    // universe cardinality and challenge size, both projected from the ACCEPTED §7 context
    N: section7AcceptedContext.N,
    k: section7AcceptedContext.ordered_selected_indices.length,
    // challenge identity
    challenge_record_digest: section7AcceptedContext.challenge_record_digest,
    challenge_subject_digest: section7AcceptedContext.challenge_subject_digest,
    // stage precommitment identity
    scope_manifest_identity: section7AcceptedContext.scope_manifest_identity,
    epoch_digest: section7AcceptedContext.epoch_digest,
    // the authenticated policy and its precommitment binding
    probability_policy: policy,
    precommitted_probability_policy_digest:
      committedProbabilityPolicyContext.precommitted_probability_policy_digest,
    // trusted outer ceilings, resolved from the precommitment-bound policy
    max_probability_package_transport_bytes: policy.max_probability_package_transport_bytes,
    max_probability_package_canonical_bytes: policy.max_probability_package_canonical_bytes,
  });
}
