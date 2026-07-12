// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — 391 cross-seat binding (both levels: TSA+OTS bind D directly, Rekor binds sha256(hex(D))) +
// 392 counterfeit ecology (duplicate verifier-pinned classes among present seats).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkCrossSeat,
  checkDistinctEcologies,
} from "../../../../tools/simurgh-attestation/stage5m/core/crossSeat.mjs";

function facts(over = {}) {
  return {
    seat_present: true,
    commitment: "D",
    anchor_decoded: "D", // hexDecode(canonical_anchor)
    tsa_imprint: "D",
    ots_leaf: "D",
    anchor_sha256: "H", // sha256(canonical_anchor bytes)
    rekor_artifact_hash: "H",
    present_valid_ecology_classes: ["rfc3161", "bitcoin", "rekor"],
    ...over,
  };
}

test("391: all three bind one commitment → null", () => {
  assert.equal(checkCrossSeat(facts()), null);
});
test("391: anchor does not decode to commitment → 391", () => {
  assert.equal(checkCrossSeat(facts({ anchor_decoded: "X" })).raw, 391);
});
test("391: TSA imprint != commitment → 391", () => {
  assert.equal(checkCrossSeat(facts({ tsa_imprint: "X" })).raw, 391);
});
test("391: OTS leaf != commitment → 391 (the frozen-5L OTS contract)", () => {
  assert.equal(checkCrossSeat(facts({ ots_leaf: "X" })).raw, 391);
});
test("391: Rekor artifact != sha256(anchor) → 391", () => {
  assert.equal(checkCrossSeat(facts({ rekor_artifact_hash: "X" })).raw, 391);
});
test("391: seat absent → only TSA+OTS level checked", () => {
  assert.equal(
    checkCrossSeat(facts({ seat_present: false, rekor_artifact_hash: "ignored" })),
    null
  );
  assert.equal(checkCrossSeat(facts({ seat_present: false, ots_leaf: "X" })).raw, 391);
});

test("392: three distinct pinned classes → null", () => {
  assert.equal(checkDistinctEcologies(facts()), null);
});
test("392: duplicate class among present seats (aliasing) → 392", () => {
  assert.equal(
    checkDistinctEcologies(facts({ present_valid_ecology_classes: ["rfc3161", "rekor", "rekor"] }))
      .raw,
    392
  );
});
test("392: two present distinct classes (seat absent) → null (incompleteness is 393, not 392)", () => {
  assert.equal(
    checkDistinctEcologies(facts({ present_valid_ecology_classes: ["rfc3161", "bitcoin"] })),
    null
  );
});
