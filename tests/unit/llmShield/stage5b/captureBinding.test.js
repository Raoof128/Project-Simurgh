// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — captureBinding / No Author's Map (plan Task 4). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tensorCommitment,
  tensorCommitmentRoot,
} from "../../../../tools/simurgh-attestation/stage5b/lanec/ceremonyCore.mjs";
import {
  frozenCaptureRoot,
  checkNoAuthorsMap,
  checkCaptureCeremony,
} from "../../../../tools/simurgh-attestation/stage5b/core/captureBinding.mjs";

const DECL = "sha256:" + "a".repeat(64);

// A synthetic frozen_capture in the SHAPE the real harness emits (drop-in for frozen_capture.json).
function syntheticFrozenCapture() {
  const tensors_b64 = {
    "act:p0:0:5": Buffer.from([1, 2, 3, 4]).toString("base64"),
    "lens:5:271": Buffer.from([9, 8, 7, 6]).toString("base64"),
  };
  const salts = { "act:p0:0:5": "s0", "lens:5:271": "s1" };
  const commitments = {};
  for (const k of Object.keys(tensors_b64))
    commitments[k] = tensorCommitment(salts[k], tensors_b64[k]);
  return {
    declaration_digest: DECL,
    commitments,
    salts,
    tensors_b64,
    prompt_token_counts: { p0: 6 },
  };
}

function bindingFor(fc, overrides = {}) {
  return {
    schema: "simurgh.var.capture_binding.v1",
    ceremony: {
      outcome: "captured",
      timestamp: "2026-07-08T00:00:00Z",
      model_id: "meta-llama/Llama-3.2-1B-Instruct",
      revision_digest: "sha256:rev",
      lens_digest: "sha256:lens",
      position_rule_id: "all_positions",
      declaration_digest: DECL,
    },
    tensor_commitment_root: frozenCaptureRoot(fc),
    capture_key_digest: "sha256:" + "c".repeat(64),
    declaration_digest: DECL,
    ...overrides,
  };
}

const charter = { capture_declaration_digest: DECL };

test("214: a clean precommitted readout reconciles (No Author's Map passes)", () => {
  const fc = syntheticFrozenCapture();
  assert.equal(checkNoAuthorsMap(bindingFor(fc), fc).raw, 0);
});

test("214: swapping the tensors so they don't reconcile to the root is caught", () => {
  const fc = syntheticFrozenCapture();
  const binding = bindingFor(fc);
  const tampered = {
    ...fc,
    tensors_b64: { ...fc.tensors_b64, "act:p0:0:5": Buffer.from([9, 9, 9, 9]).toString("base64") },
  };
  assert.equal(checkNoAuthorsMap(binding, tampered).raw, 214);
});

test("HONEST BOUND: a different capture_key_digest still PASSES (key identity is NOT the check)", () => {
  const fc = syntheticFrozenCapture();
  const binding = bindingFor(fc, { capture_key_digest: "sha256:" + "f".repeat(64) });
  // Reconciliation is over the tensors, not the key — proves precommitted-readout, not
  // third-party independence (spec §1 P0-1).
  assert.equal(checkNoAuthorsMap(binding, fc).raw, 0);
});

test("215: a binding whose declaration != the charter's precommit is rejected", () => {
  const fc = syntheticFrozenCapture();
  const binding = bindingFor(fc, { declaration_digest: "sha256:" + "b".repeat(64) });
  assert.equal(checkCaptureCeremony(binding, charter).raw, 215);
});

test("215: a malformed ceremony (non-total position rule) is rejected", () => {
  const fc = syntheticFrozenCapture();
  const binding = bindingFor(fc);
  binding.ceremony.position_rule_id = "last_token";
  assert.equal(checkCaptureCeremony(binding, charter).raw, 215);
});

test("215: a clean binding bound to the charter's declaration passes", () => {
  const fc = syntheticFrozenCapture();
  assert.equal(checkCaptureCeremony(bindingFor(fc), charter).raw, 0);
});
