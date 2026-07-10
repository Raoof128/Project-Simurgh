import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { sigstoreKernelRunner } from "../../../../tools/simurgh-attestation/stage5g/node/sigstoreKernelRunner.mjs";
import { checkSubjectSeparation } from "../../../../tools/simurgh-attestation/stage5g/core/subjectSeparation.mjs";
import { checkAnchorBinding } from "../../../../tools/simurgh-attestation/stage5g/core/anchorBinding.mjs";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5g/core/schema.mjs";
import { checkProducerTranscript } from "../../../../tools/simurgh-attestation/stage5g/core/producerTranscript.mjs";
import { checkCaptureDigest } from "../../../../tools/simurgh-attestation/stage5g/core/captureDigest.mjs";

function anchoredCtx(b, overrides = {}) {
  const ctx = ctxFor(overrides);
  ctx.kernelResult = sigstoreKernelRunner(b.anchor_evidence);
  return ctx;
}

test("rung-2 valid bundle passes schema/attribution/capture-digest (well-formed fixture)", () => {
  const b = validBundle({ rung: "externally_anchored" });
  assert.equal(checkSchema(b), null);
  assert.equal(checkProducerTranscript(b), null);
  assert.equal(checkCaptureDigest(b), null);
});

test("kernel validates the offline sigstore evidence", () => {
  const b = validBundle({ rung: "externally_anchored" });
  assert.equal(sigstoreKernelRunner(b.anchor_evidence).valid, true);
});

test("valid rung-2 passes subject separation + anchor binding", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b);
  assert.equal(checkSubjectSeparation(b, ctx), null);
  assert.equal(checkAnchorBinding(b, ctx), null);
});

test("producer subject == verifier subject → 292", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b);
  ctx.kernelResult.subject = ctx.verifierPin.verifier_identity_subject;
  assert.equal(checkSubjectSeparation(b, ctx), 292);
});

test("empty trust config → 293", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b, { trustRootAllowlist: [] });
  assert.equal(checkAnchorBinding(b, ctx), 293);
});

test("kernel root not allowlisted → 293", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b, { trustRootAllowlist: ["sha256:" + "b".repeat(64)] });
  assert.equal(checkAnchorBinding(b, ctx), 293);
});

test("kernel rejects tampered integrated time → 294", () => {
  const b = validBundle({ rung: "externally_anchored" });
  b.anchor_evidence.sigstore_bundle.integrated_time = 999;
  const ctx = anchoredCtx(b);
  assert.equal(checkAnchorBinding(b, ctx), 294);
});

test("DSSE does not cross-bind the bundle producer key → 295", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b);
  b.producer_identity.key_fingerprint = "sha256:" + "c".repeat(64);
  assert.equal(checkAnchorBinding(b, ctx), 295);
});

test("anchor_evidence digest not matching transcript → 295", () => {
  const b = validBundle({ rung: "externally_anchored" });
  const ctx = anchoredCtx(b);
  b.producer_transcript.content.anchor_evidence_digest = "sha256:" + "d".repeat(64);
  assert.equal(checkAnchorBinding(b, ctx), 295);
});
