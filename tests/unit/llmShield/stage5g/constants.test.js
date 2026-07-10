import test from "node:test";
import assert from "node:assert/strict";
import {
  RUNG,
  rungGte,
  ANCHOR_TYPES,
  DOMAIN,
  VFC_SCHEMAS,
  CAMPAIGN_STATUS,
  DEFAULT_MIN_RUNG,
  VFC_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5g/constants.mjs";

test("rung ladder is the three ordered separation strengths", () => {
  assert.deepEqual(RUNG.order, ["distinct_key_only", "challenge_bound", "externally_anchored"]);
  assert.equal(RUNG.index("challenge_bound"), 1);
});

test("rungGte is ordinal and monotone", () => {
  assert.equal(rungGte("externally_anchored", "challenge_bound"), true);
  assert.equal(rungGte("challenge_bound", "challenge_bound"), true);
  assert.equal(rungGte("distinct_key_only", "challenge_bound"), false);
  assert.throws(() => rungGte("nope", "challenge_bound"));
});

test("anchor types are exactly none + sigstore_oidc (DNS is a later socket)", () => {
  assert.deepEqual(ANCHOR_TYPES, ["none", "sigstore_oidc"]);
});

test("domain separators are trailing-newline prefixed and cover both identities", () => {
  assert.equal(DOMAIN.challenge_receipt, "simurgh.vfc.challenge_receipt.v1\n");
  assert.equal(DOMAIN.verifier_identity, "simurgh.vfc.verifier_identity.v1\n");
  assert.equal(DOMAIN.producer_identity, "simurgh.vfc.producer_identity.v1\n");
  assert.equal(DOMAIN.capture_census, "simurgh.vfc.capture_census.v1\n");
});

test("schemas, campaign statuses, default policy and sockets are frozen", () => {
  assert.equal(VFC_SCHEMAS.foreign_capture, "simurgh.vfc.foreign_capture.v1");
  assert.deepEqual(CAMPAIGN_STATUS, ["completed", "declined", "no_show", "environment_failed"]);
  assert.equal(DEFAULT_MIN_RUNG, "challenge_bound");
  assert.ok(VFC_RESERVED_SLOTS.includes("overt_vfc_crosswalk_deferred"));
  assert.ok(Object.isFrozen(VFC_RESERVED_SLOTS));
});
