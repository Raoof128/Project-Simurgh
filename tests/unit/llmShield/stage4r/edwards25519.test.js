// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  P,
  L,
  G,
  ID,
  add,
  mul,
  eq,
  onCurve,
  isSmallOrder,
  encodePoint,
  decodePoint,
  randomScalar,
  scalarToHex,
  scalarFromHex,
  hashToPoint,
} from "../../../../tools/simurgh-attestation/stage4r/core/edwards25519.mjs";

test("basepoint is on curve and has prime order L", () => {
  assert.ok(onCurve(G));
  assert.ok(eq(mul(L, G), ID));
  assert.ok(!isSmallOrder(G));
});

test("RFC 8032 vector: encodePoint(G) is the canonical basepoint encoding", () => {
  assert.equal(encodePoint(G), "5866666666666666666666666666666666666666666666666666666666666666");
});

test("RFC 8032 key derivation cross-checks against Node core Ed25519", () => {
  // Node generates a real Ed25519 keypair; we re-derive the public key with the
  // reference group exactly as RFC 8032 specifies (clamped SHA-512(seed) · B)
  // and assert byte-equality with Node's exported raw public key.
  for (let i = 0; i < 8; i++) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    const spki = publicKey.export({ type: "spki", format: "der" });
    const nodePk = spki.subarray(spki.length - 32).toString("hex");
    const pkcs8 = privateKey.export({ type: "pkcs8", format: "der" });
    const seed = pkcs8.subarray(pkcs8.length - 32);
    const h = crypto.createHash("sha512").update(seed).digest();
    const clamped = Buffer.from(h.subarray(0, 32));
    clamped[0] &= 248;
    clamped[31] &= 127;
    clamped[31] |= 64;
    let s = 0n;
    for (let b = 31; b >= 0; b--) s = (s << 8n) | BigInt(clamped[b]);
    assert.equal(encodePoint(mul(s, G)), nodePk);
  }
});

test("encode/decode round-trips and rejects off-curve / bad input", () => {
  for (const k of [1n, 2n, 12345n, L - 1n]) {
    const pt = mul(k, G);
    assert.ok(eq(decodePoint(encodePoint(pt)), pt));
  }
  assert.throws(() => decodePoint("ff".repeat(32)));
  assert.throws(() => decodePoint("XYZ"));
  assert.throws(() => decodePoint("ab".repeat(31)));
});

test("group law: associativity and scalar-mul distributivity on the basepoint", () => {
  const a = 7n;
  const b = 11n;
  assert.ok(eq(add(mul(a, G), mul(b, G)), mul(a + b, G)));
  assert.ok(eq(add(add(mul(a, G), mul(b, G)), mul(3n, G)), mul(a + b + 3n, G)));
});

test("scalar hex helpers round-trip and validate", () => {
  const k = randomScalar();
  assert.equal(scalarFromHex(scalarToHex(k)), k % L);
  assert.match(scalarToHex(k), /^[0-9a-f]{64}$/);
  assert.throws(() => scalarFromHex("A".repeat(64)));
  assert.throws(() => scalarFromHex("ab"));
});

test("hashToPoint is deterministic, on-curve, non-identity, domain-separated", () => {
  const a = hashToPoint("simurgh.pccc.class.v1", "sha256:e", "class-x");
  const b = hashToPoint("simurgh.pccc.class.v1", "sha256:e", "class-x");
  const cDomain = hashToPoint("simurgh.pccc.match.v1", "sha256:e", "class-x");
  const cEpoch = hashToPoint("simurgh.pccc.class.v1", "sha256:OTHER", "class-x");
  const cLabel = hashToPoint("simurgh.pccc.class.v1", "sha256:e", "class-y");
  assert.ok(eq(a, b));
  assert.ok(onCurve(a) && !isSmallOrder(a));
  assert.ok(!eq(a, cDomain));
  assert.ok(!eq(a, cEpoch));
  assert.ok(!eq(a, cLabel));
  // cofactor-cleared → prime-order → L·H = identity
  assert.ok(eq(mul(L, a), ID));
});

test("P and L are the standard curve25519 parameters", () => {
  assert.equal(P, 2n ** 255n - 19n);
  assert.equal(L, 2n ** 252n + 27742317777372353535851937790883648493n);
});
