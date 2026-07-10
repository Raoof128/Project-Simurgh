// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane B two-process ceremony corroborates the committed evidence.
import test from "node:test";
import assert from "node:assert/strict";
import { runCeremony } from "../../../../tools/simurgh-attestation/stage5h/laneb/run-laneb-review-ceremony.mjs";

test("Lane B ceremony corroborates (independent rerun == bundle receipt)", () => {
  const res = runCeremony();
  assert.equal(res.corroborated, true);
  assert.equal(res.bundleReceipt, res.ceremonyReceipt);
  assert.equal(res.transcript.producer_signature_ok, true);
  assert.equal(res.transcript.attestation_signature_ok, true);
  // the ceremony receipt is the SAME species as the bundle receipt
  assert.equal(res.transcript.ceremony_receipt.schema, "simurgh.vsd.review_receipt.v1");
});
