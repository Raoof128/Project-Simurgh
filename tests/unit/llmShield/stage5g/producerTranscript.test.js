import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { checkProducerTranscript } from "../../../../tools/simurgh-attestation/stage5g/core/producerTranscript.mjs";

test("valid bundle passes attribution + signature", () => {
  assert.equal(checkProducerTranscript(validBundle()), null);
});

test("capture producer_identity_ref not matching identity digest → 286", () => {
  const b = validBundle();
  b.capture.producer_identity_ref = "sha256:" + "3".repeat(64);
  assert.equal(checkProducerTranscript(b), 286);
});

test("missing producer public key → 286", () => {
  const b = validBundle();
  delete b.producer_identity.public_key_pem;
  assert.equal(checkProducerTranscript(b), 286);
});

test("corrupt producer signature (attribution still consistent) → 287", () => {
  const b = validBundle();
  b.producer_transcript.producer_signature = Buffer.from("not a real signature").toString("base64");
  assert.equal(checkProducerTranscript(b), 287);
});
