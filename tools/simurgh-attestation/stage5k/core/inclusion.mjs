// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — 356 inclusion proofs. Every committed leaf has a valid, index-fixed inclusion proof; the
// proof-subject census equals the leaf set (no missing / extra / duplicate); tree_size = leaf_count.
import { R } from "./result.mjs";
import { leafHash, verifyInclusion, encodeDigest } from "./merkle.mjs";

export function checkInclusion(ctx) {
  const uc = ctx.bundle.universe_commitment;
  const leaves = uc.leaves;
  const root = uc.universe_root;
  const leafById = new Map(leaves.map((l) => [l.leaf_id, l]));

  const seen = new Set();
  for (const p of ctx.bundle.inclusion_proofs) {
    if (!leafById.has(p.leaf_id)) return R(356, "proof_subject_not_a_leaf", { leaf_id: p.leaf_id });
    if (seen.has(p.leaf_id)) return R(356, "duplicate_proof", { leaf_id: p.leaf_id });
    seen.add(p.leaf_id);
    if (p.tree_size !== leaves.length)
      return R(356, "proof_wrong_tree_size", { leaf_id: p.leaf_id });
    const leafHex = encodeDigest(leafHash(leafById.get(p.leaf_id)));
    if (!verifyInclusion(p, leafHex, root))
      return R(356, "inclusion_proof_invalid", { leaf_id: p.leaf_id });
  }
  for (const l of leaves)
    if (!seen.has(l.leaf_id)) return R(356, "missing_inclusion_proof", { leaf_id: l.leaf_id });
  return null;
}
