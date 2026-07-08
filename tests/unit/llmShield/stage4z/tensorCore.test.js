// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA tensorCore (plan Task 3). Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  decodeF32LE,
  dotF64,
  roundHalfEven,
  scoreNano,
  cmpNano,
  tensorCommitment,
  commitmentTable,
} from "../../../../tools/simurgh-attestation/stage4z/core/tensorCore.mjs";

// A hand-built f32-LE buffer of eight exactly-representable values.
function f32buf(values) {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
}

test("decodeF32LE round-trips exact f32 values", () => {
  const vals = [0, 1, -1, 0.5, -0.25, 2, 100, -0.125];
  assert.deepEqual(decodeF32LE(f32buf(vals)), vals);
});

test("decodeF32LE rejects bad length and non-finite values", () => {
  assert.throws(() => decodeF32LE(Buffer.alloc(6)), /f32_length_not_multiple_of_4/);
  const nan = Buffer.alloc(4);
  nan.writeUInt32LE(0x7fc00000, 0); // quiet NaN
  assert.throws(() => decodeF32LE(nan), /non_finite_tensor/);
  const inf = Buffer.alloc(4);
  inf.writeUInt32LE(0x7f800000, 0); // +Inf
  assert.throws(() => decodeF32LE(inf), /non_finite_tensor/);
});

test("dotF64 is fixed ascending order and length-checked", () => {
  assert.equal(dotF64([1, 2, 3], [4, 5, 6]), 32);
  assert.throws(() => dotF64([1], [1, 2]), /dot_length_mismatch/);
});

test("roundHalfEven is banker's rounding on the tie vectors", () => {
  const got = [0.5, 1.5, 2.5, -0.5, -1.5, 2.4999999999].map(roundHalfEven);
  assert.deepEqual(got, [0, 2, 2, 0, -2, 2]);
});

test("scoreNano is a decimal STRING, finite + safe-range guarded", () => {
  assert.equal(scoreNano(0), "0");
  assert.equal(scoreNano(1), "1000000000");
  assert.equal(scoreNano(-1.5), "-1500000000");
  assert.match(scoreNano(12.3456789), /^-?\d+$/);
  assert.throws(() => scoreNano(Infinity), /non_finite_score/);
  assert.throws(() => scoreNano(NaN), /non_finite_score/);
  // 1e7 * 1e9 = 1e16 > 2^53 → out of the exactly-representable regime.
  assert.throws(() => scoreNano(1e7), /score_nano_out_of_range/);
});

test("cmpNano compares by BigInt magnitude, never lexically", () => {
  assert.equal(cmpNano("9", "10"), -1); // lexical would give +1
  assert.equal(cmpNano("10", "9"), 1);
  assert.equal(cmpNano("-5", "-5"), 0);
  assert.equal(cmpNano("100", "-100"), 1);
});

test("tensorCommitment = sha256(salt‖bytes), salt-sensitive", () => {
  const bytes = f32buf([1, 2]);
  const c1 = tensorCommitment("saltA", bytes);
  const c2 = tensorCommitment("saltB", bytes);
  assert.match(c1, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(c1, c2);
  assert.equal(tensorCommitment("saltA", bytes), c1); // deterministic
});

test("commitmentTable indexes by composite key and rejects collisions", () => {
  const t = commitmentTable([
    { key: [0, 2, 5], commitment: "sha256:aa" },
    { key: [1, 3], commitment: "sha256:bb" },
  ]);
  assert.equal(t["0:2:5"], "sha256:aa");
  assert.equal(t["1:3"], "sha256:bb");
  assert.throws(
    () =>
      commitmentTable([
        { key: [0], commitment: "sha256:aa" },
        { key: [0], commitment: "sha256:bb" },
      ]),
    /commitment_key_collision/
  );
});
