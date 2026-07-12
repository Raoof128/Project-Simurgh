// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q constants at the STAGE ROOT (5K convention). Frozen domain-separation tags, policy
// profiles, the VFC-style rung lattice, and the reserved-slot ledger. Re-exports the GLOBAL VTCQ_* code
// arrays so consumers import codes from one place.
export {
  VTCQ_RAW_CODES,
  VTCQ_PUBLIC_CHECK_ORDER,
  VTCQ_AUDIT_CHECK_ORDER,
  VTCQ_AUDIT_ONLY_CODES,
  VTCQ_POLICY_CODES,
} from "../stage4h/exitCodes.mjs";

// Frozen construction domains (spec §2). commitment_session is the domain of commitment_digest_bytes.
export const DOMAINS = Object.freeze({
  bundle: "simurgh.vtcq.bundle.v1",
  config: "simurgh.vtcq.config.v1",
  commitmentSession: "simurgh.vtcq.commitment_session.v1",
  verifiedAnchorSet: "simurgh.vtcq.verified_anchor_set.v1",
  startCapabilityRoot: "simurgh.vtcq.start_capability_root.v1",
  releaseCapability: "simurgh.vtcq.release_capability.v1",
  releaseSlot: "simurgh.vtcq.release_slot.v1",
  ceremonyId: "simurgh.vtcq.ceremony_id.v1",
  gateIdentity: "simurgh.vtcq.gate_identity.v1",
  scittStatement: "simurgh.vtcq.scitt_statement.v1",
  attestationPublic: "simurgh.vtcq.public_attestation.v1",
  attestationAudit: "simurgh.vtcq.audit_attestation.v1",
});

// Exact frozen policy profiles (integers, not "≥N"). The active profile is the COMMITTED one (in the
// quorum_policy inside commitment_session_id) and MUST equal the cfg profile (mismatch → 365).
export const PROFILES = Object.freeze({
  vtc_core: Object.freeze({
    min_bounded_authorities: 1,
    require_publication: false,
    threshold: 1,
    required_confirmed_publication: false,
  }),
  vtc_quorum: Object.freeze({
    min_bounded_authorities: 1,
    require_publication: true,
    threshold: 2,
    required_confirmed_publication: true,
  }),
});

// VFC separation-rung lattice (copy 5K/5J). Ordinal only, never a measurement.
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

// Structural union slots raw 382 rejects when non-null. Capstone socket + the three beast-mode debts.
export const RESERVED_ARTIFACT_SLOTS = Object.freeze([
  "campaign_composition_root", // capstone consumes
  "minimum_elapsed_review_binding", // I4 — VDF "No Instant Review"
  "third_trust_ecology", // I5 — TSA + Bitcoin + transparency-log quorum
  "hiding_scope_commitment", // I6 — binding+hiding universe commitment
]);
export const MINTED_SOCKETS = Object.freeze([
  "minimum_elapsed_review_binding",
  "third_trust_ecology",
  "hiding_scope_commitment",
]);

// Adequacy-vocabulary belt (schema 364 fails closed on these keys — bounded lexical screen, 5K G13).
export const ADEQUACY_FORBIDDEN_KEYS = Object.freeze(
  new Set(["complete", "exhaustive", "all_risks_covered", "review_adequate", "universe_adequate"])
);
