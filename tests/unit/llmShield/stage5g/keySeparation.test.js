import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { checkKeySeparation } from "../../../../tools/simurgh-attestation/stage5g/core/keySeparation.mjs";

test("distinct producer/verifier keys pass", () => {
  assert.equal(checkKeySeparation(validBundle()), null);
});

test("producer key == verifier key → 289 (honor_system_self_graded)", () => {
  const b = validBundle();
  b.producer_identity.public_key_pem = b.verifier_identity.public_key_pem;
  b.producer_identity.key_fingerprint = b.verifier_identity.key_fingerprint;
  assert.equal(checkKeySeparation(b), 289);
});
