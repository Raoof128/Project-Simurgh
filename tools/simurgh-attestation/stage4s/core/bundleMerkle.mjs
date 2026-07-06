// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S bundle Merkle commitment (4S spec §10). Motto: AnthropicSafe First,
// then ReviewerSafe. Leaf/node domain-separated Merkle over the ORDERED artifact
// digests (tree receipts ++ detached receipts ++ fan-out commitments ++ crossing
// artifacts). Algorithm reused verbatim from stage4o/core/merkleSurface.mjs
// (ordered leaves, odd node promotes) with stage4s domains.
//
// HONESTY RAIL (spec §10): inclusion proves PRESENCE, never COMPLETENESS. This
// root SEALS the four arrays so a producer cannot add/remove a detached receipt
// silently; completeness comes ONLY from the per-node fan-out commitments.
import { canonicalJson, sha256Hex, DIGEST_RE } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, SCHEMAS } from "../constants.mjs";

const dd = (domain, value) =>
  `sha256:${sha256Hex(canonicalJson({ domain, schema: SCHEMAS.CHAIN_BUNDLE, value }))}`;

const leafOf = (entryDigest) => dd(DOMAINS.MERKLE_LEAF, entryDigest);
const nodeOf = (a, b) => dd(DOMAINS.MERKLE_NODE, [a, b]);

function levels(entryDigests) {
  for (const d of entryDigests)
    if (!DIGEST_RE.test(d)) throw new Error(`merkle_leaf_invalid: ${d}`);
  if (entryDigests.length === 0) throw new Error("merkle_empty");
  const all = [entryDigests.map(leafOf)];
  while (all[all.length - 1].length > 1) {
    const cur = all[all.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      next.push(i + 1 === cur.length ? cur[i] : nodeOf(cur[i], cur[i + 1]));
    }
    all.push(next);
  }
  return all;
}

export function bundleRoot(entryDigests) {
  return levels(entryDigests).at(-1)[0];
}
