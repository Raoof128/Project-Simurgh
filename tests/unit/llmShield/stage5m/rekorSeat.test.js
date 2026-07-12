// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — 385-390 Rekor seat over INJECTED facts. Skips when seat_present=false. Bounded detail enums;
// unknown detail fails closed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRekorSeat } from "../../../../tools/simurgh-attestation/stage5m/core/rekorSeat.mjs";

function facts(over = {}) {
  return {
    seat_present: true,
    rekor: { kind: "hashedrekord", artifact_hash: "aa" },
    anchor_sha256: "aa",
    inclusion_ok: true,
    inclusion_reason: null,
    checkpoint_ok: true,
    checkpoint_reason: null,
    set_ok: true,
    submitter_ok: true,
    submitter_reason: null,
    entry_submitter_fpr: "fp",
    expected_submitter_fpr: "fp",
    ...over,
  };
}

test("all valid → null", () => assert.equal(checkRekorSeat(facts()), null));

test("seat_present=false → skip (null) — makes 393 reachable", () => {
  assert.equal(checkRekorSeat(facts({ seat_present: false, rekor: null })), null);
});

test("385 entry malformed", () => {
  assert.equal(checkRekorSeat(facts({ rekor: { kind: "rekord", artifact_hash: "aa" } })).raw, 385);
});
test("386 artifact-hash mismatch (cross-commitment replay)", () => {
  assert.equal(checkRekorSeat(facts({ anchor_sha256: "bb" })).raw, 386);
});
test("387 inclusion invalid + bounded detail", () => {
  const r = checkRekorSeat(
    facts({ inclusion_ok: false, inclusion_reason: "log_index_out_of_range" })
  );
  assert.equal(r.raw, 387);
  assert.equal(r.detail, "log_index_out_of_range");
});
test("387 unknown detail → fail closed", () => {
  assert.equal(
    checkRekorSeat(facts({ inclusion_ok: false, inclusion_reason: "weird" })).detail,
    "unknown"
  );
});
test("388 checkpoint invalid + bounded detail", () => {
  const r = checkRekorSeat(
    facts({ checkpoint_ok: false, checkpoint_reason: "checkpoint_log_key_unpinned" })
  );
  assert.equal(r.raw, 388);
  assert.equal(r.detail, "checkpoint_log_key_unpinned");
});
test("389 SET invalid", () => {
  assert.equal(checkRekorSeat(facts({ set_ok: false })).raw, 389);
});
test("390 submitter sig invalid", () => {
  const r = checkRekorSeat(
    facts({ submitter_ok: false, submitter_reason: "submitter_signature_invalid" })
  );
  assert.equal(r.raw, 390);
  assert.equal(r.detail, "submitter_signature_invalid");
});
test("390 expected-key binding mismatch (G6 — pinned key)", () => {
  const r = checkRekorSeat(facts({ entry_submitter_fpr: "other" }));
  assert.equal(r.raw, 390);
  assert.equal(r.detail, "submitter_key_fingerprint_mismatch");
});
test("first-failure order: 386 before 387", () => {
  assert.equal(checkRekorSeat(facts({ anchor_sha256: "bb", inclusion_ok: false })).raw, 386);
});
