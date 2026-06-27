// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";
import {
  buildReceipt,
  signReceiptPayload,
  validateReceiptPayload,
  verifyReceipt,
} from "../../../../tools/simurgh-attestation/stage4d/receipt.mjs";
import { createStage4dSigner } from "../../../../tools/simurgh-attestation/stage4d/signer.mjs";

const payload = {
  receipt_version: "simurgh.receipt.v1",
  run_id: "stage4d-browser-inject-01",
  parent_session: "session_stage4d_browser_inject_01",
  action_id: "act_000",
  step_index: 0,
  observation_event_hash: "0".repeat(64),
  action_type: "tool_call",
  sink_id: "egress",
  consequence_class: "external_egress",
  boundary_id: "gateway_mediator_v1",
  input_integrity_summary: "trusted_only",
  decision: "allow",
  decision_reason_code: "POLICY_ALLOWED",
  decision_input: {
    policy_version: "policy.v1",
    policy_hash: "1".repeat(64),
    sink_registry_version: "sinks.v1",
    sink_registry_hash: "2".repeat(64),
    consequence_lattice_hash: "3".repeat(64),
    resolved_args_digest: "4".repeat(64),
    policy_features_digest: "5".repeat(64),
    taint_labels_digest: "6".repeat(64),
    context_digest: "7".repeat(64),
    untrusted_reached_authority: false,
    policy_mode: "balanced",
  },
  model_identity_committed: "self-reported-fixture-model",
  model_identity_origin: "self_reported",
  prev_receipt_hash: "0".repeat(64),
};

test("validateReceiptPayload accepts the full Stage 4D shape", () => {
  assert.equal(validateReceiptPayload(payload).ok, true);
});

test("buildReceipt signs and verifies with the receipt domain", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const signature = signReceiptPayload(payload, privateKey);
  const receipt = buildReceipt(payload, signature);
  assert.equal(verifyReceipt(receipt, publicKey).ok, true);
  receipt.receipt_payload.decision = "block";
  assert.equal(verifyReceipt(receipt, publicKey).ok, false);
});

test("stage4d signer rejects arbitrary payload types", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const signer = createStage4dSigner({ privateKey, runId: "stage4d-browser-inject-01" });
  assert.throws(
    () => signer.signReceipt({ payload_type: "arbitrary", run_id: "stage4d-browser-inject-01" }),
    /schema_invalid/
  );
});

test("stage4d signer rejects wrong run id before signing", () => {
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const signer = createStage4dSigner({ privateKey, runId: "stage4d-browser-inject-01" });
  assert.throws(() => signer.signReceipt({ ...payload, run_id: "wrong-run" }), /run_id_mismatch/);
});
