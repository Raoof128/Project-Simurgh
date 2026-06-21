// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { normaliseRefusal, isRefusal } from "../../../../src/llmShield/gateway/anthropicResponseNormalise.js";

test("isRefusal branches on stop_reason only", () => {
  assert.equal(isRefusal({ stop_reason: "refusal" }), true);
  assert.equal(isRefusal({ stop_reason: "end_turn", stop_details: { type: "refusal" } }), false);
  assert.equal(isRefusal({}), false);
});

test("normaliseRefusal captures category, hashes explanation, never stores raw", () => {
  const r = normaliseRefusal({
    stop_reason: "refusal",
    stop_details: { type: "refusal", category: "cyber", explanation: "declined because cyber harm" },
  });
  assert.equal(r.stop_reason, "refusal");
  assert.equal(r.stop_details_present, true);
  assert.equal(r.stop_details_type, "refusal");
  assert.equal(r.refusal_category, "cyber");
  assert.equal(r.refusal_explanation_recorded, false);
  assert.match(r.refusal_explanation_hash, /^sha256:/);
  // raw explanation text must not appear anywhere in the serialized metadata
  assert.equal(JSON.stringify(r).includes("declined because"), false);
});

test("normaliseRefusal is null-safe (category/explanation/stop_details may be null)", () => {
  const r = normaliseRefusal({ stop_reason: "refusal", stop_details: null });
  assert.equal(r.stop_details_present, false);
  assert.equal(r.refusal_category, null);
  assert.equal(r.refusal_explanation_hash, null);
  const r2 = normaliseRefusal({ stop_reason: "refusal", stop_details: { type: "refusal", category: null, explanation: null } });
  assert.equal(r2.refusal_category, null);
  assert.equal(r2.refusal_explanation_hash, null);
});
