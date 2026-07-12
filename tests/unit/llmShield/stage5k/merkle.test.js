// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — frozen Merkle-set profile + the 1..9 inclusion property test (co-develops the sibling
// builder and verifier), plus the projection subject-digest.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  leafHash,
  nodeHash,
  merkleRoot,
  buildInclusion,
  verifyInclusion,
  encodeDigest,
} from "../../../../tools/simurgh-attestation/stage5k/core/merkle.mjs";
import {
  sectionSubjectDigest,
  projectSection,
  universeSetDigest,
} from "../../../../tools/simurgh-attestation/stage5k/core/projection.mjs";
import { canonicalJson, sha256Hex } from "../../../../tools/simurgh-attestation/canonicalise.mjs";

const H = (...bufs) => {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
};
const leaf = (i) => ({
  leaf_id: `s${i}`,
  leaf_type: "vpc_section",
  subject_digest: `sha256:${String(i).repeat(4).padEnd(64, "0")}`,
});

test("leafHash is domain-framed over canonicalJson(leaf_payload)", () => {
  const lp = leaf(1);
  const expect = H(
    Buffer.from("simurgh.vuc.leaf.v1", "utf8"),
    Buffer.from([0]),
    Buffer.from(
      canonicalJson({
        leaf_id: lp.leaf_id,
        leaf_type: lp.leaf_type,
        subject_digest: lp.subject_digest,
      }),
      "utf8"
    )
  );
  assert.ok(leafHash(lp).equals(expect));
});

test("odd final node is promoted unchanged", () => {
  const l = [leaf(1), leaf(2), leaf(3)].map(leafHash);
  const root = nodeHash(nodeHash(l[0], l[1]), l[2]); // l[2] promoted, not self-hashed
  assert.ok(merkleRoot(l).equals(root));
});

test("empty tree throws", () => assert.throws(() => merkleRoot([])));

// The 1..9 property test — co-develops the sibling builder (buildInclusion) and verifyInclusion so the
// promoted-odd levels agree. This is the real reachability guarantee, not prose.
for (let n = 1; n <= 9; n++) {
  test(`inclusion round-trips for EVERY leaf, tree_size=${n}`, () => {
    const hashes = Array.from({ length: n }, (_, i) => leafHash(leaf(i)));
    const rootHex = encodeDigest(merkleRoot(hashes));
    for (let idx = 0; idx < n; idx++) {
      const proof = buildInclusion(hashes, idx);
      const leafHex = encodeDigest(hashes[idx]);
      assert.equal(verifyInclusion(proof, leafHex, rootHex), true, `size ${n} idx ${idx}`);
      if (n > 1)
        assert.equal(
          verifyInclusion({ ...proof, leaf_index: (idx + 1) % n }, leafHex, rootHex),
          false
        ); // wrong index
      // A tree_size in a DIFFERENT level-count band forces a different sibling count → rejected. (Same-band
      // tree_size consistency with the committed leaf_count is enforced at 349/356, not the path check.)
      assert.equal(verifyInclusion({ ...proof, tree_size: n + 64 }, leafHex, rootHex), false); // wrong size, more levels
      if (proof.sibling_hashes.length) {
        assert.equal(
          verifyInclusion(
            { ...proof, sibling_hashes: proof.sibling_hashes.slice(1) },
            leafHex,
            rootHex
          ),
          false
        ); // missing sibling
        assert.equal(
          verifyInclusion(
            { ...proof, sibling_hashes: [...proof.sibling_hashes, rootHex] },
            leafHex,
            rootHex
          ),
          false
        ); // extra sibling
        const bad = [...proof.sibling_hashes];
        bad[0] = "sha256:" + "e".repeat(64);
        assert.equal(verifyInclusion({ ...proof, sibling_hashes: bad }, leafHex, rootHex), false); // wrong sibling
      }
      assert.equal(
        verifyInclusion({ ...proof, sibling_hashes: ["deadbeef"] }, leafHex, rootHex),
        false
      ); // malformed
    }
  });
}

test("projection subject digest is domain-framed and stable", () => {
  const args = {
    partition_digest: "sha256:" + "a".repeat(64),
    section_id: "3.1",
    canonical_path: "/risk/cbrn",
    redaction_types: ["pii"],
  };
  assert.equal(
    sectionSubjectDigest(args),
    sha256Hex("simurgh.vuc.section_subject.v1" + canonicalJson(args))
  );
  const p = projectSection(
    { section_id: "3.1", canonical_path: "/risk/cbrn", redaction_types: ["pii"] },
    args.partition_digest
  );
  assert.equal(p.leaf_id, "3.1");
  assert.equal(p.leaf_type, "vpc_section");
  assert.equal(p.subject_digest, sectionSubjectDigest(args));
});

test("universeSetDigest is order-independent and includes leaf_type", () => {
  const a = [leaf(1), leaf(2), leaf(3)];
  const b = [leaf(3), leaf(1), leaf(2)];
  assert.equal(universeSetDigest(a), universeSetDigest(b)); // order-independent
  const typed = [{ ...leaf(1), leaf_type: "other" }, leaf(2), leaf(3)];
  assert.notEqual(universeSetDigest(typed), universeSetDigest(a)); // leaf_type matters
});
