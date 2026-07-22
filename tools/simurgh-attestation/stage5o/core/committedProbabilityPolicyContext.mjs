// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §9.5 — the opaque CommittedProbabilityPolicyContext.
//
// The §9 policy is precommitted before the anchor, so it must be authenticated against the anchored
// precommitment before ANY of its values (including the outer package ceilings) may be trusted. The
// mint recomputes the digest and requires equality; a caller cannot assert a policy into authority.
// Opacity is a module-private WeakSet, so a structural lookalike is not a capability.
import { decodeDigestToken } from "./digestTokenCodec.mjs";
import { canonicalProbabilityPolicy, probabilityPolicyDigest } from "./probabilityPolicy.mjs";

const MINTED = new WeakSet();

export function mintCommittedProbabilityPolicyContext(fields) {
  if (fields === null || typeof fields !== "object") {
    throw new TypeError("committed_probability_policy_object");
  }
  const policy = canonicalProbabilityPolicy(fields.probability_policy);
  decodeDigestToken(fields.precommitted_probability_policy_digest); // throws on a malformed token
  if (probabilityPolicyDigest(policy) !== fields.precommitted_probability_policy_digest) {
    throw new Error("committed_probability_policy_precommitment_mismatch");
  }
  const ctx = Object.freeze({
    probability_policy: Object.freeze(policy),
    precommitted_probability_policy_digest: fields.precommitted_probability_policy_digest,
  });
  MINTED.add(ctx);
  return ctx;
}

export function isCommittedProbabilityPolicyContext(x) {
  return x !== null && typeof x === "object" && MINTED.has(x);
}
