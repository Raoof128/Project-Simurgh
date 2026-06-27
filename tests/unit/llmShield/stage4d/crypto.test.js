// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { merkleRoot } from "../../../../tools/simurgh-attestation/stage4d/merkle.mjs";
import {
  canonicalJson,
  sha256HexRaw,
} from "../../../../tools/simurgh-attestation/stage4d/stage4dCrypto.mjs";

test("stage4d canonicalJson sorts object keys recursively", () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":1}');
});

test("stage4d sha256HexRaw returns 64 lowercase hex chars without prefix", () => {
  assert.equal(
    sha256HexRaw("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("stage4d merkle root is deterministic and changes when leaf order changes", () => {
  const a = "00".repeat(32);
  const b = "11".repeat(32);
  assert.match(merkleRoot([a, b]), /^[0-9a-f]{64}$/);
  assert.notEqual(merkleRoot([a, b]), merkleRoot([b, a]));
});
