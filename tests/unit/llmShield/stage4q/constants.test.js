// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VFR_RAW_CODES,
  VFR_CHECK_ORDER,
  VFR_REASONS_81,
  VFR_REASONS_82,
  VFR_REASONS_84,
  VFR_REASONS_87,
  VFR_REASONS_88,
  VFR_REASONS_89,
  RUN_LEVEL_BY_RAW,
  stage4CodeForRawCode,
} from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  SCHEMAS,
  DOMAINS,
  ENUMS,
  VFR_NON_CLAIMS,
  POLICY_ENVELOPE_KEYS,
  RECEIPT_KEYS,
  CROSSING_KEYS,
  CHAIN_ENTRY_KEYS,
  EXEMPTION_KEYS,
  MAX_WINDOW_STRADDLE,
  KERNEL_ENTRYPOINT_V1,
  GENESIS,
} from "../../../../tools/simurgh-attestation/stage4q/constants.mjs";

test("vfr raw codes 80-89 are frozen and complete (spec §2.3)", () => {
  assert.deepEqual(VFR_RAW_CODES, {
    FRICTION_ENVELOPE_MISSING: 80,
    FRICTION_SIGNATURE_INVALID: 81,
    FRICTION_EPOCH_INVALID: 82,
    APPROVAL_RECEIPT_MISSING: 83,
    APPROVAL_DIGEST_NOT_BOUND_TO_CROSSING: 84,
    APPROVAL_CHAIN_POSITION_INVALID: 85,
    APPROVER_KEY_NOT_DISTINCT: 86,
    FRICTION_POLICY_NOT_SATISFIED: 87,
    FRICTION_RECEIPT_BINDING_MISMATCH: 88,
    FRICTION_ORDER_LAUNDERING: 89,
  });
});

test("normative check order is frozen (spec §2.3: structural first, laundering early)", () => {
  assert.deepEqual(VFR_CHECK_ORDER, [80, 83, 81, 82, 89, 86, 84, 85, 87, 88]);
});

test("82 vs 88 replay semantics are separate reason ledgers (spec §2.5)", () => {
  assert.deepEqual(VFR_REASONS_82, [
    "run_epoch_outside_validity_window",
    "window_straddle_exceeded",
  ]);
  assert.ok(VFR_REASONS_88.includes("run_id_mismatch"));
  assert.ok(VFR_REASONS_88.includes("display_digest_mismatch"));
  assert.ok(VFR_REASONS_88.includes("friction_receipt_binding_mismatch")); // exemption-path 88
  assert.ok(VFR_REASONS_89.includes("census_mismatch"));
  assert.ok(VFR_REASONS_89.includes("refusal_entry_removed"));
});

test("No Silent Exemption reasons are live under the variant binding (Freeze 5)", () => {
  // Raw 84 covers the variant binding: unresolved object, digest mismatch, both-present conflict.
  assert.deepEqual(VFR_REASONS_84, [
    "approval_binding_unresolved",
    "approval_binding_digest_mismatch",
    "binding_kind_conflict",
  ]);
  assert.ok(!VFR_REASONS_84.includes("crossing_missing_receipt_digest")); // unreachable, removed
  assert.ok(VFR_REASONS_87.includes("approval_exemption_not_permitted_by_policy"));
  assert.ok(VFR_REASONS_81.includes("exemption_signature_invalid"));
});

test("all 10 codes map to run-level 1; unknown fails closed to 3", () => {
  for (const code of Object.values(VFR_RAW_CODES)) {
    assert.equal(RUN_LEVEL_BY_RAW[code], 1);
    assert.equal(stage4CodeForRawCode(code), 1);
  }
  assert.equal(stage4CodeForRawCode(999), 3);
});

// ---------------------------------------------------------------------------
// Task 2 — constants module (schemas, domains, enums, non-claims, key tuples).
// ---------------------------------------------------------------------------

test("six vfr schemas are frozen (spec §2.2 + Freeze 5 exemption)", () => {
  assert.deepEqual(SCHEMAS, {
    ENVELOPE: "simurgh.vfr_friction_envelope.v1",
    APPROVAL_RECEIPT: "simurgh.vfr_approval_receipt.v1",
    APPROVAL_EXEMPTION: "simurgh.vfr_approval_exemption.v1",
    BOUNDARY_CROSSING: "simurgh.vfr_boundary_crossing.v1",
    RUN_CHAIN_ENTRY: "simurgh.vfr_run_chain_entry.v1",
    ATTESTATION: "simurgh.vfr_attestation.v1",
  });
});

test("all domains are stage4q-prefixed and unique", () => {
  const values = Object.values(DOMAINS);
  for (const d of values) assert.match(d, /^SIMURGH_STAGE4Q_[A-Z0-9_]+$/);
  assert.equal(new Set(values).size, values.length);
});

test("boundary kinds are the five frozen kinds only (spec §1.1)", () => {
  assert.deepEqual(ENUMS.boundary_kind, [
    "tool_execution",
    "unsafe_export",
    "privilege_expansion",
    "consent_broadening",
    "disclosure_escalation",
  ]);
  assert.deepEqual(ENUMS.entry_kind, ["approval", "crossing", "refusal"]);
  assert.deepEqual(ENUMS.approver_kind, ["fixture_signer", "human_terminal", "reviewer_supplied"]);
  assert.deepEqual(ENUMS.approval_binding_kind, ["receipt", "exemption"]);
  assert.deepEqual(ENUMS.exemption_reason, ["approval_not_present"]);
});

test("the 11 non-claims are frozen verbatim (spec §1.3 + rail 11 Freeze 5)", () => {
  assert.deepEqual(VFR_NON_CLAIMS, [
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
});

test("exact-key lists match the frozen schema shapes (plan freezes 1-2, spec §2.2)", () => {
  assert.deepEqual(POLICY_ENVELOPE_KEYS, [
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
  assert.deepEqual(RECEIPT_KEYS, [
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
  assert.deepEqual(EXEMPTION_KEYS, [
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
  assert.deepEqual(CROSSING_KEYS, [
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
  assert.deepEqual(CHAIN_ENTRY_KEYS, [
    "schema",
    "entry_kind",
    "entry_digest",
    "raw_code",
    "previous_entry_digest",
    "chain_position",
  ]);
  assert.equal(MAX_WINDOW_STRADDLE, 1);
  assert.equal(KERNEL_ENTRYPOINT_V1, "authorise_with_friction.v1");
  assert.match(GENESIS, /^sha256:[0-9a-f]{64}$/);
});

test("crossing binding is a variant (receipt|exemption), never an overloaded field (Freeze 5)", () => {
  assert.ok(CROSSING_KEYS.includes("approval_binding_kind"));
  assert.ok(CROSSING_KEYS.includes("approval_binding_digest"));
  assert.ok(!CROSSING_KEYS.includes("approval_receipt_digest")); // not overloaded
  assert.deepEqual(ENUMS.approval_binding_kind, ["receipt", "exemption"]);
});
