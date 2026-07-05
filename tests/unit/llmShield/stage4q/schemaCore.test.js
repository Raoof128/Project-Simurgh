// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnvelope,
  validateReceipt,
  validateExemption,
  validateCrossing,
  validateChainEntry,
} from "../../../../tools/simurgh-attestation/stage4q/core/schemaCore.mjs";
import { SCHEMAS } from "../../../../tools/simurgh-attestation/stage4q/constants.mjs";

const D = (c) => `sha256:${c.repeat(64)}`;

export function goodEnvelope() {
  return {
    schema: SCHEMAS.ENVELOPE,
    policy_id: "vfr-default.v1",
    boundary_kinds_requiring_approval: ["tool_execution", "unsafe_export"],
    admissible_exemption_boundary_kinds: [], // default policy admits no exemptions
    approver_public_key_digest: D("a"),
    harness_public_key_digest: D("b"),
    max_window_straddle: 1,
    run_id_digest: D("c"),
    stage4n_window_anchor_digest: D("d"),
  };
}
export function goodReceipt() {
  return {
    schema: SCHEMAS.APPROVAL_RECEIPT,
    action_digest: D("e"),
    request_digest: D("f"),
    boundary_kind: "tool_execution",
    stage4n_window_anchor_digest: D("d"),
    run_id_digest: D("c"),
    receipt_epoch: 10,
    valid_from_epoch: 10,
    valid_until_epoch: 11,
    nonce_digest: D("0"),
    approval_display_digest: D("1"),
    approver_public_key_digest: D("a"),
    signature: "AAAA",
  };
}
export function goodCrossing() {
  return {
    schema: SCHEMAS.BOUNDARY_CROSSING,
    action_digest: D("e"),
    request_digest: D("f"),
    boundary_kind: "tool_execution",
    crossing_epoch: 10,
    run_id_digest: D("c"),
    approval_binding_kind: "receipt",
    approval_binding_digest: D("2"),
    harness_public_key_digest: D("b"),
    signature: "BBBB",
  };
}
export function goodExemption() {
  return {
    schema: SCHEMAS.APPROVAL_EXEMPTION,
    action_digest: D("e"),
    request_digest: D("f"),
    boundary_kind: "tool_execution",
    run_id_digest: D("c"),
    stage4n_window_anchor_digest: D("d"),
    exemption_reason: "approval_not_present",
    exemption_policy_id: "vfr-default.v1",
    harness_public_key_digest: D("b"),
    signature: "EEEE",
  };
}

test("valid objects pass", () => {
  assert.deepEqual(validateEnvelope(goodEnvelope()), { ok: true });
  assert.deepEqual(validateReceipt(goodReceipt()), { ok: true });
  assert.deepEqual(validateExemption(goodExemption()), { ok: true });
  assert.deepEqual(validateCrossing(goodCrossing()), { ok: true });
  assert.deepEqual(
    validateChainEntry({
      schema: SCHEMAS.RUN_CHAIN_ENTRY,
      entry_kind: "refusal",
      entry_digest: D("3"),
      raw_code: 83,
      previous_entry_digest: D("4"),
      chain_position: 2,
    }),
    { ok: true }
  );
});

test("absent vs schema_invalid are distinct reasons (spec §2.3 reasons 80/83)", () => {
  assert.equal(validateEnvelope(null).reason, "absent");
  assert.equal(validateReceipt(undefined).reason, "absent");
  const extra = { ...goodReceipt(), smuggled: 1 };
  assert.equal(validateReceipt(extra).reason, "schema_invalid");
  const missing = goodEnvelope();
  delete missing.policy_id;
  assert.equal(validateEnvelope(missing).reason, "schema_invalid");
});

test("admissible_exemption_boundary_kinds is validated (Freeze 5, security-critical)", () => {
  assert.equal(
    validateEnvelope({ ...goodEnvelope(), admissible_exemption_boundary_kinds: ["vibes"] }).reason,
    "schema_invalid"
  );
  assert.deepEqual(
    validateEnvelope({
      ...goodEnvelope(),
      admissible_exemption_boundary_kinds: ["tool_execution"],
    }),
    { ok: true }
  );
});

test("enum, digest-shape, and integer checks fail closed", () => {
  assert.equal(
    validateReceipt({ ...goodReceipt(), boundary_kind: "vibes" }).reason,
    "schema_invalid"
  );
  assert.equal(
    validateReceipt({ ...goodReceipt(), action_digest: "sha256:xyz" }).reason,
    "schema_invalid"
  );
  assert.equal(
    validateReceipt({ ...goodReceipt(), valid_from_epoch: "10" }).reason,
    "schema_invalid"
  );
  assert.equal(
    validateCrossing({ ...goodCrossing(), crossing_epoch: -1 }).reason,
    "schema_invalid"
  );
  assert.equal(
    validateChainEntry({
      schema: SCHEMAS.RUN_CHAIN_ENTRY,
      entry_kind: "crossing",
      entry_digest: D("3"),
      raw_code: 42,
      previous_entry_digest: D("4"),
      chain_position: 0,
    }).reason,
    "schema_invalid"
  );
});
