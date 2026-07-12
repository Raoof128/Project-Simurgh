// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — two-level state: computed_ecology_state {confirmed,incomplete} vs outcome_class
// {ecology_confirmed,ecology_incomplete,false_anchored}. 394 (overclaim) before 393 (honest floor).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ecologyIndependenceNumber,
  computedEcologyState,
  outcomeClass,
  checkState,
} from "../../../../tools/simurgh-attestation/stage5m/core/state.mjs";

const confirmed = {
  seat_present: true,
  present_valid_ecology_classes: ["rfc3161", "bitcoin", "rekor"],
  declared_externally_anchored: true,
};
const incomplete = {
  seat_present: false,
  present_valid_ecology_classes: ["rfc3161", "bitcoin"],
  declared_externally_anchored: false,
};
const falseAnchored = {
  seat_present: false,
  present_valid_ecology_classes: ["rfc3161", "bitcoin"],
  declared_externally_anchored: true,
};

test("confirmed: N=3, state confirmed, class ecology_confirmed, checkState null (→0)", () => {
  assert.equal(ecologyIndependenceNumber(confirmed), 3);
  assert.equal(computedEcologyState(confirmed), "confirmed");
  assert.equal(outcomeClass(confirmed), "ecology_confirmed");
  assert.equal(checkState(confirmed), null);
});

test("honest incomplete (seat absent, not declared): N<3 → 393", () => {
  assert.equal(ecologyIndependenceNumber(incomplete), 2);
  assert.equal(computedEcologyState(incomplete), "incomplete");
  assert.equal(outcomeClass(incomplete), "ecology_incomplete");
  assert.equal(checkState(incomplete).raw, 393);
});

test("false_anchored (incomplete + declared anchored) → 394 (overclaim before floor)", () => {
  assert.equal(computedEcologyState(falseAnchored), "incomplete");
  assert.equal(outcomeClass(falseAnchored), "false_anchored");
  assert.equal(checkState(falseAnchored).raw, 394);
});
