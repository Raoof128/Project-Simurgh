import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, validCensus } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { checkCensus } from "../../../../tools/simurgh-attestation/stage5g/core/census.mjs";

test("valid census passes", () => {
  const b = validBundle({ rung: "challenge_bound" });
  const ctx = ctxFor({ tier: "audit", auditCensus: validCensus({ rung: "challenge_bound" }) });
  assert.equal(checkCensus(b, ctx), null);
});

test("missing census -> 297", () => {
  const b = validBundle({ rung: "challenge_bound" });
  assert.equal(checkCensus(b, ctxFor({ tier: "audit", auditCensus: null })), 297);
});

test("dropped terminal record -> 297", () => {
  const b = validBundle({ rung: "challenge_bound" });
  const census = validCensus({ rung: "challenge_bound" });
  census.terminal_records = [];
  assert.equal(checkCensus(b, ctxFor({ tier: "audit", auditCensus: census })), 297);
});
