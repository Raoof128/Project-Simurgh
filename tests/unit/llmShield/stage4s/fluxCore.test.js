// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S budget flux law (4S spec §6): local_spend + Σ child budgets ≤ parent
// budget; local overspend (110) checked before generic flux (109).
import test from "node:test";
import assert from "node:assert/strict";
import {
  receiptDigest,
  indexBundle,
} from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import { verifyFlux } from "../../../../tools/simurgh-attestation/stage4s/core/fluxCore.mjs";
import {
  SCHEMAS,
  ROOT_SENTINEL,
} from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

function mkReceipt({ parent, delegatee, rootDigest, budget }) {
  return {
    schema: SCHEMAS.HOP_RECEIPT,
    epoch: "ep1",
    run_id: "run1",
    window_id: "w1",
    root_receipt_digest: rootDigest,
    parent_receipt_digest: parent,
    delegator_key_digest: "sha256:" + "a".repeat(64),
    delegatee_key_digest: delegatee,
    scope: ["mail.read"],
    budget_allocated: budget,
    spine_refs: { custody_4p: null, consent_4o: null, friction_4q: null },
    signature_delegator: "",
    signature_delegatee: "",
  };
}
const K = (c) => "sha256:" + c.repeat(64);
const crossing = (bound, spend) => ({ bound_receipt_digest: bound, spend });

// root(budget 10) -> A(budget 4), root -> B(budget 4). A -> C(budget 2).
function tree(rootBudget = 10) {
  const root = mkReceipt({
    parent: null,
    delegatee: K("0"),
    rootDigest: ROOT_SENTINEL,
    budget: rootBudget,
  });
  const rd = receiptDigest(root);
  const a = mkReceipt({ parent: rd, delegatee: K("1"), rootDigest: rd, budget: 4 });
  const b = mkReceipt({ parent: rd, delegatee: K("2"), rootDigest: rd, budget: 4 });
  const ad = receiptDigest(a);
  const c = mkReceipt({ parent: ad, delegatee: K("3"), rootDigest: rd, budget: 2 });
  return { root, a, b, c, rd, ad, cd: receiptDigest(c) };
}

test("honest budgets with modest local spend pass 0", () => {
  const { root, a, b, c, rd } = tree();
  const idx = indexBundle([root, a, b, c]);
  // root local spend 2 + children 4+4 = 10 <= 10
  assert.equal(verifyFlux(idx, [crossing(rd, 2)]).raw, 0);
});

test("double-dipping (root spends AND delegates same budget) fails 109", () => {
  const { root, a, b, c, rd } = tree();
  const idx = indexBundle([root, a, b, c]);
  // 3 + 4 + 4 = 11 > 10
  assert.equal(verifyFlux(idx, [crossing(rd, 3)]).raw, 109);
});

test("budget amplification (children exceed parent) fails 109", () => {
  const { root, a, b, c, rd } = tree();
  // bump A and B to 6 each: 6+6=12 > 10, no local spend
  a.budget_allocated = 6;
  b.budget_allocated = 6;
  const idx = indexBundle([root, a, b, c]);
  assert.equal(verifyFlux(idx, []).raw, 109);
});

test("leaf local overspend fails 110", () => {
  const { root, a, b, c, cd } = tree();
  const idx = indexBundle([root, a, b, c]);
  // leaf C budget 2, crossings spend 3 > 2
  assert.equal(verifyFlux(idx, [crossing(cd, 3)]).raw, 110);
});

test("structuring: 20 unit-budget children over a budget-10 root fails 109", () => {
  const root = mkReceipt({
    parent: null,
    delegatee: K("0"),
    rootDigest: ROOT_SENTINEL,
    budget: 10,
  });
  const rd = receiptDigest(root);
  const kids = [];
  for (let i = 0; i < 20; i++) {
    kids.push(
      mkReceipt({
        parent: rd,
        delegatee: K(i.toString(16).padStart(1, "0")) + "z",
        rootDigest: rd,
        budget: 1,
      })
    );
  }
  // ensure distinct delegatees
  kids.forEach((k, i) => (k.delegatee_key_digest = "sha256:" + i.toString(16).padStart(64, "0")));
  const idx = indexBundle([root, ...kids]);
  assert.equal(verifyFlux(idx, []).raw, 109);
});

test("node with BOTH local overspend and flux violation reports 110 (more specific first)", () => {
  const { root, a, b, c, ad } = tree();
  // A budget 4; give A local spend 5 (overspend) AND make its subtree also over:
  a.budget_allocated = 4;
  c.budget_allocated = 4; // A delegates 4 to C, plus local spend 5 => both broken
  const idx = indexBundle([root, a, b, c]);
  assert.equal(verifyFlux(idx, [crossing(ad, 5)]).raw, 110);
});
