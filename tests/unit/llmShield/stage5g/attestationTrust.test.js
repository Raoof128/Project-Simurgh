import test from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { ctxFor } from "./_ctx.mjs";
import { checkAttestationTrust } from "../../../../tools/simurgh-attestation/stage5g/core/attestationTrust.mjs";

test("valid bundle + correct external pin passes", () => {
  const ctx = ctxFor();
  assert.equal(checkAttestationTrust(validBundle(), ctx), null);
});

test("missing pin → 284 external_pin_missing", () => {
  const ctx = ctxFor({ verifierPin: null });
  assert.equal(checkAttestationTrust(validBundle(), ctx), 284);
  assert.equal(ctx.diag.trust_reason, "external_pin_missing");
});

test("wrong pinned fingerprint → 284 external_pin_mismatch", () => {
  const ctx = ctxFor();
  ctx.verifierPin.verifier_key_fingerprint = "sha256:" + "0".repeat(64);
  assert.equal(checkAttestationTrust(validBundle(), ctx), 284);
  assert.equal(ctx.diag.trust_reason, "external_pin_mismatch");
});

test("tampered attestation content (no resign) → 284 attestation_signature_invalid", () => {
  const ctx = ctxFor();
  const b = validBundle();
  b.separation_claim.claimed_rung = "externally_anchored"; // mutate, do NOT resign
  assert.equal(checkAttestationTrust(b, ctx), 284);
  assert.equal(ctx.diag.trust_reason, "attestation_signature_invalid");
});
