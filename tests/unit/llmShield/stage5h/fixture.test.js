// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — fixture self-consistency: determinism, resign, distinct keys, honest expected tiers.
import test from "node:test";
import assert from "node:assert/strict";
import { validBundle, resign, claimDigest, aggregateMean } from "./_validBundle.mjs";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";
import { verifyContent } from "../../../../tools/simurgh-attestation/stage5h/core/signatures.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5h/constants.mjs";

test("aggregateMean is deterministic half-up decimal-string arithmetic", () => {
  assert.equal(aggregateMean(["0.94", "0.94", "0.94", "0.94", "0.94", "0.94"], 4), "0.9400");
  assert.equal(aggregateMean(["0.90", "0.90", "0.90", "0.90"], 4), "0.9000");
  // half-up edge: mean of 0.0000 and 0.0001 = 0.00005 → 0.0001
  assert.equal(aggregateMean(["0.0000", "0.0001"], 4), "0.0001");
});

test("bundle builds identically twice (byte-stable)", () => {
  const a = validBundle().bundle;
  const b = validBundle().bundle;
  assert.equal(canonicalJson(a), canonicalJson(b));
});

test("producer, host, verifier keys are all distinct", () => {
  const { keys } = validBundle();
  const fps = new Set([keys.producerKey.fp, keys.hostKey.fp, keys.verifierKey.fp]);
  assert.equal(fps.size, 3);
});

test("all three signatures verify on a fresh bundle", () => {
  const { bundle } = validBundle();
  const inv = bundle.claim_inventory;
  assert.equal(
    verifyContent(
      bundle.producer_identity,
      DOMAIN.claim_inventory,
      inv.content,
      inv.producer_signature
    ),
    true
  );
  const r = bundle.review_receipts[0];
  const hostId = {
    public_key_pem: bundle.review_receipts[0]._pem ?? null,
  };
  // host identity from registry (receipt does not carry PEM)
  const { hostRegistry } = validBundle();
  const hostReg = hostRegistry[0];
  assert.equal(
    verifyContent(
      { public_key_pem: hostReg.public_key_pem, key_fingerprint: hostReg.host_key_fingerprint },
      DOMAIN.review_receipt,
      r.content,
      r.host_signature
    ),
    true
  );
});

test("resign re-signs all three object types after a content mutation", () => {
  const fx = validBundle();
  const { bundle, keys } = fx;
  bundle.claim_inventory.content.claims[0].declared_tier = "public"; // tamper
  resign(bundle, keys);
  const inv = bundle.claim_inventory;
  assert.equal(
    verifyContent(
      bundle.producer_identity,
      DOMAIN.claim_inventory,
      inv.content,
      inv.producer_signature
    ),
    true
  );
});

test("expected verdict_table matches the honest fixture tiers", () => {
  const { bundle } = validBundle();
  const byId = Object.fromEntries(bundle.verdict_table.map((r) => [r.claim_id, r]));
  assert.equal(byId["frontier7b-cbrn-threshold"].proven_tier, "controlled");
  assert.equal(byId["frontier7b-harmbench-public"].proven_tier, "public");
  assert.equal(byId["frontier7b-monitoring-context"].proven_tier, "restricted");
  assert.ok(bundle.verdict_table.every((r) => r.inverted === false));
});

test("claimDigest is stable and the receipt links to the CBRN claim", () => {
  const { bundle } = validBundle();
  const cbrn = bundle.claim_inventory.content.claims[0];
  assert.equal(bundle.review_receipts[0].content.claim_digest, claimDigest(cbrn));
});
