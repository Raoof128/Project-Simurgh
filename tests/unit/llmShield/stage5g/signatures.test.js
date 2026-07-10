import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  fingerprint,
  signContent,
  verifyContent,
} from "../../../../tools/simurgh-attestation/stage5g/core/signatures.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5g/constants.mjs";

const KEYS = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../fixtures/llmShield/stage5g/test-keys"
);
const producerPriv = readFileSync(
  join(KEYS, "INSECURE_FIXTURE_ONLY_stage-vfc-producer.pem"),
  "utf8"
);
const producerPubPem = createPublicKey(createPrivateKey(producerPriv))
  .export({ type: "spki", format: "pem" })
  .toString();

function producerIdentity() {
  return {
    identity_subject: "fixture-producer",
    public_key_pem: producerPubPem,
    key_fingerprint: fingerprint(producerPubPem),
    anchor_type: "none",
    anchor_subject: "",
  };
}

test("sign then verify round-trips over domain-separated content", () => {
  const content = { challenge_record_digest: "sha256:aa", capture_digest: "sha256:bb" };
  const sig = signContent(producerPriv, DOMAIN.producer_transcript, content);
  assert.equal(verifyContent(producerIdentity(), DOMAIN.producer_transcript, content, sig), true);
});

test("fingerprint is SPKI-DER robust to PEM re-wrapping / line endings", () => {
  const rewrapped = producerPubPem.replace(/\n/g, "\r\n");
  assert.equal(fingerprint(rewrapped), fingerprint(producerPubPem));
});

test("a fingerprint that disagrees with the PEM throws (no silent accept)", () => {
  const id = producerIdentity();
  id.key_fingerprint = "sha256:" + "0".repeat(64);
  const content = { x: 1 };
  const sig = signContent(producerPriv, DOMAIN.producer_transcript, content);
  assert.throws(() => verifyContent(id, DOMAIN.producer_transcript, content, sig));
});

test("tampered content fails verification", () => {
  const content = { x: 1 };
  const sig = signContent(producerPriv, DOMAIN.producer_transcript, content);
  assert.equal(verifyContent(producerIdentity(), DOMAIN.producer_transcript, { x: 2 }, sig), false);
});

test("wrong domain separator fails verification (cross-object substitution guard)", () => {
  const content = { x: 1 };
  const sig = signContent(producerPriv, DOMAIN.producer_transcript, content);
  assert.equal(verifyContent(producerIdentity(), DOMAIN.foreign_capture, content, sig), false);
});
