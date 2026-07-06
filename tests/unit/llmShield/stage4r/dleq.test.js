// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  G,
  ID,
  mul,
  hashToPoint,
} from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";
import { dleqProve, dleqVerify } from "../../../../tools/simurgh-attestation/stage4r/core/dleq.mjs";

const EPOCH = "sha256:4n-anchor";
const RUN = "run-alpha";
const PAIR = "sha256:pair";
const a = 987654321n;
const b = 123456789n;
const Hc = hashToPoint("simurgh.pccc.class.v1", EPOCH, "class-x");

function maskProof() {
  // relation "mask": epk = a·G, target = a·Hc, base = Hc
  return dleqProve({
    scalar: a,
    basePoint: Hc,
    epk: mul(a, G),
    targetPoint: mul(a, Hc),
    relationKind: "mask",
    epoch: EPOCH,
    runId: RUN,
    pairId: PAIR,
    role: "a",
  });
}

test("honest mask-relation proof verifies", () => {
  const proof = maskProof();
  assert.ok(dleqVerify(proof, { basePoint: Hc, epk: mul(a, G), targetPoint: mul(a, Hc) }));
});

test("honest z-relation proof verifies", () => {
  const peerMask = mul(b, Hc);
  const proof = dleqProve({
    scalar: a,
    basePoint: peerMask,
    epk: mul(a, G),
    targetPoint: mul(a, peerMask),
    relationKind: "z",
    epoch: EPOCH,
    runId: RUN,
    pairId: PAIR,
    role: "a",
  });
  assert.ok(
    dleqVerify(proof, { basePoint: peerMask, epk: mul(a, G), targetPoint: mul(a, peerMask) })
  );
});

test("forged relation: target built with a different scalar is rejected", () => {
  const proof = maskProof();
  // verifier is handed a target = b·Hc, but proof witnesses scalar a
  assert.equal(
    dleqVerify(proof, { basePoint: Hc, epk: mul(a, G), targetPoint: mul(b, Hc) }),
    false
  );
});

test("tampered response s is rejected", () => {
  const proof = maskProof();
  const bad = { ...proof, s: "0".repeat(63) + "1" };
  assert.equal(dleqVerify(bad, { basePoint: Hc, epk: mul(a, G), targetPoint: mul(a, Hc) }), false);
});

test("proof is bound to role and epoch (Fiat-Shamir context)", () => {
  const proof = maskProof();
  const wrongRole = { ...proof, role: "b" };
  const wrongEpoch = { ...proof, epoch: "sha256:other" };
  const pts = { basePoint: Hc, epk: mul(a, G), targetPoint: mul(a, Hc) };
  assert.equal(dleqVerify(wrongRole, pts), false);
  assert.equal(dleqVerify(wrongEpoch, pts), false);
});

test("proof over a small-order target is rejected", () => {
  const proof = maskProof();
  assert.equal(dleqVerify(proof, { basePoint: Hc, epk: mul(a, G), targetPoint: ID }), false);
});

test("malformed proof fields never throw, always return false", () => {
  const pts = { basePoint: Hc, epk: mul(a, G), targetPoint: mul(a, Hc) };
  assert.equal(dleqVerify({ schema: "wrong" }, pts), false);
  assert.equal(dleqVerify({ ...maskProof(), R1: "zz" }, pts), false);
});
