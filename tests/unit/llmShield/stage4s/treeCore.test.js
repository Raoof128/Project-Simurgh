// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S tree invariants (4S spec §5): root, parent, split-brain, cycle, reachability.
// 102/103/113 exercise well-formed receipts; 104/105 exercise the defensive
// detection code via hand-crafted index objects (content-addressing makes a real
// cycle / resolving-parent island require a hash collision — see treeCore header).
import test from "node:test";
import assert from "node:assert/strict";
import {
  receiptDigest,
  indexBundle,
  verifyTreeInvariants,
} from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import {
  SCHEMAS,
  ROOT_SENTINEL,
} from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

function mkReceipt({ parent, delegatee, rootDigest, window = "w1" }) {
  return {
    schema: SCHEMAS.HOP_RECEIPT,
    epoch: "ep1",
    run_id: "run1",
    window_id: window,
    root_receipt_digest: rootDigest,
    parent_receipt_digest: parent,
    delegator_key_digest: "sha256:" + "a".repeat(64),
    delegatee_key_digest: delegatee,
    scope: ["mail.read"],
    budget_allocated: 6,
    spine_refs: { custody_4p: null, consent_4o: null, friction_4q: null },
    signature_delegator: "",
    signature_delegatee: "",
  };
}
const K = (c) => "sha256:" + c.repeat(64);

// Honest 4-node tree: root -> A, root -> B, A -> C.
function honestTree() {
  const root = mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL });
  const rd = receiptDigest(root);
  const a = mkReceipt({ parent: rd, delegatee: K("1"), rootDigest: rd });
  const b = mkReceipt({ parent: rd, delegatee: K("2"), rootDigest: rd });
  const ad = receiptDigest(a);
  const c = mkReceipt({ parent: ad, delegatee: K("3"), rootDigest: rd });
  return { root, a, b, c, rd, ad };
}

test("honest 4-node tree passes all invariants", () => {
  const { root, a, b, c } = honestTree();
  assert.equal(verifyTreeInvariants(indexBundle([root, a, b, c])).raw, 0);
});

test("zero sentinel roots and two sentinel roots both fail 102", () => {
  const { a } = honestTree();
  const r1 = mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL });
  const r2 = mkReceipt({ parent: null, delegatee: K("9"), rootDigest: ROOT_SENTINEL });
  assert.equal(verifyTreeInvariants(indexBundle([r1, r2])).raw, 102); // two roots
  assert.equal(verifyTreeInvariants(indexBundle([a])).raw, 102); // zero roots
});

test("unresolved parent digest fails 103", () => {
  const { root, a } = honestTree();
  const orphan = mkReceipt({ parent: K("f"), delegatee: K("7"), rootDigest: receiptDigest(root) });
  assert.equal(verifyTreeInvariants(indexBundle([root, a, orphan])).raw, 103);
});

test("same delegatee under two parents fails 113 (split-brain)", () => {
  const { root, a, b, rd, ad } = honestTree();
  const bd = receiptDigest(b);
  const c1 = mkReceipt({ parent: ad, delegatee: K("3"), rootDigest: rd });
  const c2 = mkReceipt({ parent: bd, delegatee: K("3"), rootDigest: rd });
  assert.equal(verifyTreeInvariants(indexBundle([root, a, b, c1, c2])).raw, 113);
});

test("island root (null parent, non-sentinel) is unreachable -> 105", () => {
  const { root, a, rd } = honestTree();
  // A second null-parent receipt whose root_receipt_digest is NOT the sentinel: it is
  // not counted as THE root (so 102 stays green) but is unreachable from the real root.
  const island = mkReceipt({ parent: null, delegatee: K("e"), rootDigest: rd });
  assert.equal(verifyTreeInvariants(indexBundle([root, a, island])).raw, 105);
});

test("hand-crafted cyclic childrenOf is detected as 104", () => {
  // Stand-in for a hash collision an attacker cannot find: childrenOf loops A->B->A.
  const rootD = K("0");
  const aD = K("1");
  const bD = K("2");
  const byDigest = new Map([
    [rootD, mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL })],
    [aD, mkReceipt({ parent: rootD, delegatee: K("1"), rootDigest: rootD })],
    [bD, mkReceipt({ parent: aD, delegatee: K("2"), rootDigest: rootD })],
  ]);
  const childrenOf = new Map([
    [rootD, [aD]],
    [aD, [bD]],
    [bD, [aD]], // the forged loop
  ]);
  const index = { byDigest, childrenOf, sentinelRootDigests: [rootD], rootDigest: rootD };
  assert.equal(verifyTreeInvariants(index).raw, 104);
});

test("hand-crafted unreachable node is detected as 105", () => {
  const rootD = K("0");
  const aD = K("1");
  const orphanD = K("5");
  const byDigest = new Map([
    [rootD, mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL })],
    [aD, mkReceipt({ parent: rootD, delegatee: K("1"), rootDigest: rootD })],
    [orphanD, mkReceipt({ parent: rootD, delegatee: K("5"), rootDigest: rootD })],
  ]);
  const childrenOf = new Map([[rootD, [aD]]]); // orphanD present but not wired as a child
  const index = { byDigest, childrenOf, sentinelRootDigests: [rootD], rootDigest: rootD };
  assert.equal(verifyTreeInvariants(index).raw, 105);
});
