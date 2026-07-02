// SPDX-License-Identifier: AGPL-3.0-or-later
export const AUTHORITY_RANK = Object.freeze({
  user_confirmed: 3,
  policy_preauthorized: 2,
  agent_derived: 1,
  untrusted_context: 0,
});

export function canCarry(source, hasHigherRankedProof) {
  if (source === "untrusted_context") return false;
  if (source === "user_confirmed" || source === "policy_preauthorized") return true;
  if (source === "agent_derived") return Boolean(hasHigherRankedProof);
  return false;
}

// P4: DFI-derived truth beats the declaration. The sinkSafetyClaim comes from a 4H certificate
// that the verifier has ALREADY re-run through validateDerivation (precondition 1), so its
// `safe` field is the recomputed truth, not a producer assertion.
export function resolveP4({ authoritySource, sinkSafetyClaim }) {
  if (authoritySource === "untrusted_context") {
    return { ok: false, reason: "authority_from_untrusted_context" };
  }
  if (!sinkSafetyClaim || sinkSafetyClaim.safe !== true) {
    return { ok: false, reason: "authority_from_untrusted_context" };
  }
  return { ok: true };
}
