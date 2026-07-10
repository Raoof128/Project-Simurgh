import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { checkChallengeBinding } from "../../../../tools/simurgh-attestation/stage5g/core/challengeBinding.mjs";

test("valid challenge_bound binding passes", () => {
  assert.equal(checkChallengeBinding(validBundle({ rung: "challenge_bound" }), ctxFor()), null);
});

test("no binding (rung-0) is not this check's concern → null", () => {
  assert.equal(checkChallengeBinding(validBundle({ rung: "distinct_key_only" }), ctxFor()), null);
});

test("binding present but a committed field stripped → 290", () => {
  const b = validBundle({ rung: "challenge_bound" });
  delete b.challenge_receipt.content.corpus_digest;
  assert.equal(checkChallengeBinding(b, ctxFor()), 290);
});

test("binding present but no receipt → 290", () => {
  const b = validBundle({ rung: "challenge_bound" });
  delete b.challenge_receipt;
  assert.equal(checkChallengeBinding(b, ctxFor()), 290);
});

test("committed artifact mutated in ctx.artifacts → 291", () => {
  const b = validBundle({ rung: "challenge_bound" });
  const ctx = ctxFor();
  ctx.artifacts.corpus = { schema: "simurgh.vfc.corpus.v1", cases: [] }; // different bytes
  assert.equal(checkChallengeBinding(b, ctx), 291);
});
