import test from "node:test";
import assert from "node:assert/strict";
import {
  honorSystemSelfGraded,
  notifiedBodyUnanchored,
  validBundle,
  validCensus,
} from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { sigstoreKernelRunner } from "../../../../tools/simurgh-attestation/stage5g/node/sigstoreKernelRunner.mjs";
import { evaluateForeignCapture } from "../../../../tools/simurgh-attestation/stage5g/core/vfcCore.mjs";

// The name IS the positioning: self-grading failures drawn from the record, made impossible to hide.
test("honor_system_self_graded → 289 (producer key == verifier key)", () => {
  assert.equal(evaluateForeignCapture(honorSystemSelfGraded(), ctxFor()).raw, 289);
});

test("notified_body_unanchored → 296 (claims rung-2, ships no anchor)", () => {
  assert.equal(evaluateForeignCapture(notifiedBodyUnanchored(), ctxFor()).raw, 296);
});

test("retained_auditor → valid externally_anchored; rung-2 proves the ANCHOR, not non-collusion", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = ctxFor({ tier: "audit", auditCensus: validCensus({ rung: "externally_anchored" }) });
  ctx.kernelResult = sigstoreKernelRunner(b.anchor_evidence);
  const r = evaluateForeignCapture(b, ctx);
  assert.equal(r.raw, 0);
  assert.equal(r.proven_rung, "externally_anchored");
  // Signed non-claim: an externally-anchored producer may still be organisationally affiliated —
  // VFC reports the anchored subject, never "independent".
});
