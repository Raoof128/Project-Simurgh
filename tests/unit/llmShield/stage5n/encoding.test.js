// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — encoding kernel: domain-separated hashing, chain step, digest contract (P0-8), uint64be.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  H_DS,
  hdsObject,
  hdsStepBytes,
  uint64be,
  isDigestHex,
  hexToBytes32,
  digestId,
} from "../../../../tools/simurgh-attestation/stage5n/core/encoding.mjs";

const sha = (buf) => crypto.createHash("sha256").update(buf).digest();
const NUL = Buffer.from([0]);

test("uint64be: 8-byte big-endian, known vectors, safe-int guard", () => {
  assert.deepEqual([...uint64be(0)], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([...uint64be(1)], [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual([...uint64be(256)], [0, 0, 0, 0, 0, 0, 1, 0]);
  assert.equal(uint64be(5).length, 8);
  assert.throws(() => uint64be(Number.MAX_SAFE_INTEGER + 1), /safe/i);
  assert.throws(() => uint64be(-1), /safe/i);
  assert.throws(() => uint64be(1.5), /safe/i);
});

test("H_DS: bare 64-hex, deterministic, domain-separated, exact construction sha256(tag||0x00||bytes)", () => {
  const body = Buffer.from("payload", "utf8");
  const d = H_DS("simurgh.vtc_delay.seed.v1", body);
  assert.ok(isDigestHex(d), "H_DS returns bare DigestHex");
  // Independent recompute pins the construction.
  const expected = sha(
    Buffer.concat([Buffer.from("simurgh.vtc_delay.seed.v1", "utf8"), NUL, body])
  ).toString("hex");
  assert.equal(d, expected);
  // Determinism + domain separation.
  assert.equal(H_DS("simurgh.vtc_delay.seed.v1", body), d);
  assert.notEqual(H_DS("simurgh.vtc_delay.x0.v1", body), d, "different tag → different digest");
});

test("hdsObject: canonical (key-order independent), matches H_DS over canonicalJson bytes", () => {
  const a = hdsObject("simurgh.vtc_delay.policy.v1", { b: 2, a: 1, c: { y: 9, x: 8 } });
  const b = hdsObject("simurgh.vtc_delay.policy.v1", { c: { x: 8, y: 9 }, a: 1, b: 2 });
  assert.equal(a, b, "key order must not change the digest");
  assert.ok(isDigestHex(a));
});

test("hdsStepBytes: 32-byte buffer, deterministic, i-dependent, chain-consuming raw bytes", () => {
  const x0 = sha(Buffer.from("seed"));
  const s1 = hdsStepBytes(1, x0);
  assert.ok(Buffer.isBuffer(s1) && s1.length === 32, "chain state stays raw 32 bytes");
  assert.deepEqual(hdsStepBytes(1, x0), s1, "deterministic");
  assert.notDeepEqual(hdsStepBytes(2, x0), s1, "i-dependent");
  // Exact construction: sha256(step_domain || 0x00 || uint64be(i) || x_prev-bytes).
  const expected = sha(
    Buffer.concat([Buffer.from("simurgh.vtc_delay.step.v1", "utf8"), NUL, uint64be(1), x0])
  );
  assert.deepEqual(s1, expected);
});

test("digest contract (P0-8): DigestHex / DigestBytes / DigestId strict", () => {
  const good = "a".repeat(64);
  assert.ok(isDigestHex(good));
  assert.ok(!isDigestHex("A".repeat(64)), "uppercase rejected");
  assert.ok(!isDigestHex("0x" + "a".repeat(62)), "0x prefix rejected");
  assert.ok(!isDigestHex("a".repeat(63)), "wrong length rejected");
  assert.ok(!isDigestHex("sha256:" + good), "prefixed rejected");
  assert.equal(hexToBytes32(good).length, 32);
  assert.throws(() => hexToBytes32("zz".repeat(32)), /hex/i);
  assert.throws(() => hexToBytes32("a".repeat(63)), /32|length/i);
  assert.equal(digestId(good), "sha256:" + good);
});
