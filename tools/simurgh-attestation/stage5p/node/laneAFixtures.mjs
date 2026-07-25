// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5P Lane A Task 7 — the clean accepted ancestor and the six single-defect fixtures.
//
// SEALED SYNTHETIC. No Fulcio, no Rekor, no OIDC, no DNS, no company registry, no network, no
// clock. The authorities are deliberately named `simurgh.synthetic.*` and never after a real
// provider: this lane proves the VSI contract and verifier semantics, NOT compatibility with any
// external service.
//
// Every fixture is the ancestor with exactly ONE mutation. All checks before the fixture's expected
// check remain satisfied, so the reported first failure is forced by prefix satisfaction rather
// than by luck of ordering.
import { PRINCIPAL_TYPE } from "../core/canonicalPrincipal.mjs";
import {
  RESOLVER_PROFILE_TYPE,
  makeResolverProfile,
  makeResolverRegistry,
} from "../core/resolverProfile.mjs";
import { RESOLVER_EVIDENCE_TYPE } from "../core/resolverEvidence.mjs";

// One canonical identity universe, reached from the IDENTICAL local key by every profile — the
// only arrangement the T10 registry rule permits for profiles that speak about one principal.
export const SUBJECT_NS = "simurgh.synthetic.subject.v1";
const LOCAL_KEY = "subject";

export const ALICE = Object.freeze({
  type: PRINCIPAL_TYPE,
  kind: "account",
  namespace_id: SUBJECT_NS,
  subject_id: "a".repeat(64),
});
export const BOB = Object.freeze({
  type: PRINCIPAL_TYPE,
  kind: "account",
  namespace_id: SUBJECT_NS,
  subject_id: "b".repeat(64),
});

const profile = (id, fpr, ceiling) =>
  makeResolverProfile({
    type: RESOLVER_PROFILE_TYPE,
    profile_id: id,
    trust_root_fpr: fpr,
    permitted_claim_types: ["principal"],
    ceiling,
    namespace_map: { [LOCAL_KEY]: SUBJECT_NS },
  });

// Continuity-competent, role-INCOMPETENT — the S2.1 attack surface.
export const REGISTRY_PROFILE = profile("simurgh.synthetic.registry.v1", "1".repeat(64), {
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "durable",
  role: "unproven",
});
export const ROLE_PROFILE = profile("simurgh.synthetic.role-authority.v1", "2".repeat(64), {
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "ephemeral",
  role: "accountable_role_bound",
});
// Pinned in the registry but NOT in the trusted set — stands in for untrusted content (T5).
export const UNTRUSTED_PROFILE = profile(
  "simurgh.synthetic.untrusted-narrator.v1",
  "3".repeat(64),
  {
    binding: "cryptographically_bound",
    resolution: "principal_resolved",
    continuity: "durable",
    role: "accountable_role_bound",
  }
);

export const REGISTRY = makeResolverRegistry([REGISTRY_PROFILE, ROLE_PROFILE, UNTRUSTED_PROFILE]);
export const PINNED = Object.freeze({
  registry: REGISTRY,
  trusted_profile_ids: Object.freeze([REGISTRY_PROFILE.profile_id, ROLE_PROFILE.profile_id]),
});

const evidence = ({
  principal = ALICE,
  profileId = REGISTRY_PROFILE.profile_id,
  delta,
  digest = "c".repeat(64),
}) => ({
  type: RESOLVER_EVIDENCE_TYPE,
  profile_id: profileId,
  claim: { principal },
  asserted_strength_delta: delta,
  evidence_digest: digest,
  submission_digest_binding: "d".repeat(64),
  signature: "ab12",
});

// The ancestor deliberately asserts a SUB-ceiling vector, leaving headroom on `resolution` and
// `continuity`. If it asserted the full ceiling, every other in-ceiling vector would necessarily sit
// below it and two in-ceiling assertions could never be incomparable — S2.6 would be geometrically
// impossible to express, and the premise gate caught exactly that.
const ANCESTOR_DELTA = Object.freeze({
  binding: "unbound",
  resolution: "provider_asserted",
  continuity: "ephemeral",
  role: "unproven",
});

/** The one clean accepted ancestor. Every fixture derives from exactly this. */
export function cleanAncestor() {
  return {
    subject: ALICE,
    required: { ...ANCESTOR_DELTA },
    evidences: [evidence({ delta: { ...ANCESTOR_DELTA } })],
  };
}

const clone = (b) => JSON.parse(JSON.stringify(b));

/**
 * The six fixtures. Each returns { bundle, expected_check_id, expected_policy_outcome,
 * single_defect_description, mutate } where `mutate` describes the one thing changed.
 */
export const S2_FIXTURES = Object.freeze([
  {
    fixture_id: "S2.1",
    single_defect_description:
      "continuity resolver attempts to raise role above its vector ceiling",
    expected_check_id: "S2.C7",
    expected_policy_outcome: "accountable_role_unproven",
    build() {
      const b = clone(cleanAncestor());
      b.evidences[0].asserted_strength_delta.role = "accountable_role_bound";
      return b;
    },
  },
  {
    fixture_id: "S2.2",
    single_defect_description:
      "a second valid assertion identifies a DIFFERENT canonical principal",
    expected_check_id: "S2.C5",
    expected_policy_outcome: "identity_principal_mismatch",
    build() {
      const b = clone(cleanAncestor());
      b.evidences.push(
        evidence({ principal: BOB, delta: { ...ANCESTOR_DELTA }, digest: "e".repeat(64) })
      );
      return b;
    },
  },
  {
    fixture_id: "S2.3",
    single_defect_description: "the same evidence re-presented under a stronger profile",
    expected_check_id: "S2.C4",
    expected_policy_outcome: "identity_replay_upgrade_attempted",
    build() {
      const b = clone(cleanAncestor());
      const replay = clone(b.evidences[0]);
      replay.profile_id = ROLE_PROFILE.profile_id; // stronger profile, same underlying evidence
      b.evidences.push(replay);
      return b;
    },
  },
  {
    fixture_id: "S2.4",
    single_defect_description:
      "required and actual are incomparable — no scalar or lexicographic collapse",
    expected_check_id: "S2.C8",
    expected_policy_outcome: "identity_strength_incomparable",
    build() {
      const b = clone(cleanAncestor());
      // banked is the ancestor delta; this required RAISES binding and LOWERS resolution, so
      // neither vector dominates the other and no total order can rank them.
      b.required = {
        binding: "cryptographically_bound",
        resolution: "unresolved",
        continuity: "ephemeral",
        role: "unproven",
      };
      return b;
    },
  },
  {
    fixture_id: "S2.5",
    single_defect_description: "untrusted narrator claims resolver authority",
    expected_check_id: "S2.C3",
    expected_policy_outcome: "identity_provider_untrusted",
    build() {
      const b = clone(cleanAncestor());
      b.evidences[0].profile_id = UNTRUSTED_PROFILE.profile_id;
      return b;
    },
  },
  {
    fixture_id: "S2.6",
    single_defect_description: "contradictory assertions about the SAME canonical principal",
    expected_check_id: "S2.C6",
    expected_policy_outcome: "identity_claim_mismatch",
    build() {
      const b = clone(cleanAncestor());
      // Contradiction, not mere difference: this vector is LOWER on resolution and HIGHER on
      // continuity than the ancestor's, so neither refines the other. Both remain within the
      // registry ceiling, so the fixture reaches S2.C6 rather than dying at S2.C7.
      b.evidences.push(
        evidence({
          delta: {
            binding: "unbound",
            resolution: "unresolved",
            continuity: "durable",
            role: "unproven",
          },
          digest: "f".repeat(64),
        })
      );
      return b;
    },
  },
]);
