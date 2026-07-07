// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4V VDP constants (spec §2, §3, §6). Motto: AnthropicSafe First, then ReviewerSafe.
export const VDP_COUNTER_CAPSULE_SCHEMA = "simurgh.vdp.counter_capsule.v1";
export const VDP_CONFLICT_MAP_SCHEMA = "simurgh.vdp.conflict_map.v1";
export const VDP_OUTCOME_SCHEMA = "simurgh.vdp.contest_outcome.v1";
export const VDP_ATTESTATION_SCHEMA = "simurgh.vdp.attestation.v1";
export const VDP_LANE_A_CORPUS_SCHEMA = "simurgh.vdp.lane_a_corpus.v1";
export const VDP_LANEB_CAPTURE_SCHEMA = "simurgh.vdp.laneb_capture.v1";

export const VDP_VERBS = Object.freeze(["agree", "dispute_by_recomputation", "dispute_as_judgment"]);
export const RESPONDENT_ROLES = Object.freeze([
  "provider",
  "deployer",
  "third_party",
  "unspecified",
]);
export const VDP_STATUSES = Object.freeze([
  "AGREED",
  "CONFLICT_PROVEN",
  "ABSENCE_REBUTTED",
  "DISPUTE_RECORDED",
  "DISPUTE_FAILED",
]);
export const DISPUTE_FAILED_SUBREASONS = Object.freeze([
  "recompute_failed",
  "section_not_contestable",
]);

// Anchor contest pseudo-section (spec §4a) — flows through set digest + statuses.
export const ANCHOR_REGIME = "meta";
export const ANCHOR_SECTION = "evidence_anchored_at_beat";
export const ANCHOR_KEY = `${ANCHOR_REGIME}/${ANCHOR_SECTION}`;
// filed_at_beat is signed-body metadata, NOT part of contested_section_set_digest
// (spec §4a Option B): schema-checked, payload-checked, census-checked; a failed
// self-anchor only sets filed_at_beat_status = FAILED, never voids the contest.
export const FILED_AT_BEAT_REGIME = "meta";
export const FILED_AT_BEAT_SECTION = "filed_at_beat";

export const VDP_NON_CLAIMS = Object.freeze([
  "not_an_adjudication_of_truth_or_fault",
  "not_an_adjudication_of_legal_fault",
  "not_a_finding_the_respondent_is_right",
  "not_a_multi_round_appeals_process",
  "not_an_identity_or_authority_verification_of_the_respondent",
  "python_public_core_does_not_verify_ed25519_signatures",
  "not_a_claim_the_incident_was_prevented_by_this_stage",
  "not_a_claim_partition_rescore_signals_revise_the_capsule",
]);
export const VDP_KNOWN_LIMITATIONS = Object.freeze([
  "single_round_no_surrejoinder",
  "respondent_key_provenance_out_of_band",
  "absence_rebuttal_registry_bounded",
  "lane_a_both_parties_built_by_us",
  "judgment_disputes_recorded_never_scored",
]);
export const VDP_RAILS = Object.freeze([
  "registry_authority_no_respondent_only_recompute",
  "conflict_map_derived_never_filed",
  "prose_by_digest_only",
  "read_only_kernel",
  "provider_agnostic_public_wording",
  "reference_capsule_immutability",
  "status_locality",
  "mirror_symmetry_all_agreed",
  "node_public_verifier_authoritative_for_raw_152",
]);
export const VDP_RESERVED_SLOTS = Object.freeze([
  "surrejoinder_round_deferred",
  "narrative_claim_contest_deferred",
  "risk_report_contest_profile_deferred",
  "fact_group_projection_deferred",
]);

// Reference-capsule immutability rail (spec §7): pinned from the DETERMINISTIC
// stage4t buildGreenBundle() under Node 26. e2e rebuilds and compares.
export const STAGE4T_REFERENCE_CAPSULE = Object.freeze({
  source_stage: "4T",
  incident_anchor: "stage4s_verdict_108",
  capsule_root: "sha256:c83ec9b673e2e3c0d0a1b1d6533fc93a910afcdcda99af45ace4514dad0e3f39",
  attestation_digest: "sha256:d4b64c5af3ba1fc3bf6a18c83b7ad75b2fcd17431abaeaca1398562ef2c95210",
  reference_capsule_not_synthetic: true,
});
