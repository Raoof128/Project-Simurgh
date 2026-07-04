// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4O frozen constants (4O spec §2, §4, §5, §11). Motto: AnthropicSafe First, then
// ReviewerSafe. Changing ANY value invalidates every committed digest.
export const TOOL_MANIFEST_SCHEMA = "simurgh.tool_manifest.v1";
export const COMMITMENT_SCHEMA = "simurgh.tool_manifest_commitment.v1";
export const RECEIPT_SCHEMA = "simurgh.tool_receipt.v1";
export const ACTION_SCHEMA = "simurgh.tool_action.v1";
export const TIMELINE_SCHEMA = "simurgh.surface_timeline.v1";
export const ATTESTATION_SCHEMA = "simurgh.vtsa_attestation.v1";

export const DOMAINS = Object.freeze({
  SERVER_ID: "SIMURGH_STAGE4O_SERVER_ID_V1",
  TOOLSET: "SIMURGH_STAGE4O_TOOLSET_V1",
  TOOL_ENTRY: "SIMURGH_STAGE4O_TOOL_ENTRY_V1",
  ACTION: "SIMURGH_STAGE4O_ACTION_V1",
  RECEIPT: "SIMURGH_STAGE4O_RECEIPT_V1",
  DECISION_CORPUS: "SIMURGH_STAGE4O_DECISION_CORPUS_V1",
  ATTESTATION_BUNDLE: "SIMURGH_STAGE4O_ATTESTATION_BUNDLE_V1",
  MERKLE_LEAF: "SIMURGH_STAGE4O_MERKLE_LEAF_V1",
  MERKLE_NODE: "SIMURGH_STAGE4O_MERKLE_NODE_V1",
  DELTA: "SIMURGH_STAGE4O_DELTA_V1",
  TIMELINE: "SIMURGH_STAGE4O_TIMELINE_V1",
  // Spec delta (recorded in closeout): commitments need their own domain for
  // previous_manifest_digest; the spec §5 list is extended by this 12th entry.
  MANIFEST_COMMITMENT: "SIMURGH_STAGE4O_MANIFEST_COMMITMENT_V1",
});

export const AUTHORITY_ORDER = Object.freeze(["read_only", "write", "egress", "destructive"]);
export const RISK_CLASSES = Object.freeze(["low", "medium", "high"]);
export const CONSENT_BINDINGS = Object.freeze(["state", "delta"]);
export const GENESIS = "genesis";
export const KERNEL_ENTRYPOINT = "authorise_with_manifest.v1";

export const VTSA_NON_CLAIMS = Object.freeze([
  "surface_bound_verifiable",
  "not_tools_safe",
  "not_mcp_server_safe",
  "not_protocol_rug_pull_prevention",
  "not_proof_of_human_reading",
  "merkle_machinery_standard_crypto_novel_application",
  "not_constitutional_compliance_claim",
  "not_incident_prevention_claim",
]);

// 4O spec §11.1, frozen wording — never edit.
export const HONESTY_CEILING =
  "Infrastructure alignment is not model-value alignment. Stage 4O operationalises " +
  "selected oversight and non-deception principles, but it does not claim constitutional compliance.";

// Closed vocabulary for constitutional_alignment[].alignment_claim (4O spec §11.1).
export const ALIGNMENT_VOCABULARY = Object.freeze([
  "fails_closed_when_commitment_absent_or_malformed",
  "binds_commitment_to_an_accountable_signer",
  "keeps_freshness_logical_and_reviewable",
  "prevents_hiding_a_broadening_inside_claimed_narrowings",
  "makes_blind_reapproval_of_a_broadening_a_ledgered_event",
  "prevents_silent_substitution_of_the_authorised_tool_surface",
  "prevents_silent_tool_schema_replacement",
  "prevents_silent_authority_escalation",
  "prevents_silent_sink_expansion",
  "binds_each_receipt_to_the_decision_it_records",
  "prevents_retroactive_rewriting_of_the_committed_surface",
]);
