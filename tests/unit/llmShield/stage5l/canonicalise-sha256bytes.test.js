// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — sha256Bytes (raw 32-byte digest) added to the shared canonicalise module (P0-1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256Bytes, sha256Hex } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

test("sha256Bytes returns the raw 32-byte digest", () => {
  const b = sha256Bytes("abc");
  assert.ok(Buffer.isBuffer(b));
  assert.equal(b.length, 32);
  // known SHA-256("abc")
  assert.equal(
    b.toString("hex"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("sha256Hex(x) == 'sha256:' + hex(sha256Bytes(x))", () => {
  for (const x of ["", "abc", '{"a":1}', "simurgh"]) {
    assert.equal(sha256Hex(x), "sha256:" + sha256Bytes(x).toString("hex"), x);
  }
});
