// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4T VIC constants (spec §2, §3). Motto: AnthropicSafe First, then ReviewerSafe.
//
// Schemas, template regimes, the normative three-way partition over each pinned
// Commission template, the closed recompute-kind registry keys, and the signed
// non-claims / known-limitations / honesty-rails (verbatim, in spec order).

export const VIC_CAPSULE_SCHEMA = "simurgh.vic.capsule.v1";
export const VIC_CAPSULE_BUNDLE_SCHEMA = "simurgh.vic.capsule_bundle.v1";
export const VIC_ATTESTATION_SCHEMA = "simurgh.vic.attestation.v1";
export const VIC_VIEW_SCHEMA = "simurgh.vic.view.v1";
export const VIC_TEMPLATE_SNAPSHOT_SCHEMA = "simurgh.vic.template_snapshot.v1";

export const TEMPLATE_REGIMES = Object.freeze(["gpai_art55", "art73_high_risk_draft"]);

export const PARTITION_CLASSES = Object.freeze([
  "evidence_backed",
  "not_derivable",
  "requires_human_input",
]);

export const VIEW_TIERS = Object.freeze(["regulator", "insurer", "public"]);

// Closed recompute-kind registry keys (spec §6). Every evidence_backed section
// declares exactly one of these; projectionCore holds one pure function per key.
export const RECOMPUTE_KINDS = Object.freeze([
  "stage4s_chain_verdict",
  "kernel_block_record",
  "epoch_range",
  "participant_count",
  "consent_manifest_scope",
  "stage4u_asr",
  "stage4n_beat_index",
]);

// Pinned digests of the two committed template snapshots (Task 2). recordDigest is
// over the canonical parsed object, so these are independent of file formatting.
export const TEMPLATE_SNAPSHOT_DIGESTS = Object.freeze({
  gpai_art55: "sha256:42744b2efe7df50f869aa0fc24fbe3da75ea50e576221a26751f4638e242ad4f",
  art73_high_risk_draft: "sha256:42c8eab2e75d6a7ed64af609e58529806cffc61bc329ff792719d490b0380e20",
});

// Normative three-way partition over EVERY section of each pinned snapshot
// (exhaustive — verifyTemplateBindings enforces setEqual with the snapshot).
// Honest classification: only sections a Simurgh spine artifact can actually
// derive are evidence_backed; harm / identity / analysis are requires_human_input;
// prose descriptions with no recompute source are not_derivable.
export const PARTITIONS = Object.freeze({
  gpai_art55: Object.freeze({
    incident_dates: "evidence_backed",
    resulting_harm: "requires_human_input",
    chain_of_events: "evidence_backed",
    model_involved: "requires_human_input",
    evidence_available: "not_derivable",
    serious_incident_response: "evidence_backed",
    recommendation: "requires_human_input",
    root_cause_analysis: "requires_human_input",
    post_market_monitoring_patterns: "not_derivable",
    submitter_information: "requires_human_input",
  }),
  art73_high_risk_draft: Object.freeze({
    admin_authority: "requires_human_input",
    report_dates_classification: "evidence_backed",
    submitter_information: "requires_human_input",
    system_categorisation: "requires_human_input",
    system_description: "requires_human_input",
    incident_nature: "requires_human_input",
    users_affected: "evidence_backed",
    remedial_actions: "evidence_backed",
    initial_reporter: "requires_human_input",
    provider_preliminary_comments: "requires_human_input",
    cause_investigation: "requires_human_input",
    general_comments: "not_derivable",
  }),
});

// For every evidence_backed section, the recompute kind that derives its value.
export const PARTITION_RECOMPUTE_KIND = Object.freeze({
  gpai_art55: Object.freeze({
    incident_dates: "epoch_range",
    chain_of_events: "stage4s_chain_verdict",
    serious_incident_response: "kernel_block_record",
  }),
  art73_high_risk_draft: Object.freeze({
    report_dates_classification: "epoch_range",
    users_affected: "participant_count",
    remedial_actions: "kernel_block_record",
  }),
});

export const VIC_NON_CLAIMS = Object.freeze([
  "not_a_legal_compliance_certification",
  "not_a_serious_incident_classification",
  "not_a_harm_causation_finding",
  "not_a_legal_filing_or_submission",
  "not_a_cross_run_or_fleet_completeness_claim",
  "not_pricing_or_actuarial_advice",
  "not_a_claim_the_incident_was_prevented_by_this_stage",
]);

export const VIC_KNOWN_LIMITATIONS = Object.freeze([
  "census_completeness_is_relative_to_declared_epoch_and_guarded_evidence_sources",
  "template_partitions_reflect_the_pinned_snapshots_not_future_guidance",
  "requires_human_input_sections_are_left_unfilled_by_design_the_capsule_is_not_a_complete_filing",
  "lane_b_incident_is_a_staged_contained_near_incident_not_a_field_incident",
  "redaction_hides_values_not_structure_view_privacy_is_commitment_level_not_an_anonymity_proof",
  "counter_capsule_contest_deferred",
  "verified_slot_narrative_deferred",
]);

export const VIC_RAILS = Object.freeze([
  "capsule_proves_record_completeness_not_harm_causation",
  "regulatory_projection_is_template_mapping_not_legal_compliance_claim",
  "actuarial_input_is_evidence_format_not_pricing_advice",
  "census_is_per_epoch_not_cross_run",
  "incident_classification_requires_human_input_not_machine_claimed",
  "browser_verifier_is_a_convenience_view_not_the_authoritative_verifier",
  "template_snapshot_is_pinned_by_digest_not_claimed_current_guidance",
  "no_free_text_is_ever_synthesized_into_a_projected_field",
  "anchor_time_is_evidence_seal_time_not_operator_knowledge_time",
  "views_may_redact_never_contradict_and_every_redaction_is_ledgered",
  "chain_held_verifiable_never_agents_safe",
]);

// Census manifest item kinds (spec §4).
export const CENSUS_ITEM_KINDS = Object.freeze([
  "stage4s_chain_bundle",
  "kernel_decision_records",
  "stage4u_attestation_ref",
  "stage4o_consent_manifests",
  "stage4n_temporal_anchor",
]);
