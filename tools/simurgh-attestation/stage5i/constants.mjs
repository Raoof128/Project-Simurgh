// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC: Verifiable Panel Coverage. Constants + the separation-rung lattice.
// Motto: AnthropicSafe First, then ReviewerSafe.
//
// Grant-bounded coverage equality (⋃C(r)=S) with computed reviewer+host independence. Separation
// rungs are ordered enums compared by exact small-integer ordinal — never floating-point.
export {
  VPC_RAW_CODES as CODES,
  VPC_PUBLIC_CHECK_ORDER,
  VPC_AUDIT_CHECK_ORDER,
  VPC_AUDIT_ONLY_CODES,
  VPC_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

export const DOMAINS = Object.freeze({
  partition: "simurgh.vpc.partition.v1",
  grant: "simurgh.vpc.grant.v1",
  receipt: "simurgh.vpc.receipt.v1",
  affiliation: "simurgh.vpc.affiliation.v1",
  attestation: "simurgh.vpc.attestation.v1",
  policy: "simurgh.vpc.policy.v1", // B7 — policy is digested under its own domain + externally pinned
});

// The Simurgh-signed freshness challenge that lifts a reviewer/host to challenge_bound (rung 1).
export const CHALLENGE_DOMAIN = "simurgh.vpc.challenge.v1";

// Re-instantiates 5G's rung lattice for reviewer/host principals. Ordinal only, never a measurement.
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

// Redaction taxonomy is REPORT-level (source_report.redaction_taxonomy); per-section stays [].
export const REDACTION_ENUM = Object.freeze(new Set(["misuse_risk", "commercial_proprietary"]));

// BEAST A — the frozen adequacy vocabulary. Rejected ONLY inside the permitted flat annotations
// surface (schema forbids these keys elsewhere as unknown). Honest bound: a bounded vocabulary, not
// a semantic proof.
export const ADEQUACY_FORBIDDEN_KEYS = Object.freeze(
  new Set([
    "adequate",
    "sufficient",
    "thorough",
    "review_quality",
    "approved",
    "endorsed",
    "certified_safe",
  ])
);

// S5 — exact frozen policy profiles (integers, not "≥2"). policy_digest is pinned OUT of band.
export const POLICY_PROFILES = Object.freeze({
  release: Object.freeze({
    profile_id: "vpc-release-challenge-bound-v1",
    required_reviewer_separation: "challenge_bound",
    required_host_separation: "challenge_bound",
    min_reviewers: 2,
    min_distinct_hosts: 2,
    require_nontrivial_partition: true,
    require_distinct_anchor_lineage: true,
  }),
  test: Object.freeze({
    profile_id: "vpc-test-externally-anchored-v1",
    required_reviewer_separation: "externally_anchored",
    required_host_separation: "externally_anchored",
    min_reviewers: 2,
    min_distinct_hosts: 1,
    require_nontrivial_partition: true,
    require_distinct_anchor_lineage: false,
  }),
});

// Mints 2, pays 2 — ledger flat (VRC + VUC targets).
export const VPC_RESERVED_SLOTS = Object.freeze([
  "reviewer_assessment_contest_deferred", // → VRC
  "uncommitted_section_universe_deferred", // → VUC
]);
