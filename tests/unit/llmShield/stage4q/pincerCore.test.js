// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../../../../tools/simurgh-attestation/stage4q/core/pincerCore.mjs";
import { buildChain } from "../../../../tools/simurgh-attestation/stage4q/core/chainCore.mjs";
import {
  approvalReceiptDigest,
  approvalExemptionDigest,
  crossingDigest,
} from "../../../../tools/simurgh-attestation/stage4q/core/digest.mjs";
import { goodEnvelope, goodReceipt, goodCrossing, goodExemption } from "./schemaCore.test.js";

const alwaysValid = () => true;
const green = () => {
  const envelope = goodEnvelope();
  const receipt = goodReceipt();
  const crossing = {
    ...goodCrossing(),
    approval_binding_kind: "receipt",
    approval_binding_digest: approvalReceiptDigest(receipt),
  };
  const { entries } = buildChain([
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(receipt), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: crossingDigest(crossing), raw_code: 0 },
  ]);
  return {
    envelope,
    receipt,
    exemption: null,
    crossing,
    chainEntries: entries,
    chainVerdict: { raw: 0 },
    verifySignature: alwaysValid,
    displayExpected: receipt.approval_display_digest,
  };
};

// Exemption-path scenario builder (Freeze 5). Policy admits the exemption unless overridden.
const exemptScenario = ({ admit = true } = {}) => {
  const s = green();
  const exemption = { ...goodExemption() };
  s.exemption = exemption;
  s.receipt = null;
  s.crossing = {
    ...s.crossing,
    approval_binding_kind: "exemption",
    approval_binding_digest: approvalExemptionDigest(exemption),
  };
  s.envelope = {
    ...s.envelope,
    admissible_exemption_boundary_kinds: admit ? [exemption.boundary_kind] : [],
  };
  s.chainEntries = buildChain([
    { entry_kind: "crossing", entry_digest: crossingDigest(s.crossing), raw_code: 0 },
  ]).entries;
  return s;
};

test("pincer-complete case is GREEN", () => {
  const out = decide(green());
  assert.equal(out.raw, 0);
  assert.equal(out.reason, "accepted");
});

test("80 masks 81: malformed envelope with bad signature surfaces as 80", () => {
  const s = green();
  s.envelope = { nope: true };
  s.verifySignature = () => false;
  assert.equal(decide(s).raw, 80);
});

test("83 masks 81: missing receipt with failing signatures surfaces as 83 (frozen order)", () => {
  const s = green();
  s.receipt = null;
  s.verifySignature = () => false;
  assert.equal(decide(s).raw, 83);
});

test("81 fails closed when no verifier is supplied", () => {
  const s = green();
  delete s.verifySignature;
  assert.equal(decide(s).raw, 81);
});

test("82: outside window vs straddle are distinct reasons (freeze 3 worked example)", () => {
  const outside = green();
  outside.crossing = { ...outside.crossing, crossing_epoch: 9 };
  assert.deepEqual(decide(outside), { raw: 82, reason: "run_epoch_outside_validity_window" });
  const straddle = green();
  straddle.receipt = { ...straddle.receipt, valid_from_epoch: 10, valid_until_epoch: 12 };
  straddle.crossing = { ...straddle.crossing, crossing_epoch: 12 }; // 12 - receipt_epoch 10 = 2 > 1
  straddle.crossing.approval_binding_digest = approvalReceiptDigest(straddle.receipt);
  assert.deepEqual(decide(straddle), { raw: 82, reason: "window_straddle_exceeded" });
});

test("89: chain verdict propagates before key/binding checks", () => {
  const s = green();
  s.chainVerdict = { raw: 89, reason: "census_mismatch" };
  s.verifySignature = alwaysValid;
  assert.deepEqual(decide(s), { raw: 89, reason: "census_mismatch" });
});

test("86: same-key approval is refused (two-key pincer)", () => {
  const s = green();
  s.receipt = { ...s.receipt, approver_public_key_digest: s.envelope.harness_public_key_digest };
  s.crossing = { ...s.crossing, approval_binding_digest: approvalReceiptDigest(s.receipt) };
  s.chainEntries = buildChain([
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(s.receipt), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: crossingDigest(s.crossing), raw_code: 0 },
  ]).entries;
  assert.deepEqual(decide(s), { raw: 86, reason: "approver_key_equals_harness_key" });
});

test("84: wrong bound digest (causal claw) → approval_binding_digest_mismatch", () => {
  const s = green();
  s.crossing = { ...s.crossing, approval_binding_digest: `sha256:${"9".repeat(64)}` };
  assert.deepEqual(decide(s), { raw: 84, reason: "approval_binding_digest_mismatch" });
});

test("85: receipt after crossing (chain claw)", () => {
  const s = green();
  s.chainEntries = buildChain([
    { entry_kind: "crossing", entry_digest: crossingDigest(s.crossing), raw_code: 0 },
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(s.receipt), raw_code: 0 },
  ]).entries;
  assert.deepEqual(decide(s), { raw: 85, reason: "approval_not_before_crossing" });
});

test("87: approver not declared in policy", () => {
  const s = green();
  s.envelope = { ...s.envelope, approver_public_key_digest: `sha256:${"8".repeat(64)}` };
  assert.deepEqual(decide(s), { raw: 87, reason: "approver_not_declared_in_policy" });
});

test("88: display mismatch (invention 6.3) and cross-run replay (spec §2.5)", () => {
  const display = green();
  display.displayExpected = `sha256:${"7".repeat(64)}`;
  assert.deepEqual(decide(display), { raw: 88, reason: "display_digest_mismatch" });
  const replay = green();
  replay.crossing = { ...replay.crossing, run_id_digest: `sha256:${"6".repeat(64)}` };
  replay.crossing.approval_binding_digest = approvalReceiptDigest(replay.receipt);
  // Rebuild the chain over the MUTATED crossing — otherwise the stale ledger fires
  // 85 chain_position_unrecomputable before the binding tier is ever reached.
  replay.chainEntries = buildChain([
    { entry_kind: "approval", entry_digest: approvalReceiptDigest(replay.receipt), raw_code: 0 },
    { entry_kind: "crossing", entry_digest: crossingDigest(replay.crossing), raw_code: 0 },
  ]).entries;
  assert.deepEqual(decide(replay), { raw: 88, reason: "run_id_mismatch" });
});

test("Freeze 5 exemption: policy-admitted no-approval crossing is GREEN accepted_exempt", () => {
  const out = decide(exemptScenario({ admit: true }));
  assert.equal(out.raw, 0);
  assert.equal(out.reason, "accepted_exempt");
});

test("Freeze 5 exemption: default policy (empty allowlist) refuses → 87", () => {
  assert.deepEqual(decide(exemptScenario({ admit: false })), {
    raw: 87,
    reason: "approval_exemption_not_permitted_by_policy",
  });
});

test("Freeze 5 exemption: unresolved exemption object → 84 approval_binding_unresolved", () => {
  const s = exemptScenario({ admit: true });
  s.exemption = null; // kind says exemption, but no object supplied
  assert.deepEqual(decide(s), { raw: 84, reason: "approval_binding_unresolved" });
});

test("Freeze 5 exemption: both a receipt AND an exemption present → 84 binding_kind_conflict", () => {
  const s = exemptScenario({ admit: true });
  s.receipt = goodReceipt();
  assert.deepEqual(decide(s), { raw: 84, reason: "binding_kind_conflict" });
});

test("Freeze 5 exemption: exemption not binding this crossing → 88", () => {
  const s = exemptScenario({ admit: true });
  const rebound = { ...s.exemption, action_digest: `sha256:${"5".repeat(64)}` };
  s.exemption = rebound;
  s.crossing = { ...s.crossing, approval_binding_digest: approvalExemptionDigest(rebound) };
  assert.deepEqual(decide(s), { raw: 88, reason: "friction_receipt_binding_mismatch" });
});
