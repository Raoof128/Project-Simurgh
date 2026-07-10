// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkChain } from "../../../../tools/simurgh-attestation/stage5f/core/chain.mjs";
import { validBundle } from "./_validBundle.mjs";

test("valid linear chain -> null", () => {
  assert.equal(checkChain(validBundle()), null);
});
test("precommit not at position 0 -> 270", () => {
  const b = validBundle();
  b.roster_precommit.chain_position = 5;
  assert.equal(checkChain(b), 270);
});
test("closeout does not link to the head -> 270", () => {
  const b = validBundle();
  b.closeout.previous_record_digest = "sha256:wrong";
  assert.equal(checkChain(b), 270);
});
test("closeout missing the Lane-B receipt digest -> 270", () => {
  const b = validBundle();
  delete b.closeout.blind_recompute_receipt_digest;
  assert.equal(checkChain(b), 270);
});
test("tampered precommit body (digest no longer recomputes) -> 270", () => {
  const b = validBundle();
  b.roster_precommit.roster_digest = "sha256:tamper";
  assert.equal(checkChain(b), 270);
});
