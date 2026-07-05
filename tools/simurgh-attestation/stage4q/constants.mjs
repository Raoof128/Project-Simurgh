// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Q frozen constants (4Q spec §1.1, §1.3, §2.2; plan freezes 1–5). Motto:
// AnthropicSafe First, then ReviewerSafe. Changing ANY value invalidates every
// committed digest.
import { sha256Hex } from "../stage4m/core/canonical.mjs";

export const SCHEMAS = Object.freeze({
  ENVELOPE: "simurgh.vfr_friction_envelope.v1",
  APPROVAL_RECEIPT: "simurgh.vfr_approval_receipt.v1",
  APPROVAL_EXEMPTION: "simurgh.vfr_approval_exemption.v1",
  BOUNDARY_CROSSING: "simurgh.vfr_boundary_crossing.v1",
  RUN_CHAIN_ENTRY: "simurgh.vfr_run_chain_entry.v1",
  ATTESTATION: "simurgh.vfr_attestation.v1",
});

export const DOMAINS = Object.freeze({
  ENVELOPE: "SIMURGH_STAGE4Q_ENVELOPE_V1",
  APPROVAL_RECEIPT: "SIMURGH_STAGE4Q_APPROVAL_RECEIPT_V1",
  APPROVAL_EXEMPTION: "SIMURGH_STAGE4Q_APPROVAL_EXEMPTION_V1",
  BOUNDARY_CROSSING: "SIMURGH_STAGE4Q_BOUNDARY_CROSSING_V1",
  CHAIN_ENTRY: "SIMURGH_STAGE4Q_CHAIN_ENTRY_V1",
  CHAIN_ENTRY_REPLAY: "SIMURGH_STAGE4Q_CHAIN_ENTRY_REPLAY_V1",
  CHAIN_ROOT: "SIMURGH_STAGE4Q_CHAIN_ROOT_V1",
  CENSUS: "SIMURGH_STAGE4Q_CENSUS_V1",
  DISPLAY: "SIMURGH_STAGE4Q_DISPLAY_V1",
  SOURCE_MAP: "SIMURGH_STAGE4Q_SOURCE_MAP_V1",
  CONSTITUTION_PROJECTION: "SIMURGH_STAGE4Q_CONSTITUTION_PROJECTION_V1",
  REVIEWER_NOTE: "SIMURGH_STAGE4Q_REVIEWER_NOTE_V1",
  LANE_A_EVIDENCE: "SIMURGH_STAGE4Q_LANE_A_EVIDENCE_V1",
  LANE_B_CAPTURE: "SIMURGH_STAGE4Q_LANE_B_CAPTURE_V1",
  ATTESTATION_BUNDLE: "SIMURGH_STAGE4Q_ATTESTATION_BUNDLE_V1",
});

export const ENUMS = Object.freeze({
  boundary_kind: Object.freeze([
    "tool_execution",
    "unsafe_export",
    "privilege_expansion",
    "consent_broadening",
    "disclosure_escalation",
  ]),
  entry_kind: Object.freeze(["approval", "crossing", "refusal"]),
  approver_kind: Object.freeze(["fixture_signer", "human_terminal", "reviewer_supplied"]),
  approval_binding_kind: Object.freeze(["receipt", "exemption"]),
  exemption_reason: Object.freeze(["approval_not_present"]),
});

// 4Q spec §1.3 — frozen verbatim. Never paraphrase.
export const VFR_NON_CLAIMS = Object.freeze([
  "not_general_friction_taxonomy",
  "delay_and_cooldown_deferred",
  "not_human_intent_proof",
  "live_capture_is_local_mcp_fixture_only",
  "not_external_tool_provider_guarantee",
  "approval_key_is_authorisation_evidence_not_identity_truth",
  "pincer_ordering_is_recorded_run_order_not_physical_time_truth",
  "friction_receipt_is_enforcement_evidence_not_prevention",
  "approver_key_separation_is_cryptographic_not_organisational",
  "display_digest_is_rendering_commitment_not_comprehension_proof",
  "exemption_claim_is_falsifiable_declaration_not_self_granted_bypass",
]);

// Plan freeze 1 / spec §2.2 — exact-key shapes. Order matters for exact-key checks.
export const POLICY_ENVELOPE_KEYS = Object.freeze([
  "schema",
  "policy_id",
  "boundary_kinds_requiring_approval",
  "admissible_exemption_boundary_kinds",
  "approver_public_key_digest",
  "harness_public_key_digest",
  "max_window_straddle",
  "run_id_digest",
  "stage4n_window_anchor_digest",
]);
export const RECEIPT_KEYS = Object.freeze([
  "schema",
  "action_digest",
  "request_digest",
  "boundary_kind",
  "stage4n_window_anchor_digest",
  "run_id_digest",
  "receipt_epoch",
  "valid_from_epoch",
  "valid_until_epoch",
  "nonce_digest",
  "approval_display_digest",
  "approver_public_key_digest",
  "signature",
]);
export const EXEMPTION_KEYS = Object.freeze([
  "schema",
  "action_digest",
  "request_digest",
  "boundary_kind",
  "run_id_digest",
  "stage4n_window_anchor_digest",
  "exemption_reason",
  "exemption_policy_id",
  "harness_public_key_digest",
  "signature",
]);
export const CROSSING_KEYS = Object.freeze([
  "schema",
  "action_digest",
  "request_digest",
  "boundary_kind",
  "crossing_epoch",
  "run_id_digest",
  "approval_binding_kind",
  "approval_binding_digest",
  "harness_public_key_digest",
  "signature",
]);
export const CHAIN_ENTRY_KEYS = Object.freeze([
  "schema",
  "entry_kind",
  "entry_digest",
  "raw_code",
  "previous_entry_digest",
  "chain_position",
]);

// Plan freeze 3 (spec §3.3): straddle is crossing_epoch - receipt_epoch ∈ {0, 1}.
export const MAX_WINDOW_STRADDLE = 1;
export const KERNEL_ENTRYPOINT_V1 = "authorise_with_friction.v1";

// Chain genesis: fixed, content-free anchor (same convention as prior stages).
export const GENESIS = `sha256:${sha256Hex("SIMURGH_STAGE4Q_GENESIS_V1")}`;
