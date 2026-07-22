// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §3.2 / §3.5 — leaf/case constructions and the recursive Merkle tree (reused by §8).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  caseDigest,
  leafId,
  caseLinkCommitment,
} from "../../../../tools/simurgh-attestation/stage5o/core/leafConstruction.mjs";
import {
  MTH,
  merkleLeaf,
  buildInclusionPath,
  verifyInclusion,
} from "../../../../tools/simurgh-attestation/stage5o/core/merkleTree.mjs";

const R = (fill) => Buffer.alloc(32, fill);

test("leaf: case_digest / leaf_id / case_link are 32 bytes and deterministic", () => {
  const cd = caseDigest(Buffer.from('{"q":"a"}', "utf8"));
  assert.equal(cd.length, 32);
  assert.deepEqual(cd, caseDigest(Buffer.from('{"q":"a"}', "utf8")));
  const lid = leafId(R(0xe0), 5, R(0x5a), cd);
  assert.equal(lid.length, 32);
  assert.deepEqual(lid, leafId(R(0xe0), 5, R(0x5a), cd));
  const link = caseLinkCommitment(cd, R(0xe5));
  assert.equal(link.length, 32);
});

test("leaf: index / epoch / salt all change the leaf_id (position- and epoch-bound)", () => {
  const cd = caseDigest(Buffer.from("x", "utf8"));
  const base = leafId(R(0xe0), 5, R(0x5a), cd);
  assert.notDeepEqual(base, leafId(R(0xe0), 6, R(0x5a), cd)); // index
  assert.notDeepEqual(base, leafId(R(0xe1), 5, R(0x5a), cd)); // epoch
  assert.notDeepEqual(base, leafId(R(0xe0), 5, R(0x5b), cd)); // salt
});

test("leaf: known-answer vector (derived, then pinned)", () => {
  const cd = caseDigest(Buffer.from('{"case":1}', "utf8"));
  assert.equal(cd.toString("hex"), KAT_CASE_DIGEST);
  assert.equal(leafId(R(0xaa), 3, R(0xbb), cd).toString("hex"), KAT_LEAF_ID);
});

test("merkle: MTH([x]) == merkle_leaf(x); empty is forbidden", () => {
  const x = R(1);
  assert.deepEqual(MTH([x]), merkleLeaf(x));
  assert.throws(() => MTH([]), /forbidden/);
});

test("merkle: inclusion round-trips for every position, N = 1..12", () => {
  for (let N = 1; N <= 12; N++) {
    const leaves = Array.from({ length: N }, (_, i) => R(i + 1));
    const root = MTH(leaves);
    for (let i = 0; i < N; i++) {
      const path = buildInclusionPath(leaves, i);
      assert.equal(verifyInclusion(leaves[i], path, root), true, `N=${N} i=${i}`);
      assert.equal(verifyInclusion(leaves[i], path, R(0xff)), false, `wrong root N=${N} i=${i}`);
    }
  }
});

test("merkle: a tampered sibling fails inclusion", () => {
  const leaves = Array.from({ length: 5 }, (_, i) => R(i + 1));
  const root = MTH(leaves);
  const path = buildInclusionPath(leaves, 3);
  const bad = path.map((s, j) => (j === 0 ? { ...s, sibling: R(0xde) } : s));
  assert.equal(verifyInclusion(leaves[3], bad, root), false);
});

test("merkle: no synthetic sibling — N=3, i=2 has path length 1, i=0 has length 2", () => {
  const leaves = [R(1), R(2), R(3)];
  assert.equal(buildInclusionPath(leaves, 2).length, 1); // c is the root's right child directly
  assert.equal(buildInclusionPath(leaves, 0).length, 2);
});

test("merkle: distinct leaf sets give distinct roots (no duplicate-last collision)", () => {
  const a = MTH([R(1), R(2), R(3)]);
  const b = MTH([R(1), R(2), R(3), R(3)]); // the CVE-2012-2459 shape
  assert.notDeepEqual(a, b);
});

// Filled from the derivation (a KAT cannot be written before the code produces it).
const KAT_CASE_DIGEST = "92d86d507844a435aafd5698587dcb9057bb959e3a42b31c8c35c1ddd5aa0c48";
const KAT_LEAF_ID = "49e56e4e7b454c152c9fda9eed6b0dfca7f0574d8db5966e5acd178e7acfe01a";
