// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.2 — RFC 5869 HKDF-SHA256 (A25). Parity is pinned to RFC 5869's own Appendix A
// vectors, never to our arithmetic (A25's requirement).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hkdfExtract,
  hkdfExpand,
} from "../../../../tools/simurgh-attestation/stage5o/core/hkdf.mjs";

const hex = (s) => Buffer.from(s.replace(/\s+/g, ""), "hex");

// RFC 5869, Appendix A.1 — Test Case 1 (SHA-256).
test("RFC 5869 A.1 (Test Case 1): extract then expand match the published vectors", () => {
  const IKM = hex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
  const salt = hex("000102030405060708090a0b0c");
  const info = hex("f0f1f2f3f4f5f6f7f8f9");
  const L = 42;
  const PRK = hkdfExtract(salt, IKM);
  assert.equal(
    PRK.toString("hex"),
    "077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5"
  );
  const OKM = hkdfExpand(PRK, info, L);
  assert.equal(
    OKM.toString("hex"),
    "3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865"
  );
});

// RFC 5869, Appendix A.3 — Test Case 3 (SHA-256, zero-length salt and info).
test("RFC 5869 A.3 (Test Case 3): empty salt/info match the published vectors", () => {
  const IKM = hex("0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b");
  const salt = Buffer.alloc(0);
  const info = Buffer.alloc(0);
  const L = 42;
  const PRK = hkdfExtract(salt, IKM);
  assert.equal(
    PRK.toString("hex"),
    "19ef24a32c717b167f33a91d6f648bdf96596776afdb6377ac434c1c293ccb04"
  );
  const OKM = hkdfExpand(PRK, info, L);
  assert.equal(
    OKM.toString("hex"),
    "8da4e775a563c18f715f802a063c5a31b8a11f5c5ee1879ec3454e5f3c738d2d9d201395faa4b61a96c8"
  );
});

test("expand: a single 32-byte block is one HMAC block (our per-draw shape)", () => {
  const PRK = hkdfExtract(Buffer.alloc(32, 7), Buffer.alloc(32, 9));
  const out = hkdfExpand(PRK, Buffer.from("info"), 32);
  assert.equal(out.length, 32);
});

test("expand: rejects a length beyond 255*HashLen", () => {
  const PRK = hkdfExtract(Buffer.alloc(32, 1), Buffer.alloc(32, 2));
  assert.throws(() => hkdfExpand(PRK, Buffer.alloc(0), 255 * 32 + 1));
});

test("expand: length is exact (no over-return)", () => {
  const PRK = hkdfExtract(Buffer.alloc(32, 1), Buffer.alloc(4, 2));
  assert.equal(hkdfExpand(PRK, Buffer.alloc(0), 1).length, 1);
  assert.equal(hkdfExpand(PRK, Buffer.alloc(0), 40).length, 40);
});
