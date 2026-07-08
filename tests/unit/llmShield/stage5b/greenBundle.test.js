// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — green bundle + 5A target driver (plan Task 9). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateVar } from "../../../../tools/simurgh-attestation/stage5b/core/varCore.mjs";
import {
  loadRealCapture,
  makeGreenVarBundle,
  driveTarget5A,
} from "../../../../tools/simurgh-attestation/stage5b/node/greenBundle.mjs";

test("the green VAR bundle is grounded on the REAL Llama-3.2-1B capture and evaluates GREEN", () => {
  const bundle = makeGreenVarBundle();
  // grounded on the real capture (captured outcome, real model)
  assert.equal(bundle.capture_binding.ceremony.outcome, "captured");
  assert.equal(bundle.capture_binding.ceremony.model_id, "meta-llama/Llama-3.2-1B-Instruct");
  assert.equal(evaluateVar(bundle, { tier: "public" }).raw, 0);
  assert.equal(evaluateVar(bundle, { tier: "audit" }).raw, 0);
});

test("the real capture reconciles inside the assembled bundle (No Author's Map, live)", () => {
  const { frozen } = loadRealCapture();
  assert.equal(Object.keys(frozen.tensors_b64).length, 18);
  const bundle = makeGreenVarBundle();
  // the assembled bundle carries the real capture's tensors (structural, not reference)
  assert.deepEqual(Object.keys(bundle.frozen_capture.tensors_b64), Object.keys(frozen.tensors_b64));
});

test("5A driver: a clean bundle is GREEN at the frozen 5A verifier", () => {
  assert.equal(driveTarget5A("none"), 0);
});

test("5A driver: conflict_laundering trips the REAL 5A verdict-recompute code 205", () => {
  // The headline capture-grounded attack: laundering a contradiction to corroborated is caught
  // by 5A's own frozen verifier at raw 205 — discovered, not asserted a priori.
  assert.equal(driveTarget5A("launder"), 205);
});

test("5A driver: a signature tamper is caught by the frozen 5A verifier (non-zero)", () => {
  const raw = driveTarget5A("signature");
  assert.notEqual(raw, 0);
});
