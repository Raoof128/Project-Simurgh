// SPDX-License-Identifier: AGPL-3.0-or-later
// Sorted-leaf Merkle PATHS for the exact tree stage4m/core/canonical.mjs#merkleRootSorted
// builds: leaves sorted lexicographically, level-order pairing sha256(a|b), odd node promotes.
import { DIGEST_RE, sha256Hex } from "../../stage4m/core/canonical.mjs";

const pair = (a, b) => `sha256:${sha256Hex(`${a}|${b}`)}`;

export function merklePathSorted(digests, leaf) {
  for (const d of digests) {
    if (!DIGEST_RE.test(d)) throw new Error(`merkle_leaf_invalid: ${d}`);
  }
  let level = [...digests].sort();
  let index = level.indexOf(leaf);
  if (index === -1) throw new Error("merkle_leaf_not_found");
  const path = [];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 === level.length) {
        if (i === index) {
          path.push({ sibling: null, side: "promote" });
          index = next.length;
        }
        next.push(level[i]);
      } else {
        if (i === index || i + 1 === index) {
          path.push(
            i === index
              ? { sibling: level[i + 1], side: "right" }
              : { sibling: level[i], side: "left" }
          );
          index = next.length;
        }
        next.push(pair(level[i], level[i + 1]));
      }
    }
    level = next;
  }
  return path;
}

export function verifyMerklePath(leaf, path, root) {
  if (!DIGEST_RE.test(leaf) || !DIGEST_RE.test(root) || !Array.isArray(path)) return false;
  let acc = leaf;
  for (const step of path) {
    if (!step || typeof step !== "object") return false;
    if (step.side === "promote" && step.sibling === null) continue;
    if (step.side === "right" && DIGEST_RE.test(step.sibling)) acc = pair(acc, step.sibling);
    else if (step.side === "left" && DIGEST_RE.test(step.sibling)) acc = pair(step.sibling, acc);
    else return false;
  }
  return acc === root;
}
