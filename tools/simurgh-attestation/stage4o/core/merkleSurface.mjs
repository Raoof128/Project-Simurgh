// SPDX-License-Identifier: AGPL-3.0-or-later
// Leaf/node domain-separated Merkle over the ORDERED manifest entries (4O spec §5a).
// Unlike stage4n's sorted-leaf tree, manifest order is normative. Odd node promotes.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { domainDigest } from "./digest.mjs";
import { DOMAINS, TOOL_MANIFEST_SCHEMA } from "../constants.mjs";

export const surfaceLeaf = (entryDigest) =>
  domainDigest(DOMAINS.MERKLE_LEAF, TOOL_MANIFEST_SCHEMA, entryDigest);
const node = (a, b) => domainDigest(DOMAINS.MERKLE_NODE, TOOL_MANIFEST_SCHEMA, [a, b]);

function levels(entryDigests) {
  for (const d of entryDigests)
    if (!DIGEST_RE.test(d)) throw new Error(`merkle_leaf_invalid: ${d}`);
  if (entryDigests.length === 0) throw new Error("merkle_empty");
  const all = [entryDigests.map(surfaceLeaf)];
  while (all[all.length - 1].length > 1) {
    const cur = all[all.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(i + 1 === cur.length ? cur[i] : node(cur[i], cur[i + 1]));
    }
    all.push(next);
  }
  return all;
}

export const surfaceRoot = (entryDigests) => levels(entryDigests).at(-1)[0];

export function surfacePath(entryDigests, index) {
  const all = levels(entryDigests);
  const path = [];
  let i = index;
  for (let l = 0; l < all.length - 1; l++) {
    const cur = all[l];
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib >= cur.length) path.push({ sibling: null, side: "promote" });
    else path.push({ sibling: cur[sib], side: i % 2 === 0 ? "right" : "left" });
    i = Math.floor(i / 2);
  }
  return path;
}

export function verifySurfacePath(entryDigest, path, root) {
  if (!DIGEST_RE.test(entryDigest) || !DIGEST_RE.test(root) || !Array.isArray(path)) return false;
  let acc = surfaceLeaf(entryDigest);
  for (const step of path) {
    if (!step || typeof step !== "object") return false;
    if (step.side === "promote" && step.sibling === null) continue;
    if (step.side === "right" && DIGEST_RE.test(step.sibling)) acc = node(acc, step.sibling);
    else if (step.side === "left" && DIGEST_RE.test(step.sibling)) acc = node(step.sibling, acc);
    else return false;
  }
  return acc === root;
}
