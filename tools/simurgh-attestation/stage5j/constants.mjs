// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC: Verifiable Rating Contest. Constants + the VFC separation-rung lattice (Lane C).
// Motto: AnthropicSafe First, then ReviewerSafe.
//
// Exact rating-obligation equality over the verified 5I coverage relation (reviewer pairs = C(r) AND
// producer sections = S), append-only contest events, No Silent Favourable Override. Contest recorder,
// NOT truth arbiter. Lives at the STAGE ROOT (like stage5i/constants.mjs) so `../stage4h/exitCodes.mjs`
// resolves; core modules import it via `../constants.mjs`.
export {
  VRC_RAW_CODES as CODES,
  VRC_PUBLIC_CHECK_ORDER,
  VRC_AUDIT_CHECK_ORDER,
  VRC_AUDIT_ONLY_CODES,
  VRC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

export const DOMAINS = Object.freeze({
  scale: "simurgh.vrc.scale.v1",
  reviewer_rating: "simurgh.vrc.reviewer_rating.v1",
  producer_rating: "simurgh.vrc.producer_rating.v1",
  epoch_ticket: "simurgh.vrc.epoch_ticket.v1",
  contest_event: "simurgh.vrc.contest_event.v1",
  producer_response: "simurgh.vrc.producer_response.v1",
  concurrence: "simurgh.vrc.concurrence.v1",
  rebuttal: "simurgh.vrc.rebuttal.v1",
  attestation_public: "simurgh.vrc.public_attestation.v1",
  attestation_audit: "simurgh.vrc.audit_attestation.v1",
});

// Two orthogonal derived-state fields (spec §1). abstain/not_assessed/cross-scale/out-of-dimension ⇒
// non_comparable + not_applicable. Both terminal contest states are reachable ONLY from
// contested_response_recorded and are mutually exclusive per (event, reviewer).
export const RATING_STATE = Object.freeze({
  comparison: Object.freeze(["non_comparable", "comparable_uncontested", "comparable_contested"]),
  contest: Object.freeze([
    "not_applicable",
    "contested_unanswered",
    "contested_response_recorded",
    "reviewer_concurrence_backed",
    "contested_reviewer_maintains",
  ]),
});

// G13 belt-and-suspenders — a correctness/verdict-of-truth assertion in the flat annotation surface
// fails closed at schema (332). The structural guarantee is the Lean noCorrectnessBit; this is the
// lexical screen. Honest bound: a bounded vocabulary, not a semantic proof.
export const CORRECTNESS_FORBIDDEN_KEYS = Object.freeze(
  new Set([
    "producer_wrong",
    "reviewer_right",
    "rating_correct",
    "rating_incorrect",
    "verdict_truth",
  ])
);

// Runtime artifact fields raw 346 rejects when non-null (structural slots) — NOT the socket-ledger
// IOUs. Two distinct constants (reviewer P3). external_registry_anchor is an ACTIVE optional field
// (345 family), NOT a 346 slot.
export const VRC_RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "universe_commitment_anchor", // VUC pays
  "review_window_binding", // VTC pays
  "campaign_composition_root", // capstone consumes
]);
export const VRC_MINTED_SOCKETS = Object.freeze([
  "rating_truth_oracle_deferred",
  "response_adequacy_deferred",
]);

// VFC separation-rung lattice re-instantiated for Lane C independence. Ordinal only, never a
// measurement (cf. 5G/5I). distinct_key_only → challenge_bound → externally_anchored.
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

// Exact frozen policy profiles (integers, not "≥2"). policy_digest is pinned OUT of band.
export const POLICY_PROFILES = Object.freeze({
  release: Object.freeze({
    profile_id: "vrc-release-v1",
    min_reviewers: 2,
    require_two_sided_equality: true,
  }),
  test: Object.freeze({
    profile_id: "vrc-test-v1",
    min_reviewers: 1,
    require_two_sided_equality: true,
  }),
});
