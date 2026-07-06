// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S receipt builder, dual signatures, bundle merkle (4S spec §3, §10).
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  keyDigest,
  buildHopReceipt,
  dualSign,
  verifyDualSignature,
  signFanout,
  signCrossing,
  assembleChainBundle,
  fanoutDigest,
  crossingDigest,
} from "../../../../tools/simurgh-attestation/stage4s/core/receiptBuilder.mjs";
import { receiptDigest } from "../../../../tools/simurgh-attestation/stage4s/core/treeCore.mjs";
import { bundleRoot } from "../../../../tools/simurgh-attestation/stage4s/core/bundleMerkle.mjs";
import { buildFanoutCommitment } from "../../../../tools/simurgh-attestation/stage4s/core/fanoutCore.mjs";
import { ROOT_SENTINEL } from "../../../../tools/simurgh-attestation/stage4s/constants.mjs";

function kp() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return { privateKey, publicKey, pem, digest: keyDigest(pem) };
}

test("dual signatures verify; tamper breaks; missing vs empty distinguished", () => {
  const root = kp();
  const child = kp();
  let r = buildHopReceipt({
    epoch: "ep1",
    runId: "run1",
    windowId: "w1",
    rootReceiptDigest: "sha256:" + "0".repeat(64),
    parentReceiptDigest: "sha256:" + "1".repeat(64),
    delegatorKeyDigest: root.digest,
    delegateeKeyDigest: child.digest,
    scope: ["mail.read"],
    budgetAllocated: 4,
  });
  r = dualSign(r, root.privateKey, child.privateKey);
  assert.equal(verifyDualSignature(r, root.publicKey, child.publicKey).ok, true);

  const tampered = { ...r, budget_allocated: 99 };
  assert.equal(verifyDualSignature(tampered, root.publicKey, child.publicKey).ok, false);

  const missing = { ...r };
  delete missing.signature_delegatee;
  assert.deepEqual(verifyDualSignature(missing, root.publicKey, child.publicKey), {
    ok: false,
    missing: true,
  });

  const empty = { ...r, signature_delegatee: "" };
  assert.deepEqual(verifyDualSignature(empty, root.publicKey, child.publicKey), {
    ok: false,
    missing: false,
  });
});

test("assembleChainBundle seals four arrays and matches an independent merkle recompute", () => {
  const root = kp();
  const a = kp();
  let rootR = dualSign(
    buildHopReceipt({
      epoch: "ep1",
      runId: "run1",
      windowId: "w1",
      rootReceiptDigest: ROOT_SENTINEL,
      parentReceiptDigest: null,
      delegatorKeyDigest: root.digest,
      delegateeKeyDigest: root.digest,
      scope: ["mail.read"],
      budgetAllocated: 10,
    }),
    root.privateKey,
    root.privateKey
  );
  const rd = receiptDigest(rootR);
  let aR = dualSign(
    buildHopReceipt({
      epoch: "ep1",
      runId: "run1",
      windowId: "w1",
      rootReceiptDigest: rd,
      parentReceiptDigest: rd,
      delegatorKeyDigest: root.digest,
      delegateeKeyDigest: a.digest,
      scope: ["mail.read"],
      budgetAllocated: 4,
    }),
    root.privateKey,
    a.privateKey
  );
  const ad = receiptDigest(aR);
  const f1 = signFanout(
    buildFanoutCommitment({
      epoch: "ep1",
      runId: "run1",
      windowId: "w1",
      delegatorKeyDigest: root.digest,
      nodeReceiptDigest: rd,
      childReceiptDigests: [ad],
    }),
    root.privateKey
  );
  const f2 = signFanout(
    buildFanoutCommitment({
      epoch: "ep1",
      runId: "run1",
      windowId: "w1",
      delegatorKeyDigest: a.digest,
      nodeReceiptDigest: ad,
      childReceiptDigests: [],
    }),
    a.privateKey
  );
  const cr = signCrossing(
    {
      schema: "simurgh.vdcc_crossing_artifact.v1",
      epoch: "ep1",
      run_id: "run1",
      crossing_kind: "tool_execution",
      bound_receipt_digest: ad,
      requested_scope: ["mail.read"],
      spend: 1,
      payload_digest: "sha256:" + "c".repeat(64),
      signature_actor: "",
    },
    a.privateKey
  );
  const publicKeyIndex = { [root.digest]: root.pem, [a.digest]: a.pem };
  const bundle = assembleChainBundle({
    epoch: "ep1",
    runId: "run1",
    treeReceipts: [rootR, aR],
    detachedReceipts: [],
    fanouts: [f1, f2],
    crossings: [cr],
    publicKeyIndex,
  });
  const expected = bundleRoot([
    receiptDigest(rootR),
    receiptDigest(aR),
    fanoutDigest(f1),
    fanoutDigest(f2),
    crossingDigest(cr),
  ]);
  assert.equal(bundle.bundle_merkle_root, expected);
  assert.equal(bundle.non_claims.length, 7);
  assert.equal(bundle.known_limitations.length, 5);
  assert.equal(bundle.rails.length, 12);
});

test("assembleChainBundle throws when a referenced key is absent from the index", () => {
  const root = kp();
  const a = kp();
  const rootR = buildHopReceipt({
    epoch: "ep1",
    runId: "run1",
    windowId: "w1",
    rootReceiptDigest: ROOT_SENTINEL,
    parentReceiptDigest: null,
    delegatorKeyDigest: root.digest,
    delegateeKeyDigest: a.digest, // a's key intentionally NOT in the index
    scope: ["mail.read"],
    budgetAllocated: 10,
  });
  assert.throws(
    () =>
      assembleChainBundle({
        epoch: "ep1",
        runId: "run1",
        treeReceipts: [rootR],
        fanouts: [],
        crossings: [],
        publicKeyIndex: { [root.digest]: root.pem },
      }),
    /public_key_index missing/
  );
});
