// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — the set laws, INDEPENDENT per component (never a union). 357 No Shrinking Universe (every
// committed leaf in U_vpc AND in U_vrc), 358 No Phantom Section (every evaluated leaf in U_commit), 359
// alias (distinct leaf_id + duplicate subject). Equality over the (leaf_id, leaf_type, subject_digest)
// triple.
import { R } from "./result.mjs";

const key = (l) => `${l.leaf_id} ${l.leaf_type} ${l.subject_digest}`;
const keySet = (arr) => new Set(arr.map(key));

export function checkShrinking(ctx) {
  const vpc = keySet(ctx.U_vpc);
  const vrc = keySet(ctx.U_vrc);
  for (const l of ctx.U_commit) {
    if (!vpc.has(key(l))) return R(357, "committed_leaf_absent_from_vpc", { leaf_id: l.leaf_id });
    if (!vrc.has(key(l))) return R(357, "committed_leaf_absent_from_vrc", { leaf_id: l.leaf_id });
  }
  return null;
}

export function checkPhantom(ctx) {
  const commit = keySet(ctx.U_commit);
  for (const l of ctx.U_vpc)
    if (!commit.has(key(l))) return R(358, "vpc_leaf_absent_from_commit", { leaf_id: l.leaf_id });
  for (const l of ctx.U_vrc)
    if (!commit.has(key(l))) return R(358, "vrc_leaf_absent_from_commit", { leaf_id: l.leaf_id });
  return null;
}

export function checkAlias(ctx) {
  // distinct leaf_id with duplicate subject_digest (349 already owns duplicate leaf_id).
  const bySubject = new Map();
  for (const l of ctx.U_commit) {
    const prior = bySubject.get(l.subject_digest);
    if (prior !== undefined && prior !== l.leaf_id)
      return R(359, "duplicate_subject_distinct_ids", { subject_digest: l.subject_digest });
    bySubject.set(l.subject_digest, l.leaf_id);
  }
  return null;
}
