// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC: Verifiable Universe Commitment. Constants + the VFC separation-rung lattice (Lane C).
// Motto: AnthropicSafe First, then ReviewerSafe. Public wording stays provider-agnostic.
//
// Declared-universe → evaluated-universe equality (per component) over a Merkle-set commitment, with
// commit-first sequencer precedence and exact reviewer/producer execution bindings. Lives at the STAGE
// ROOT (like stage5i/stage5j) so `../stage4h/exitCodes.mjs` resolves; core modules import via
// `../constants.mjs`.
export {
  VUC_RAW_CODES as CODES,
  VUC_PUBLIC_CHECK_ORDER,
  VUC_AUDIT_CHECK_ORDER,
  VUC_AUDIT_ONLY_CODES,
  VUC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

export const DOMAINS = Object.freeze({
  leaf: "simurgh.vuc.leaf.v1",
  node: "simurgh.vuc.node.v1",
  section_subject: "simurgh.vuc.section_subject.v1",
  commitment: "simurgh.vuc.commitment.v1",
  producer_commitment: "simurgh.vuc.producer_commitment.v1",
  start_challenge: "simurgh.vuc.start_challenge.v1",
  review_start_record: "simurgh.vuc.review_start_record.v1",
  producer_rating_start: "simurgh.vuc.producer_rating_start.v1",
  review_execution_binding: "simurgh.vuc.review_execution_binding.v1",
  producer_execution_binding: "simurgh.vuc.producer_execution_binding.v1",
  omission_claim: "simurgh.vuc.omission_claim.v1",
  verification_context: "simurgh.vuc.verification_context.v1",
  attestation_public: "simurgh.vuc.public_attestation.v1",
  attestation_audit: "simurgh.vuc.audit_attestation.v1",
});
export const MERKLE = Object.freeze({ profile: "simurgh.vuc.merkle_set.v1", hash: "sha-256" });

// G13 belt — an adequacy assertion in the flat annotation surface fails closed at schema (348). The
// structural guarantee is the Lean noUniverseAdequacyBit; this is the lexical screen (bounded vocab).
export const ADEQUACY_FORBIDDEN_KEYS = Object.freeze(
  new Set(["complete", "exhaustive", "all_risks_covered", "universe_adequate"])
);

// Two-axis anchor state machine (spec §2). ordering must be verified_immediate to accept; finality
// pending is allowed; a confirmed claim over computed pending/invalid, or invalid evidence, fails closed.
export const ANCHOR_STATE = Object.freeze({
  ordering: Object.freeze(["verified_immediate", "pending_unverified", "invalid"]),
  finality: Object.freeze(["pending", "confirmed", "invalid"]),
});

// Structural union slots raw 362 rejects when non-null — NOT the socket-ledger IOUs.
export const VUC_RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "review_window_binding", // VTC pays
  "campaign_composition_root", // capstone consumes
]);
export const VUC_MINTED_SOCKETS = Object.freeze(["universe_adequacy_deferred"]);

// VFC separation-rung lattice (copy 5J). Ordinal only, never a measurement.
const RUNG_ORDER = ["distinct_key_only", "challenge_bound", "externally_anchored"];
export const RUNG = Object.freeze({
  order: Object.freeze([...RUNG_ORDER]),
  index: (r) => {
    const i = RUNG_ORDER.indexOf(r);
    if (i < 0) throw new Error(`invalid rung ${JSON.stringify(r)}`);
    return i;
  },
});
export function rungGte(a, b) {
  return RUNG.index(a) >= RUNG.index(b);
}

// Exact frozen policy profiles (integers, not "≥2"). policy_digest is pinned OUT of band; both the
// producer commitment statement and verification_context carry it (Review-v2 rule 4).
export const POLICY_PROFILES = Object.freeze({
  release: Object.freeze({
    profile_id: "vuc-release-v1",
    min_leaves: 2,
    require_dual_equality: true,
    forbid_fixture_order_ticket: true, // fixture_sequenced_order_ticket forbidden under release
  }),
  test: Object.freeze({
    profile_id: "vuc-test-v1",
    min_leaves: 1,
    require_dual_equality: true,
    forbid_fixture_order_ticket: false,
  }),
});
