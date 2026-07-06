// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S window-close fan-out commitments (4S spec §4). Motto: AnthropicSafe
// First, then ReviewerSafe. Each delegator node commits, per delegation window,
// the EXACT set of child receipt digests it minted — not just a count. The
// verifier groups observed children by (parent_receipt_digest, window_id) and
// checks count (106) then the exact set + its committed root (107). Duplicate
// declared digests are structurally invalid commitment material (100).
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { SCHEMAS, DOMAINS } from "../constants.mjs";

// Merkle-free child-set root: a domain-separated digest over the SORTED child
// digests. (Set identity, not a membership-proof accumulator — spec §4.)
export function childSetRoot(childDigests) {
  return recordDigest({ domain: DOMAINS.FANOUT, child_digests: [...childDigests].sort() });
}

// Build an unsigned fan-out commitment. Sorts children; THROWS on duplicates so
// a well-formed builder can never emit malformed commitment material.
export function buildFanoutCommitment({
  epoch,
  runId,
  windowId,
  delegatorKeyDigest,
  nodeReceiptDigest,
  childReceiptDigests,
}) {
  const sorted = [...childReceiptDigests].sort();
  if (new Set(sorted).size !== sorted.length) {
    throw new Error("duplicate declared child digests");
  }
  return {
    schema: SCHEMAS.FANOUT_COMMITMENT,
    epoch,
    run_id: runId,
    window_id: windowId,
    delegator_key_digest: delegatorKeyDigest,
    node_receipt_digest: nodeReceiptDigest,
    declared_child_count: sorted.length,
    declared_child_receipt_digests: sorted,
    declared_child_set_root: childSetRoot(sorted),
    signature_delegator: "",
  };
}

const setsEqual = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// Verify every node's committed child set against the observed tree, grouped by
// (node, window). Returns {raw:0} or {raw:100|106|107, reason, detail}.
export function verifyFanoutCommitments(index, commitments) {
  const { byDigest } = index;

  // observed[nodeDigest][windowId] = sorted array of child receipt digests.
  const observed = new Map();
  for (const [childDigest, r] of byDigest) {
    if (r.parent_receipt_digest === null) continue;
    const p = r.parent_receipt_digest;
    const w = r.window_id;
    if (!observed.has(p)) observed.set(p, new Map());
    const wm = observed.get(p);
    wm.set(w, [...(wm.get(w) || []), childDigest]);
  }
  for (const wm of observed.values()) for (const [w, arr] of wm) wm.set(w, arr.sort());

  // declared[nodeDigest][windowId] = commitment. 100 on schema / duplicate.
  const declared = new Map();
  for (const c of commitments) {
    if (c.schema !== SCHEMAS.FANOUT_COMMITMENT) {
      return { raw: 100, reason: "fanout_commitment_schema_invalid" };
    }
    const decl = c.declared_child_receipt_digests;
    if (!Array.isArray(decl) || new Set(decl).size !== decl.length) {
      return {
        raw: 100,
        reason: "duplicate_declared_child_digests",
        detail: { node: c.node_receipt_digest },
      };
    }
    if (!declared.has(c.node_receipt_digest)) declared.set(c.node_receipt_digest, new Map());
    declared.get(c.node_receipt_digest).set(c.window_id, c);
  }

  for (const nodeDigest of byDigest.keys()) {
    const obsW = observed.get(nodeDigest) || new Map();
    const decW = declared.get(nodeDigest) || new Map();

    // Every window with observed children needs a matching commitment (106),
    // with the right count (106) then the exact set + root (107).
    for (const [w, obsChildren] of obsW) {
      const c = decW.get(w);
      if (!c)
        return {
          raw: 106,
          reason: "fanout_count_mismatch",
          detail: {
            node: nodeDigest,
            window: w,
            observed: obsChildren.length,
            declared: "missing",
          },
        };
      if (c.declared_child_count !== obsChildren.length) {
        return {
          raw: 106,
          reason: "fanout_count_mismatch",
          detail: {
            node: nodeDigest,
            window: w,
            observed: obsChildren.length,
            declared: c.declared_child_count,
          },
        };
      }
      const declSorted = [...c.declared_child_receipt_digests].sort();
      if (
        !setsEqual(declSorted, obsChildren) ||
        c.declared_child_set_root !== childSetRoot(obsChildren)
      ) {
        return {
          raw: 107,
          reason: "fanout_child_set_mismatch",
          detail: { node: nodeDigest, window: w },
        };
      }
    }
    // A declared window with no observed children must be a zero commitment (106
    // if it declares children that were never minted).
    for (const [w, c] of decW) {
      if (!obsW.has(w) && c.declared_child_count !== 0) {
        return {
          raw: 106,
          reason: "fanout_count_mismatch",
          detail: { node: nodeDigest, window: w, observed: 0, declared: c.declared_child_count },
        };
      }
    }
    // A leaf (no observed children in any window) MUST carry a commitment
    // (its explicit zero fan-out). Missing => uncounted-leaf 106.
    if (obsW.size === 0 && decW.size === 0) {
      return {
        raw: 106,
        reason: "fanout_count_mismatch",
        detail: { node: nodeDigest, leaf_commitment: "missing" },
      };
    }
  }
  return { raw: 0, reason: "green" };
}
