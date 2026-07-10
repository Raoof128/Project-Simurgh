import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { checkSchema } from "../../../../tools/simurgh-attestation/stage5g/core/schema.mjs";

test("valid bundle passes schema", () => {
  assert.equal(checkSchema(validBundle()), null);
});

test("missing capture cells → 283", () => {
  const b = validBundle();
  b.capture.cells = [];
  assert.equal(checkSchema(b), 283);
});

test("embedded trusted-root field anywhere → 283", () => {
  const b = validBundle();
  b.trusted_root = { fulcio: "x" };
  assert.equal(checkSchema(b), 283);
});

test("anchor_evidence_digest present without anchor_evidence → 283", () => {
  const b = validBundle();
  b.producer_transcript.content.anchor_evidence_digest = "sha256:" + "1".repeat(64);
  assert.equal(checkSchema(b), 283);
});

test("unknown top-level key → 283", () => {
  const b = validBundle();
  b.surprise = 1;
  assert.equal(checkSchema(b), 283);
});
