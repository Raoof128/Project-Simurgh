// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S tree invariants (4S spec §5). Motto: AnthropicSafe First, then
// ReviewerSafe. The delegation tree is content-addressed: each hop receipt is a
// node identified by receiptDigest, and parent_receipt_digest names its parent.
//
// NOTE (honest, spec §5): content-addressing makes 104 (cycle) and a
// resolving-parent island structurally require a hash collision — a child's
// digest depends on its parent's, so a loop has no fixed point, and with exactly
// one root plus resolving parents every node is reachable. 104 and 105 are
// therefore DEFENSIVE checks over real detection code; they are exercised in
// tests via hand-crafted index objects (which stand in for a collision an
// attacker cannot actually find). 102/103/113 are reachable with well-formed
// receipts.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { DOMAINS, ROOT_SENTINEL } from "../constants.mjs";

// Node identity = digest of the full signed receipt object.
export function receiptDigest(receipt) {
  return recordDigest({ domain: DOMAINS.RECEIPT, receipt });
}

// Build the tree index from a list of hop receipts. A "sentinel root" is a
// receipt with parent_receipt_digest === null AND root_receipt_digest ===
// ROOT_SENTINEL. Any other null-parent receipt is an unreachable island root.
export function indexBundle(receipts) {
  const byDigest = new Map();
  const childrenOf = new Map();
  const sentinelRootDigests = [];
  for (const r of receipts) {
    const d = receiptDigest(r);
    byDigest.set(d, r);
    if (r.parent_receipt_digest === null && r.root_receipt_digest === ROOT_SENTINEL) {
      sentinelRootDigests.push(d);
    }
  }
  for (const [d, r] of byDigest) {
    if (r.parent_receipt_digest !== null) {
      const kids = childrenOf.get(r.parent_receipt_digest) || [];
      kids.push(d);
      childrenOf.set(r.parent_receipt_digest, kids);
    }
  }
  const rootDigest = sentinelRootDigests.length === 1 ? sentinelRootDigests[0] : null;
  return { byDigest, childrenOf, sentinelRootDigests, rootDigest, issue: null };
}

// Reachable set from rootDigest following childrenOf, with cycle detection.
function walk(index) {
  const { byDigest, childrenOf, rootDigest } = index;
  const reachable = new Set();
  let cycle = false;
  const stack = new Set();
  const dfs = (d) => {
    if (stack.has(d)) {
      cycle = true;
      return;
    }
    if (reachable.has(d)) return;
    stack.add(d);
    reachable.add(d);
    for (const c of childrenOf.get(d) || []) dfs(c);
    stack.delete(d);
  };
  if (rootDigest && byDigest.has(rootDigest)) dfs(rootDigest);
  // Also probe non-root components so a detached cycle is seen as a cycle (104)
  // rather than only as unreachable (105).
  for (const d of byDigest.keys()) {
    if (!reachable.has(d)) {
      const localSeen = new Set();
      const probe = (n) => {
        if (localSeen.has(n)) {
          cycle = true;
          return;
        }
        localSeen.add(n);
        for (const c of childrenOf.get(n) || []) probe(c);
      };
      probe(d);
    }
  }
  return { reachable, cycle };
}

export function verifyTreeInvariants(index) {
  const { byDigest, sentinelRootDigests } = index;
  // 102 — exactly one sentinel root.
  if (sentinelRootDigests.length !== 1) {
    return {
      raw: 102,
      reason: "root_missing_or_multiple",
      detail: { sentinel_roots: sentinelRootDigests.length },
    };
  }
  // 103 — every non-root parent digest resolves.
  for (const [d, r] of byDigest) {
    if (r.parent_receipt_digest !== null && !byDigest.has(r.parent_receipt_digest)) {
      return { raw: 103, reason: "parent_digest_mismatch", detail: { node: d } };
    }
  }
  // 113 — split-brain: one delegatee claimed under two parents (in-degree > 1).
  const delegateeCount = new Map();
  for (const [, r] of byDigest) {
    if (r.parent_receipt_digest === null) continue; // root is self-delegated
    const k = r.delegatee_key_digest;
    delegateeCount.set(k, (delegateeCount.get(k) || 0) + 1);
  }
  for (const [k, n] of delegateeCount) {
    if (n > 1) return { raw: 113, reason: "split_brain_child", detail: { delegatee: k, count: n } };
  }
  // 104 — cycle anywhere; 105 — any node unreachable from the sentinel root.
  const { reachable, cycle } = walk(index);
  if (cycle) return { raw: 104, reason: "cycle_detected" };
  for (const d of byDigest.keys()) {
    if (!reachable.has(d)) return { raw: 105, reason: "unreachable_node", detail: { node: d } };
  }
  return { raw: 0, reason: "green" };
}
