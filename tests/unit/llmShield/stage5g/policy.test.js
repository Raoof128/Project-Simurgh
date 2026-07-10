import test from "node:test";
import assert from "node:assert/strict";
import { ctxFor } from "./_ctx.mjs";
import { checkPolicy } from "../../../../tools/simurgh-attestation/stage5g/core/policy.mjs";

test("proven >= min passes", () => {
  assert.equal(checkPolicy("challenge_bound", ctxFor({ minRung: "challenge_bound" })), null);
});
test("proven < min -> 298", () => {
  assert.equal(checkPolicy("distinct_key_only", ctxFor({ minRung: "challenge_bound" })), 298);
});
test("attestation-only bypasses policy", () => {
  assert.equal(checkPolicy("distinct_key_only", ctxFor({ attestationOnly: true })), null);
});
