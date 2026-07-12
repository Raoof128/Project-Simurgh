// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — 384 v2 extension schema. Runs AFTER the frozen 5L core returns 0; owns ONLY v2 material
// (envelope/profile/quorum_rule/required_members/anchor-set/adequacy/seat shape). NOT schema_version or
// quorum_policy.profile (those are inherited 364/365 — asserted at dispatch level).
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkV2Schema } from "../../../../tools/simurgh-attestation/stage5m/core/schema.mjs";

function goodSeat() {
  return {
    uuid: "u",
    body: "eyJ9",
    logID: "abc",
    logIndex: 1,
    integratedTime: 1,
    signedEntryTimestamp: "sig",
    submitter_pubkey: "pk",
    inclusionProof: {
      logIndex: 0,
      treeSize: 2,
      rootHash: "00",
      hashes: [],
      checkpoint: "c\n\n— x y",
    },
  };
}
function goodBundle(over = {}) {
  return {
    envelope_schema: "vtc_quorum_confirmed.v2",
    quorum_profile: "third_trust_ecology",
    quorum_rule: "all_required",
    required_members: [
      "rfc3161_tsa",
      "bitcoin_confirmed_publication",
      "transparency_log_inclusion",
    ],
    anchors: [{ anchor_type: "rfc3161_tsa" }, { anchor_type: "bitcoin_ots" }],
    transparency_log_seat: goodSeat(),
    ...over,
  };
}

test("valid v2 bundle → null", () => {
  assert.equal(checkV2Schema(goodBundle()), null);
});

test("absent transparency_log_seat is VALID (seat optional → 393 reachable)", () => {
  const b = goodBundle();
  delete b.transparency_log_seat;
  assert.equal(checkV2Schema(b), null);
});

test("each v2 malformation → 384", () => {
  assert.equal(checkV2Schema(goodBundle({ envelope_schema: "v1" })).raw, 384);
  assert.equal(checkV2Schema(goodBundle({ quorum_profile: "x" })).raw, 384);
  assert.equal(checkV2Schema(goodBundle({ quorum_rule: "any_one" })).raw, 384);
  assert.equal(checkV2Schema(goodBundle({ required_members: ["rfc3161_tsa"] })).raw, 384);
  // smuggled 4th member
  assert.equal(
    checkV2Schema(
      goodBundle({
        required_members: [
          "rfc3161_tsa",
          "bitcoin_confirmed_publication",
          "transparency_log_inclusion",
          "extra",
        ],
      })
    ).raw,
    384
  );
});

test("Rekor seat smuggled into bundle.anchors → 384 (G-A)", () => {
  const b = goodBundle({
    anchors: [
      { anchor_type: "rfc3161_tsa" },
      { anchor_type: "bitcoin_ots" },
      { anchor_type: "transparency_log_seat" },
    ],
  });
  assert.equal(checkV2Schema(b).raw, 384);
});

test("adequacy vocabulary inside a v2-only field → 384 (recursive screen)", () => {
  const seat = goodSeat();
  seat.complete = true;
  assert.equal(checkV2Schema(goodBundle({ transparency_log_seat: seat })).raw, 384);
});

test("present-but-malformed seat → 384", () => {
  assert.equal(checkV2Schema(goodBundle({ transparency_log_seat: { uuid: "u" } })).raw, 384);
});
