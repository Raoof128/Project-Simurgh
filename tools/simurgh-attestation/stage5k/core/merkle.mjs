// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — frozen Merkle-set profile simurgh.vuc.merkle_set.v1. Hashes are raw 32-byte Buffers;
// node_hash concatenates the two child digests (NOT hex). Odd final node promoted UNCHANGED (RFC-6962).
// Stored digest fields are "sha256:<64 lowercase hex>"; internal math strips the prefix and strict-decodes.
import { createHash } from "node:crypto";
import { canonicalJson } from "../../canonicalise.mjs";
import { DOMAINS } from "../constants.mjs";

const NUL = Buffer.from([0]);
const sha = (...bufs) => {
  const h = createHash("sha256");
  for (const b of bufs) h.update(b);
  return h.digest();
};
const RE = /^sha256:([0-9a-f]{64})$/; // frozen encoding — lowercase, prefixed
const dec = (s) => {
  const m = typeof s === "string" && s.match(RE);
  return m ? Buffer.from(m[1], "hex") : null; // 32-byte Buffer or null
};
const enc = (buf) => "sha256:" + buf.toString("hex");

export function leafHash({ leaf_id, leaf_type, subject_digest }) {
  const payload = canonicalJson({ leaf_id, leaf_type, subject_digest });
  return sha(Buffer.from(DOMAINS.leaf, "utf8"), NUL, Buffer.from(payload, "utf8"));
}
export function nodeHash(left, right) {
  return sha(Buffer.from(DOMAINS.node, "utf8"), NUL, left, right);
}
export function merkleRoot(leafHashes) {
  if (!Array.isArray(leafHashes) || leafHashes.length === 0) throw new Error("empty merkle tree");
  let level = leafHashes;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]); // odd promoted
    }
    level = next;
  }
  return level[0];
}
// Sibling-path builder — co-developed with verifyInclusion (the 1..9 property test binds them).
export function buildInclusion(leafHashes, leaf_index) {
  const tree_size = leafHashes.length;
  const sibling_hashes = [];
  let idx = leaf_index,
    level = leafHashes;
  while (level.length > 1) {
    const promoted = idx === level.length - 1 && level.length % 2 === 1;
    if (!promoted) sibling_hashes.push(enc(idx % 2 === 0 ? level[idx + 1] : level[idx - 1]));
    const next = [];
    for (let i = 0; i < level.length; i += 2)
      next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    idx = Math.floor(idx / 2);
    level = next;
  }
  return { leaf_index, tree_size, sibling_hashes };
}
export function verifyInclusion({ leaf_index, tree_size, sibling_hashes }, leafHashHex, rootHex) {
  if (!Number.isInteger(leaf_index) || !Number.isInteger(tree_size) || tree_size < 1) return false;
  if (leaf_index < 0 || leaf_index >= tree_size) return false;
  if (!Array.isArray(sibling_hashes)) return false;
  let acc = dec(leafHashHex);
  const root = dec(rootHex);
  if (!acc || !root) return false; // strict sha256:<64hex>, 32-byte
  let idx = leaf_index,
    size = tree_size,
    si = 0; // sibling cursor — advances ONLY on non-promoted levels
  while (size > 1) {
    const promoted = idx === size - 1 && size % 2 === 1; // last node on an odd level → no sibling
    if (!promoted) {
      const sib = dec(sibling_hashes[si++]);
      if (!sib) return false; // too few, or malformed/non-canonical
      acc = idx % 2 === 0 ? nodeHash(acc, sib) : nodeHash(sib, acc);
    }
    idx = Math.floor(idx / 2);
    size = Math.ceil(size / 2);
  }
  return si === sibling_hashes.length && acc.equals(root); // reject leftover siblings
}

// Convenience: the "sha256:"-encoded root over a list of leaf payloads (sorted by leaf_id byte key).
export function encodeDigest(buf) {
  return enc(buf);
}
