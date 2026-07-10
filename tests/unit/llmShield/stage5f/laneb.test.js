// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — Lane B blind-recompute ceremony (plan Task 17).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  verifyReceipt,
  receiptDigest,
} from "../../../../tools/simurgh-attestation/stage5f/laneb/ceremony.mjs";
import { buildPanel } from "../../../../tools/simurgh-attestation/stage5f/node/buildPanel.mjs";

test("receipt corroborates the committed bundle (0)", () => {
  const { bundle, auditPrivate, receipt, ceremonyFingerprint } = buildPanel();
  assert.equal(verifyReceipt(receipt, bundle, auditPrivate, ceremonyFingerprint), 0);
});
test("closeout binds the exact receipt digest (inseparability)", () => {
  const { bundle, receipt } = buildPanel();
  assert.equal(bundle.closeout.blind_recompute_receipt_digest, receiptDigest(receipt));
});
test("a recomputed digest disagreement (bundle changed under a valid receipt) -> 1", () => {
  const { bundle, auditPrivate, receipt, ceremonyFingerprint } = buildPanel();
  const changed = JSON.parse(JSON.stringify(bundle));
  changed.cells.push({ ...changed.cells[0], case_id: "cX" }); // recompute of cell_matrix_digest now differs
  assert.equal(verifyReceipt(receipt, changed, auditPrivate, ceremonyFingerprint), 1);
});
test("wrong pinned ceremony fingerprint -> 2", () => {
  const { bundle, auditPrivate, receipt } = buildPanel();
  assert.equal(verifyReceipt(receipt, bundle, auditPrivate, "sha256:deadbeef"), 2);
});
test("tampered ceremony signature -> 2", () => {
  const { bundle, auditPrivate, receipt, ceremonyFingerprint } = buildPanel();
  const bad = { ...receipt, signature: Buffer.from("nope").toString("base64") };
  assert.equal(verifyReceipt(bad, bundle, auditPrivate, ceremonyFingerprint), 2);
});
