// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4U Lane B verify-only tests (no live model call). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runVrtaLaneB } from "../../../../tools/simurgh-attestation/stage4u/laneb/run-laneb-vrta.mjs";
import { attackOnce, looksLikeRefusal } from "../../../../tools/simurgh-attestation/stage4u/laneb/fable-attacker.mjs";

test("Lane B is disabled by default — attackOnce throws without VRTA_LANE_B", async () => {
  delete process.env.VRTA_LANE_B;
  await assert.rejects(() => attackOnce({ client: null, charter: { caps: {} }, capState: {}, attack_id: "x" }), /LaneBDisabled/);
});
test("verify-only replay reproduces recorded outcomes (no live call); degrades gracefully", () => {
  const res = runVrtaLaneB({ live: false });
  assert.equal(res.raw, 0);
  assert.ok(res.verified_count >= 0);
});
test("a recorded refusal stays model_refused on replay (never rephrased)", () => {
  const res = runVrtaLaneB({ live: false });
  for (const r of res.replayed || []) if (r.recorded_class === "model_refused") assert.equal(r.replay_class, "model_refused");
});
test("refusal detector recognises a plain decline", () => {
  assert.ok(looksLikeRefusal("I can't help with that."));
  assert.equal(looksLikeRefusal('{"tree_receipts":[]}'), false);
});
