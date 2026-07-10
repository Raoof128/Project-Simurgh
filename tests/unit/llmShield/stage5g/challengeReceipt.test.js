import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { checkChallengeReceipt } from "../../../../tools/simurgh-attestation/stage5g/core/challengeReceipt.mjs";

test("valid challenge_bound receipt passes", () => {
  assert.equal(checkChallengeReceipt(validBundle({ rung: "challenge_bound" })), null);
});

test("distinct_key_only (no receipt) passes here (presence-driven)", () => {
  assert.equal(checkChallengeReceipt(validBundle({ rung: "distinct_key_only" })), null);
});

test("tampered receipt content → 285", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.challenge_receipt.content.challenge_id = "tampered"; // digest + sig now stale
  assert.equal(checkChallengeReceipt(b), 285);
});

test("receipt verifier_identity_digest not matching top-level identity → 285", () => {
  const b = validBundle({ rung: "challenge_bound" });
  b.challenge_receipt.content.verifier_identity_digest = "sha256:" + "2".repeat(64);
  assert.equal(checkChallengeReceipt(b), 285);
});
