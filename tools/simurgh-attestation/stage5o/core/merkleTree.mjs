// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §3.5 Merkle tree — the sole normative recursive definition (NOT Stage 5K, NOT RFC 6962).
//
//   merkle_leaf(x)   = SHA256(0x00 || leaf_value)
//   merkle_node(l,r) = SHA256(0x01 || l || r)
//   MTH([x])         = merkle_leaf(x)
//   MTH(D[0:n])      = merkle_node( MTH(D[0:k]), MTH(D[k:n]) ), k = largest power of two STRICTLY < n
//
// Duplicate-last is FORBIDDEN (CVE-2012-2459); no zero padding; left/right order is significant;
// authentication paths are position-aware and a node with no sibling contributes NO synthetic
// sibling. Path length is exactly the number of merkle_node levels on position i's root path.
import { createHash } from "node:crypto";

const sha256 = (b) => createHash("sha256").update(b).digest();

export const merkleLeaf = (leafValue) => sha256(Buffer.concat([Buffer.from([0x00]), leafValue]));
export const merkleNode = (l, r) => sha256(Buffer.concat([Buffer.from([0x01]), l, r]));

function largestPow2StrictlyLessThan(n) {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k; // for n >= 2
}

/** MTH over an array of 32-byte leaf VALUES (leaf_id). Empty is forbidden (N > 0). */
export function MTH(leafValues) {
  const n = leafValues.length;
  if (n === 0) throw new Error("MTH_empty_forbidden");
  if (n === 1) return merkleLeaf(leafValues[0]);
  const k = largestPow2StrictlyLessThan(n);
  return merkleNode(MTH(leafValues.slice(0, k)), MTH(leafValues.slice(k)));
}

/**
 * Position-aware authentication path for leaf index i (bottom-up): each step is { sibling, side }
 * where side is which side the SIBLING is on. No synthetic siblings.
 */
export function buildInclusionPath(leafValues, i) {
  if (!Number.isInteger(i) || i < 0 || i >= leafValues.length) throw new RangeError("index");
  const path = [];
  const rec = (lo, hi, idx) => {
    const n = hi - lo;
    if (n === 1) return;
    const k = largestPow2StrictlyLessThan(n);
    const mid = lo + k;
    if (idx < mid) {
      path.push({ sibling: MTH(leafValues.slice(mid, hi)), side: "right" });
      rec(lo, mid, idx);
    } else {
      path.push({ sibling: MTH(leafValues.slice(lo, mid)), side: "left" });
      rec(mid, hi, idx);
    }
  };
  rec(0, leafValues.length, i);
  return path.reverse(); // leaf -> root
}

/** Recompute the root from a leaf value and its position-aware path; compare to the expected root. */
export function verifyInclusion(leafValue, path, expectedRoot) {
  let node = merkleLeaf(leafValue);
  for (const step of path) {
    if (!Buffer.isBuffer(step.sibling) || step.sibling.length !== 32) return false;
    node = step.side === "right" ? merkleNode(node, step.sibling) : merkleNode(step.sibling, node);
  }
  return Buffer.isBuffer(expectedRoot) && Buffer.compare(node, expectedRoot) === 0;
}
