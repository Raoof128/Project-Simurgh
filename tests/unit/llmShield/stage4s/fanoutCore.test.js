// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S window-close fan-out commitments (4S spec §4): exact child-set binding,
// grouped by (parent_receipt_digest, window_id). Codes 100/106/107.
import test from "node:test";
import assert from "node:assert/strict";
import {
  receiptDigest,
  indexBundle,
} from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import {
  buildFanoutCommitment,
  verifyFanoutCommitments,
} from "../../../../tools/simurgh-attestation/stage4s/core/fanoutCore.mjs";
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

// root -> A, root -> B (window w1); A -> C (window w1). B and C are leaves.
function tree() {
  const root = mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL });
  const rd = receiptDigest(root);
  const a = mkReceipt({ parent: rd, delegatee: K("1"), rootDigest: rd });
  const b = mkReceipt({ parent: rd, delegatee: K("2"), rootDigest: rd });
  const ad = receiptDigest(a);
  const c = mkReceipt({ parent: ad, delegatee: K("3"), rootDigest: rd });
  const cd = receiptDigest(c);
  const bd = receiptDigest(b);
  return { root, a, b, c, rd, ad, bd, cd };
}
const commit = (node, window, children) =>
  buildFanoutCommitment({
    epoch: "ep1",
    runId: "run1",
    windowId: window,
    delegatorKeyDigest: K("a"),
    nodeReceiptDigest: node,
    childReceiptDigests: children,
  });

test("honest tree with a commitment for every node passes 0", () => {
  const { root, a, b, c, rd, ad, bd, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  const commitments = [
    commit(rd, "w1", [receiptDigest(a), receiptDigest(b)]),
    commit(ad, "w1", [cd]),
    commit(bd, "w1", []),
    commit(cd, "w1", []),
  ];
  assert.equal(verifyFanoutCommitments(idx, commitments).raw, 0);
});

test("hidden child (parent commits 1 of 2) fails 106", () => {
  const { root, a, b, c, rd, ad, bd, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  const commitments = [
    commit(rd, "w1", [receiptDigest(a)]), // omits B
    commit(ad, "w1", [cd]),
    commit(bd, "w1", []),
    commit(cd, "w1", []),
  ];
  assert.equal(verifyFanoutCommitments(idx, commitments).raw, 106);
});

test("same count, swapped digest fails 107", () => {
  const { root, a, b, c, rd, ad, bd, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  const commitments = [
    commit(rd, "w1", [receiptDigest(a), K("f")]), // right count, wrong second child
    commit(ad, "w1", [cd]),
    commit(bd, "w1", []),
    commit(cd, "w1", []),
  ];
  assert.equal(verifyFanoutCommitments(idx, commitments).raw, 107);
});

test("duplicate declared digests: builder throws; hand-made commitment fails 100", () => {
  assert.throws(() => commit(K("0"), "w1", [K("1"), K("1")]), /duplicate/i);
  const { root, a, b, c, rd, ad, bd, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  const dup = commit(rd, "w1", [receiptDigest(a), receiptDigest(b)]);
  dup.declared_child_receipt_digests = [receiptDigest(a), receiptDigest(a)]; // forge a duplicate
  dup.declared_child_count = 2;
  const commitments = [dup, commit(ad, "w1", [cd]), commit(bd, "w1", []), commit(cd, "w1", [])];
  assert.equal(verifyFanoutCommitments(idx, commitments).raw, 100);
});

test("missing leaf commitment fails 106", () => {
  const { root, a, b, c, rd, ad, bd, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  const commitments = [
    commit(rd, "w1", [receiptDigest(a), receiptDigest(b)]),
    commit(ad, "w1", [cd]),
    commit(bd, "w1", []),
    // C's leaf commitment omitted
  ];
  assert.equal(verifyFanoutCommitments(idx, commitments).raw, 106);
});

test("two-window node passes; child committed under wrong window fails 106", () => {
  // root delegates A in w1 and B in w2, one commitment per window.
  const root = mkReceipt({ parent: null, delegatee: K("0"), rootDigest: ROOT_SENTINEL });
  const rd = receiptDigest(root);
  const a = mkReceipt({ parent: rd, delegatee: K("1"), rootDigest: rd, window: "w1" });
  const b = mkReceipt({ parent: rd, delegatee: K("2"), rootDigest: rd, window: "w2" });
  const ad = receiptDigest(a);
  const bd = receiptDigest(b);
  const idx = indexBundle([root, a, b]);
  const good = [
    commit(rd, "w1", [ad]),
    commit(rd, "w2", [bd]),
    commit(ad, "w1", []),
    commit(bd, "w2", []),
  ];
  assert.equal(verifyFanoutCommitments(idx, good).raw, 0);
  // B minted in w2 but committed under w1 only: w2 observed has no commitment -> 106.
  const bad = [commit(rd, "w1", [ad, bd]), commit(ad, "w1", []), commit(bd, "w2", [])];
  assert.equal(verifyFanoutCommitments(idx, bad).raw, 106);
});
