// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S chain decision engine + adversarial matrix (4S spec §8, §11, §12).
// Honest base tree: root -> A, root -> B, A -> C (budgets 10/4/4/2, shrinking
// scopes, complete window-close commitments). Each row applies ONE mutation and
// re-signs / re-seals every earlier container (cascade rule) except the layer it
// intentionally breaks.
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  keyDigest,
  buildHopReceipt,
  dualSign,
  signFanout,
  signCrossing,
  assembleChainBundle,
} from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import { receiptDigest } from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import { buildFanoutCommitment } from "../../../../tools/simurgh-attestation/stage4s/core/fanoutCore.mjs";
import {
  evaluateChain,
  evaluateChainSafe,
} from "../../../../tools/simurgh-attestation/stage4s/core/chainCore.mjs";
import {
  SCHEMAS,
  ROOT_SENTINEL,
} from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

function kp() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return { privateKey, pem, digest: keyDigest(pem) };
}

// Build the honest chain, then apply spec overrides. Every digest/signature is
// recomputed on each build so the cascade re-sign rule holds automatically.
function build(spec = {}) {
  const keys = { root: kp(), a: kp(), b: kp(), c: kp(), evil: kp() };
  const epoch = spec.epoch ?? "ep1";
  const runId = spec.runId ?? "run1";
  const pki = {};
  for (const k of Object.values(keys)) pki[k.digest] = k.pem;

  const mkR = (o, dPriv, ePriv) => dualSign(buildHopReceipt(o), dPriv, ePriv);

  let root = mkR(
    {
      epoch,
      runId,
      windowId: "w1",
      rootReceiptDigest: ROOT_SENTINEL,
      parentReceiptDigest: null,
      delegatorKeyDigest: keys.root.digest,
      delegateeKeyDigest: keys.root.digest,
      scope: spec.rootScope ?? ["calendar.read", "mail.read", "mail.send"],
      budgetAllocated: spec.rootBudget ?? 10,
      spineRefs: spec.rootSpine ?? { custody_4p: null, consent_4o: null, friction_4q: null },
    },
    keys.root.privateKey,
    keys.root.privateKey
  );
  const rd = receiptDigest(root);

  // Optionally make B a second sentinel root (102).
  const bIsRoot = spec.bAsRoot === true;
  let a = mkR(
    {
      epoch,
      runId,
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: keys.root.digest,
      delegateeKeyDigest: keys.a.digest,
      scope: spec.aScope ?? ["mail.read", "mail.send"],
      budgetAllocated: spec.aBudget ?? 4,
    },
    keys.root.privateKey,
    keys.a.privateKey
  );
  let b = mkR(
    {
      epoch,
      runId,
      windowId: "w1",
      rootReceiptDigest: bIsRoot ? ROOT_SENTINEL : rd,
      parentReceiptDigest: bIsRoot ? null : rd,
      delegatorKeyDigest: bIsRoot ? keys.b.digest : keys.root.digest,
      delegateeKeyDigest: keys.b.digest,
      scope: spec.bScope ?? ["mail.read"],
      budgetAllocated: spec.bBudget ?? 4,
    },
    bIsRoot ? keys.b.privateKey : keys.root.privateKey,
    keys.b.privateKey
  );
  const ad = receiptDigest(a);
  const bd = receiptDigest(b);
  let c = mkR(
    {
      epoch: spec.cEpoch ?? epoch,
      runId,
      windowId: "w1",
      rootReceiptDigest: spec.cRootDigest ?? rd,
      parentReceiptDigest: ad,
      delegatorKeyDigest: keys.a.digest,
      delegateeKeyDigest: keys.c.digest,
      scope: spec.cScope ?? ["mail.read"],
      budgetAllocated: spec.cBudget ?? 2,
    },
    keys.a.privateKey,
    keys.c.privateKey
  );
  const cd = receiptDigest(c);

  // Optional extra hidden child D under root (not committed in root's fan-out).
  const treeReceipts = [root, a, b, c];
  let dd = null;
  if (spec.hiddenChild) {
    const d = mkR(
      {
        epoch,
        runId,
        windowId: "w1",
        rootReceiptDigest: rd,
        parentReceiptDigest: rd,
        delegatorKeyDigest: keys.root.digest,
        delegateeKeyDigest: keys.evil.digest,
        scope: ["mail.read"],
        budgetAllocated: 1,
      },
      keys.root.privateKey,
      keys.evil.privateKey
    );
    dd = receiptDigest(d);
    treeReceipts.push(d);
  }

  // Detached receipt (validly signed, not in the tree) for orphan / 117 rows.
  const detached = [];
  if (spec.withDetached || spec.droppedAfterSeal) {
    const det = mkR(
      {
        epoch,
        runId,
        windowId: "w1",
        rootReceiptDigest: rd,
        parentReceiptDigest: rd,
        delegatorKeyDigest: keys.a.digest,
        delegateeKeyDigest: keys.evil.digest,
        scope: ["mail.read"],
        budgetAllocated: 1,
      },
      keys.a.privateKey,
      keys.evil.privateKey
    );
    if (!spec.droppedAfterSeal) detached.push(det);
    spec._detachedForSeal = det;
    spec._detachedDigest = receiptDigest(det);
  }

  // Fan-out commitments (window-close). Honest declared sets unless overridden.
  const fo = (node, children, key, window = "w1") =>
    signFanout(
      buildFanoutCommitment({
        epoch,
        runId,
        windowId: window,
        delegatorKeyDigest: key.digest,
        nodeReceiptDigest: node,
        childReceiptDigests: children,
      }),
      key.privateKey
    );
  const rootChildren = spec.rootChildren ? spec.rootChildren({ ad, bd, dd }) : [ad, bd];
  const fanouts = [];
  if (!bIsRoot) fanouts.push(fo(rd, rootChildren, keys.root));
  else fanouts.push(fo(rd, [ad], keys.root), fo(bd, [], keys.b));
  fanouts.push(fo(ad, [cd], keys.a), fo(bd, [], keys.b));
  fanouts.push(fo(cd, [], keys.c));
  if (dd) fanouts.push(fo(dd, [], keys.evil));

  // Crossing(s).
  const boundDefault = spec.crossingBound
    ? spec.crossingBound({ rd, ad, bd, cd, detached: spec._detachedDigest })
    : cd;
  const signKeyName = spec.crossingSignKey ?? "c";
  let crossing = signCrossing(
    {
      schema: SCHEMAS.CROSSING_ARTIFACT,
      epoch: spec.crossingEpoch ?? epoch,
      run_id: runId,
      crossing_kind: "tool_execution",
      bound_receipt_digest: boundDefault,
      requested_scope: spec.crossingScope ?? ["mail.read"],
      spend: spec.crossingSpend ?? 1,
      payload_digest: "sha256:" + "c".repeat(64),
      signature_actor: "",
    },
    keys[signKeyName].privateKey
  );
  const crossings = spec.noCrossing ? [] : [crossing];

  const bundle = assembleChainBundle({
    epoch,
    runId,
    treeReceipts,
    detachedReceipts: detached,
    fanouts,
    crossings,
    publicKeyIndex: pki,
    spineIndex: spec.spineIndex ?? [],
  });
  if (spec.postAssemble) spec.postAssemble(bundle, { keys, rd, ad, bd, cd });
  return bundle;
}

test("honest chain is GREEN (F9-b zero-fanout leaves pass)", () => {
  assert.equal(evaluateChain(build()).raw, 0);
});

test("row: missing signature field -> 100", () => {
  const bundle = build({
    postAssemble: (b) => {
      delete b.tree_receipts[1].signature_delegatee;
    },
  });
  assert.equal(evaluateChain(bundle).raw, 100);
});

test("row: malformed public_key_index -> 100", () => {
  const bundle = build({ postAssemble: (b) => (b.public_key_index = null) });
  assert.equal(evaluateChain(bundle).raw, 100);
});

test("row: single-signature hop (empty second sig) -> 101", () => {
  const bundle = build({
    postAssemble: (b) => {
      b.tree_receipts[1].signature_delegatee = "";
    },
  });
  assert.equal(evaluateChain(bundle).raw, 101);
});

test("row: crossing signed by the wrong key -> 101", () => {
  assert.equal(evaluateChain(build({ crossingSignKey: "evil" })).raw, 101);
});

test("row: referenced key absent from index -> 101", () => {
  const bundle = build({
    postAssemble: (b) => {
      // drop A's delegatee key from the index -> A's signature unverifiable
      const aKey = b.tree_receipts[1].delegatee_key_digest;
      delete b.public_key_index[aKey];
    },
  });
  assert.equal(evaluateChain(bundle).raw, 101);
});

test("row: dual sentinel root -> 102", () => {
  assert.equal(evaluateChain(build({ bAsRoot: true })).raw, 102);
});

test("row: hidden child (uncounted) -> 106", () => {
  assert.equal(evaluateChain(build({ hiddenChild: true })).raw, 106);
});

test("row: fan-out set swap (right count wrong child) -> 107", () => {
  const bundle = build({ rootChildren: ({ ad }) => [ad, "sha256:" + "f".repeat(64)] });
  assert.equal(evaluateChain(bundle).raw, 107);
});

test("row: forged attenuation (child scope exceeds parent) -> 108", () => {
  assert.equal(evaluateChain(build({ aScope: ["admin.all", "mail.read"] })).raw, 108);
});

test("row: crossing scope outside path intersection -> 108", () => {
  assert.equal(evaluateChain(build({ crossingScope: ["mail.send"] })).raw, 108);
});

test("row: budget amplification / F9-a honest over-budget ledger -> 109", () => {
  assert.equal(evaluateChain(build({ aBudget: 6, bBudget: 6 })).raw, 109);
});

test("row: double-dipping (root spends AND delegates) -> 109", () => {
  const bundle = build({
    crossingBound: ({ rd }) => rd,
    crossingSpend: 3,
    crossingSignKey: "root",
  });
  assert.equal(evaluateChain(bundle).raw, 109);
});

test("row: leaf local overspend -> 110", () => {
  assert.equal(evaluateChain(build({ crossingSpend: 3 })).raw, 110);
});

test("row: receiptless crossing (empty bound) -> 112", () => {
  const bundle = build({ crossingBound: () => "" });
  assert.equal(evaluateChain(bundle).raw, 112);
});

test("row: orphan crossing bound to a detached receipt -> 111", () => {
  const bundle = build({
    withDetached: true,
    crossingBound: ({ detached }) => detached,
    crossingSignKey: "evil", // actor = detached's delegatee (evil)
  });
  assert.equal(evaluateChain(bundle).raw, 111);
});

test("row: wrong epoch -> 114", () => {
  assert.equal(evaluateChain(build({ cEpoch: "ep0" })).raw, 114);
});

test("row: wrong root, right epoch -> 115", () => {
  assert.equal(evaluateChain(build({ cRootDigest: "sha256:" + "e".repeat(64) })).raw, 115);
});

test("row: tampered spine ref -> 116", () => {
  const bundle = build({
    rootSpine: { custody_4p: "sha256:" + "d".repeat(64), consent_4o: null, friction_4q: null },
    spineIndex: [],
  });
  assert.equal(evaluateChain(bundle).raw, 116);
});

test("row: detached receipt appended after seal -> 117", () => {
  // A valid, correctly-signed detached receipt is appended AFTER the merkle root
  // was computed: every earlier phase stays green; only the sealed set drifted.
  const bundle = build();
  const extra = build({ withDetached: true });
  bundle.detached_receipts.push(extra.detached_receipts[0]);
  bundle.public_key_index = { ...bundle.public_key_index, ...extra.public_key_index };
  assert.equal(evaluateChain(bundle).raw, 117);
});

test("row: internal exception -> 118 (evaluateChainSafe)", () => {
  const bundle = build({
    postAssemble: (b) => {
      b.tree_receipts[0].poison = 1n; // BigInt breaks canonicalJson during digest
    },
  });
  assert.equal(evaluateChainSafe(bundle).raw, 118);
});
