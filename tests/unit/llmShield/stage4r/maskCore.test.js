// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { DIGEST_RE } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import { ID, mul, G } from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";
import {
  SMALL_ORDER,
  classPoint,
  maskPoint,
  matchToken,
  pairId,
  pairIdHash,
  pairMatchCommitment,
  ephemeralPublicDigest,
} from "../../../../tools/simurgh-attestation/stage4r/core/maskCore.mjs";

const EPOCH = "sha256:4n-window-anchor-alpha";
const OTHER_EPOCH = "sha256:4n-window-anchor-beta";
const CLASS_X = "sha256:" + "a".repeat(64);
const CLASS_Y = "sha256:" + "b".repeat(64);
const A = 111111n;
const B = 222222n;

test("double-mask commutes end to end: match token equal iff same class/epoch/pair", () => {
  const pid = pairId(EPOCH, ["sha256:opA", "sha256:opB"]);
  const Hc = classPoint(EPOCH, CLASS_X);
  const mA = maskPoint(A, Hc);
  const mB = maskPoint(B, Hc);
  const zA = maskPoint(A, mB); // a·(b·Hc)
  const zB = maskPoint(B, mA); // b·(a·Hc)
  assert.equal(matchToken(EPOCH, pid, zA), matchToken(EPOCH, pid, zB));
});

test("different class ⇒ different tokens (non-match)", () => {
  const pid = pairId(EPOCH, ["sha256:opA", "sha256:opB"]);
  const Hcx = classPoint(EPOCH, CLASS_X);
  const Hcy = classPoint(EPOCH, CLASS_Y);
  const zXX = maskPoint(A, maskPoint(B, Hcx));
  const zXY = maskPoint(A, maskPoint(B, Hcy));
  assert.notEqual(matchToken(EPOCH, pid, zXX), matchToken(EPOCH, pid, zXY));
});

test("No Public Herd Token seed: same class different epoch ⇒ different point AND token", () => {
  const HcNow = classPoint(EPOCH, CLASS_X);
  const HcOther = classPoint(OTHER_EPOCH, CLASS_X);
  // class point itself is epoch-bound
  assert.notEqual(HcNow[0], HcOther[0]);
  const pidNow = pairId(EPOCH, ["sha256:opA", "sha256:opB"]);
  const pidOther = pairId(OTHER_EPOCH, ["sha256:opA", "sha256:opB"]);
  const zNow = maskPoint(A, maskPoint(B, HcNow));
  const zOther = maskPoint(A, maskPoint(B, HcOther));
  assert.notEqual(matchToken(EPOCH, pidNow, zNow), matchToken(OTHER_EPOCH, pidOther, zOther));
});

test("cross-pair same-epoch same-class ⇒ different token (spec §3.4)", () => {
  const Hc = classPoint(EPOCH, CLASS_X);
  const z = maskPoint(A, maskPoint(B, Hc));
  const pid1 = pairId(EPOCH, ["sha256:opA", "sha256:opB"]);
  const pid2 = pairId(EPOCH, ["sha256:opC", "sha256:opD"]);
  assert.notEqual(matchToken(EPOCH, pid1, z), matchToken(EPOCH, pid2, z));
});

test("pairId is order-independent over operator key digests", () => {
  assert.equal(
    pairId(EPOCH, ["sha256:opA", "sha256:opB"]),
    pairId(EPOCH, ["sha256:opB", "sha256:opA"])
  );
});

test("maskPoint fails closed on a small-order / identity input", () => {
  // The identity is small-order; masking it yields the identity → must throw.
  try {
    maskPoint(A, ID);
    assert.fail("expected SmallOrderError");
  } catch (err) {
    assert.equal(err.code, SMALL_ORDER);
  }
});

test("digest helpers return sha256 digests and bind their inputs", () => {
  const pid = pairId(EPOCH, ["sha256:opA", "sha256:opB"]);
  assert.match(pid, DIGEST_RE);
  assert.match(pairIdHash(pid), DIGEST_RE);
  const c1 = pairMatchCommitment(EPOCH, pid, true, "sha256:tx");
  const c2 = pairMatchCommitment(EPOCH, pid, false, "sha256:tx");
  assert.match(c1, DIGEST_RE);
  assert.notEqual(c1, c2); // match bool is bound
  const e1 = ephemeralPublicDigest(EPOCH, "a", A);
  const e2 = ephemeralPublicDigest(EPOCH, "b", A);
  assert.match(e1, DIGEST_RE);
  assert.notEqual(e1, e2); // role is bound
  assert.equal(ephemeralPublicDigest(EPOCH, "a", A), ephemeralPublicDigest(EPOCH, "a", A));
});
