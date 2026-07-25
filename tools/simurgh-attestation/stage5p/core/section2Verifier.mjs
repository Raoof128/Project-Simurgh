// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P §2.3/§2.4 — the nine-check Section 2 verifier.
//
// FIRST FAILURE ONLY, in the frozen order. The array below IS the normative order; prose follows
// it, never the other way round. No later check may shadow an earlier defect, which is what makes
// each S2.* fixture's expected check meaningful.
//
// The verifier emits ONLY stable symbolic values — check_id, strength_relation, policy_outcome.
// No raw numeric codes are allocated here: numbering happens once, later, in a sole allocator
// (5O §10's pattern). Scattering numbers through a verifier is how the 4R/4S exit-code ripples
// happened.
import { makeStrength, leqV, compareStrength } from "./identityLattice.mjs";
import { makePrincipal, principalsEqual } from "./canonicalPrincipal.mjs";
import { makeResolverProfile } from "./resolverProfile.mjs";
import { makeResolverEvidence, evidenceReplayIdentity } from "./resolverEvidence.mjs";
import { attachEvidence, emptyBank } from "./identityBank.mjs";

export const SECTION2_CHECK_IDS = Object.freeze([
  "S2.C1", // canonical principal grammar
  "S2.C2", // resolver signature and trusted-profile validation
  "S2.C3", // resolver-source authority
  "S2.C4", // evidence-to-profile binding and replay protection
  "S2.C5", // canonical-principal join compatibility
  "S2.C6", // same-principal claim consistency
  "S2.C7", // monotone delta and vector-ceiling enforcement
  "S2.C8", // partial-order relation
  "S2.C9", // required <=v actual policy test
]);

export const POLICY_OUTCOMES = Object.freeze([
  "identity_unresolved",
  "identity_ephemeral_only",
  "identity_provider_untrusted",
  "identity_claim_mismatch",
  "resolver_binding_invalid",
  "identity_replay_upgrade_attempted",
  "accountable_role_unproven",
  "identity_strength_incomparable",
  "identity_principal_mismatch",
  // A5 — minted when §2.7's armed trigger fired. Appended; the nine above are unchanged.
  "resolver_profile_revoked",
  "identity_principal_ceased",
]);

const reject = (check_id, outcome, detail) => ({ ok: false, check_id, outcome, detail });

/**
 * @param bundle  {{ evidences: [...], required: strengthVector, subject: principal,
 *                   seen_replay_identities?: string[] }}
 * @param pinned  {{ registry: Map<profile_id, profile>, trusted_profile_ids: string[] }}
 */
export function verifySection2(bundle, pinned) {
  const satisfied = [];
  const pass = (id) => satisfied.push(id);

  const evidences = Array.isArray(bundle?.evidences) ? bundle.evidences : null;
  if (!evidences || evidences.length === 0) {
    return reject("S2.C1", "identity_unresolved", "no evidence presented");
  }

  // ---- S2.C1 canonical principal grammar ----------------------------------------------------
  let subject;
  const parsed = [];
  try {
    subject = makePrincipal(bundle.subject);
    for (const raw of evidences) parsed.push(makeResolverEvidence(raw));
    for (const e of parsed) if ("principal" in e.claim) makePrincipal(e.claim.principal);
  } catch (err) {
    return reject("S2.C1", "identity_unresolved", err.message);
  }
  pass("S2.C1");

  // ---- S2.C2 resolver signature and trusted-profile validation -------------------------------
  const profiles = [];
  for (const e of parsed) {
    const profile = pinned?.registry?.get(e.profile_id);
    if (!profile)
      return reject("S2.C2", "resolver_binding_invalid", `unpinned profile "${e.profile_id}"`);
    try {
      profiles.push(makeResolverProfile(profile));
    } catch (err) {
      return reject("S2.C2", "resolver_binding_invalid", err.message);
    }
    // Signature bytes are validated for shape by the envelope; cryptographic verification is the
    // adapter's job (B11). A bundle that never reached an adapter carries no verified flag.
    if (e.signature_verified === false) {
      return reject("S2.C2", "resolver_binding_invalid", "adapter reported an invalid signature");
    }
  }
  pass("S2.C2");

  // ---- S2.C3 resolver-source authority --------------------------------------------------------
  // T5: untrusted content — model output, prose, prompt context — has ZERO resolver authority.
  const trusted = new Set(pinned?.trusted_profile_ids ?? []);
  const revoked = new Set(pinned?.revoked_profile_ids ?? []);
  for (const e of parsed) {
    // A5: revocation is the SPECIFIC case of which untrusted is the general one — a revoked profile
    // once held authority and lost it, an untrusted one never had any. Checking specific first is
    // what keeps the remediations distinguishable.
    if (revoked.has(e.profile_id)) {
      return reject(
        "S2.C3",
        "resolver_profile_revoked",
        `profile "${e.profile_id}" has been revoked`
      );
    }
    if (!trusted.has(e.profile_id)) {
      return reject(
        "S2.C3",
        "identity_provider_untrusted",
        `profile "${e.profile_id}" is not a trusted source`
      );
    }
  }
  pass("S2.C3");

  // ---- S2.C4 evidence-to-profile binding and replay protection --------------------------------
  const seen = new Map(); // replay identity -> profile_id first seen under
  for (const priorId of bundle.seen_replay_identities ?? []) seen.set(priorId, null);
  for (const e of parsed) {
    const rid = evidenceReplayIdentity(e);
    if (seen.has(rid)) {
      return reject(
        "S2.C4",
        "identity_replay_upgrade_attempted",
        `replay identity ${rid.slice(0, 16)} re-presented`
      );
    }
    seen.set(rid, e.profile_id);
  }
  pass("S2.C4");

  // ---- S2.C5 canonical-principal join compatibility --------------------------------------------
  // Law 7: contributions may join ONLY across the exact same canonical principal. A delegation edge
  // is NOT an equality edge and is deliberately not consulted here.
  const principalClaims = parsed
    .filter((e) => "principal" in e.claim)
    .map((e) => makePrincipal(e.claim.principal));
  for (const p of principalClaims) {
    if (!principalsEqual(p, principalClaims[0])) {
      return reject(
        "S2.C5",
        "identity_principal_mismatch",
        "contributions resolve to different canonical principals"
      );
    }
  }
  pass("S2.C5");

  // ---- S2.C6 same-principal claim consistency --------------------------------------------------
  // Same subject, contradictory assertions: two evidences over one principal whose asserted vectors
  // are INCOMPARABLE contradict each other (neither is a refinement of the other).
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      if (
        compareStrength(parsed[i].asserted_strength_delta, parsed[j].asserted_strength_delta) ===
        "incomparable"
      ) {
        return reject(
          "S2.C6",
          "identity_claim_mismatch",
          "contradictory assertions about one canonical principal"
        );
      }
    }
  }
  pass("S2.C6");

  // ---- S2.C7 monotone delta and vector-ceiling enforcement -------------------------------------
  let bank = emptyBank();
  for (let i = 0; i < parsed.length; i += 1) {
    // A5.3: authority to speak about lifecycle IS the existing ceiling, not a new field. A profile
    // with no continuity standing declaring a subject ceased is Law 4 laundering in a new hat.
    if ("principal_lifecycle" in parsed[i] && profiles[i].ceiling.continuity !== "durable") {
      return reject(
        "S2.C7",
        "accountable_role_unproven",
        "profile asserts principal_lifecycle without continuity authority"
      );
    }
    const r = attachEvidence(bank, parsed[i], profiles[i]);
    if (!r.ok) return reject("S2.C7", "accountable_role_unproven", r.reason);
    bank = r.bank;
  }
  pass("S2.C7");

  // ---- S2.C8 partial-order relation -------------------------------------------------------------
  const entry = bank.principals.find((x) => principalsEqual(x.principal, subject));
  if (!entry)
    return reject("S2.C8", "identity_unresolved", "subject not present in the derived bank");
  let required;
  try {
    required = makeStrength(bundle.required);
  } catch (err) {
    return reject("S2.C8", "identity_unresolved", err.message);
  }
  const relation = compareStrength(required, entry.strength);
  if (relation === "incomparable") {
    return reject(
      "S2.C8",
      "identity_strength_incomparable",
      "required and actual are incomparable"
    );
  }
  pass("S2.C8");

  // ---- S2.C9 required <=v actual ----------------------------------------------------------------
  if (!leqV(required, entry.strength)) {
    // A5: most specific reason first. Cessation explains WHY no strength will ever be enough, so it
    // outranks ephemerality, which in turn outranks the generic unresolved fallback.
    const ceased = parsed.some((e) => e.principal_lifecycle === "ceased");
    const outcome = ceased
      ? "identity_principal_ceased"
      : entry.strength.continuity === "ephemeral"
        ? "identity_ephemeral_only"
        : "identity_unresolved";
    return reject("S2.C9", outcome, "actual strength does not meet the required minimum");
  }
  pass("S2.C9");

  return {
    ok: true,
    checks_satisfied: Object.freeze(satisfied),
    bank,
    strength_relation: relation,
  };
}

/**
 * Fail-closed wrapper — wired LAST, per the standing stage invariant.
 *
 * Any input the pure verifier cannot even parse, and any internal error, becomes a TYPED rejection
 * rather than a thrown exception or (far worse) a silent accept. A failed run hands back no bank:
 * there is no partial state for a caller to mistake for a result.
 */
export function evaluateSection2Safe(bundle, pinned) {
  try {
    const r = verifySection2(bundle, pinned);
    if (r.ok) return r;
    return { ok: false, check_id: r.check_id, outcome: r.outcome, detail: r.detail };
  } catch (err) {
    return {
      ok: false,
      check_id: "S2.C1",
      outcome: "identity_unresolved",
      detail: `fail-closed: ${err?.message ?? "unrepresentable input"}`,
    };
  }
}
