// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.1 — the opaque Section6AcceptedContext capability.
//
// Section 7 accepts ONLY a context minted by the Section 6 acceptance path. Opacity is a module-
// private WeakSet: a raw object, a JSON round-trip, a spread copy, or a hand-built lookalike is not
// a member and is rejected. Fixtures obtain one only through mintSection6AcceptedContext (the seam
// the eventual Section 6 verifier calls), never by constructing the object directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeDigestToken } from "../../../../tools/simurgh-attestation/stage5o/core/digestTokenCodec.mjs";
import {
  mintSection6AcceptedContext,
  isSection6AcceptedContext,
} from "../../../../tools/simurgh-attestation/stage5o/core/section6AcceptedContext.mjs";

const tok = (fill) => encodeDigestToken(Buffer.alloc(32, fill));

function validFields() {
  return {
    challenge_subject_digest: tok(0x11),
    anchor_schedule_profile_digest: tok(0x22),
    network_profile_id: "simurgh.bitcoin.mainnet.header_validation.v1",
    precommitted_beacon_height: "850000",
    beacon_contract_digest: tok(0x33),
    challenge_policy_digest: tok(0x44),
    k: 128,
    universe_size: 65536,
    checkpoint: { network_profile_id: "simurgh.bitcoin.mainnet.header_validation.v1" },
  };
}

test("mint: a valid context is branded and frozen", () => {
  const ctx = mintSection6AcceptedContext(validFields());
  assert.equal(isSection6AcceptedContext(ctx), true);
  assert.equal(Object.isFrozen(ctx), true);
  assert.equal(ctx.k, 128);
});

test("opacity: a raw object with the same shape is NOT an accepted context", () => {
  assert.equal(isSection6AcceptedContext(validFields()), false);
});

test("opacity: a JSON round-trip of a real context loses the brand", () => {
  const ctx = mintSection6AcceptedContext(validFields());
  const copy = JSON.parse(JSON.stringify(ctx));
  assert.equal(isSection6AcceptedContext(copy), false);
});

test("opacity: a spread copy of a real context loses the brand", () => {
  const ctx = mintSection6AcceptedContext(validFields());
  assert.equal(isSection6AcceptedContext({ ...ctx }), false);
});

test("opacity: primitives and null are not accepted contexts", () => {
  for (const x of [null, undefined, 0, "x", true, []]) {
    assert.equal(isSection6AcceptedContext(x), false);
  }
});

test("mint: a malformed digest-token field is rejected at construction", () => {
  const bad = validFields();
  bad.challenge_subject_digest = "not-a-token";
  assert.throws(() => mintSection6AcceptedContext(bad));
});

test("mint: a non-positive or non-integer k is rejected", () => {
  for (const k of [0, -1, 1.5, "128", NaN]) {
    const bad = { ...validFields(), k };
    assert.throws(() => mintSection6AcceptedContext(bad), `k=${k} must reject`);
  }
});

test("mint: universe_size out of [1, 65536] or k>universe is rejected", () => {
  for (const u of [0, -1, 65537, 1.5]) {
    assert.throws(() => mintSection6AcceptedContext({ ...validFields(), universe_size: u }));
  }
  assert.throws(() => mintSection6AcceptedContext({ ...validFields(), k: 100, universe_size: 50 }));
});

test("mint: a wrong network profile id is rejected", () => {
  const bad = { ...validFields(), network_profile_id: "simurgh.bitcoin.testnet.v1" };
  assert.throws(() => mintSection6AcceptedContext(bad));
});

test("mint: a non-canonical beacon height is rejected", () => {
  for (const h of ["0850000", "", "-1", "8_5"]) {
    const bad = { ...validFields(), precommitted_beacon_height: h };
    assert.throws(() => mintSection6AcceptedContext(bad), `height=${h} must reject`);
  }
});

test("mint: a missing field is rejected (exact-key context)", () => {
  const bad = validFields();
  delete bad.checkpoint;
  assert.throws(() => mintSection6AcceptedContext(bad));
});
