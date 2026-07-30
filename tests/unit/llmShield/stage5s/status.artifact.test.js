// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 13 — `equivocation_artifact_status`, typed absence (§3.6).
//
// THE ABSENCE IS TYPED BECAUSE A NULL LIES BY OMISSION. A reader who sees
// `absent_comparison_unavailable` learns that nothing was compared. A reader who sees a null field
// learns nothing and assumes the best — and the sentence they assume, "no fork existed", is the one
// sentence this stage must never let anybody write by accident.
//
// The five variants exist so that the difference between "we compared and found one history",
// "we compared and could not tell", and "we compared nothing" survives into the attestation.

import assert from "node:assert/strict";
import test from "node:test";

import {
  EQUIVOCATION_ARTIFACT_STATUS,
  equivocationArtifactStatusOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/status.mjs";

test("[5s-t13] the five §3.6 variants, pinned as a set", () => {
  assert.deepEqual([...EQUIVOCATION_ARTIFACT_STATUS].sort(), [
    "absent_comparison_indeterminate",
    "absent_comparison_unavailable",
    "absent_compatible",
    "absent_same_checkpoint",
    "present",
  ]);
  assert.ok(Object.isFrozen(EQUIVOCATION_ARTIFACT_STATUS));
});

test("[5s-t13] a detected fork is `present`", () => {
  assert.equal(
    equivocationArtifactStatusOf({
      comparison_status: "equivocation_detected",
      relations: ["incompatible"],
    }),
    "present"
  );
});

test("[5s-t13] one checkpoint under many envelopes is absent_same_checkpoint", () => {
  assert.equal(
    equivocationArtifactStatusOf({
      comparison_status: "no_conflict_in_committed_comparison_set",
      relations: ["same_checkpoint", "same_checkpoint"],
    }),
    "absent_same_checkpoint"
  );
});

test("[5s-t13] a clean set containing a compatible pair is absent_compatible", () => {
  // The distinction is real evidence: "these are the same object" and "these are different objects
  // on one authorised history" are different findings, and collapsing them loses the second.
  assert.equal(
    equivocationArtifactStatusOf({
      comparison_status: "no_conflict_in_committed_comparison_set",
      relations: ["same_checkpoint", "compatible"],
    }),
    "absent_compatible"
  );
});

test("[5s-t13] nothing compared is absent_comparison_unavailable", () => {
  assert.equal(
    equivocationArtifactStatusOf({ comparison_status: "comparison_unavailable", relations: [] }),
    "absent_comparison_unavailable"
  );
});

test("[5s-t13] short ancestry is absent_comparison_indeterminate, never absent_compatible", () => {
  assert.equal(
    equivocationArtifactStatusOf({
      comparison_status: "comparison_indeterminate",
      relations: ["indeterminate"],
    }),
    "absent_comparison_indeterminate"
  );
});

test("[5s-t13] the status is NEVER null, undefined, or empty — for any input", () => {
  const inputs = [
    undefined,
    null,
    {},
    [],
    "equivocation_detected",
    { comparison_status: null, relations: null },
    { comparison_status: "no_conflict_in_committed_comparison_set" },
    { relations: ["same_checkpoint"] },
  ];
  for (const input of inputs) {
    const r = equivocationArtifactStatusOf(input);
    assert.ok(
      EQUIVOCATION_ARTIFACT_STATUS.includes(r),
      `${JSON.stringify(input)} produced ${JSON.stringify(r)}`
    );
  }
});

test("[5s-t13] an unrecognised comparison status fails closed to `nothing was compared`", () => {
  // The variant that claims least. Guessing `absent_same_checkpoint` from an unknown state would be
  // manufacturing the clean reading this stage exists to make unavailable.
  for (const unknown of ["probably_fine", "clean", "", 7]) {
    assert.equal(
      equivocationArtifactStatusOf({ comparison_status: unknown, relations: ["same_checkpoint"] }),
      "absent_comparison_unavailable"
    );
  }
});

test("[5s-t13] a clean status with NO relations is unavailable, not same_checkpoint", () => {
  // Zero relations means zero comparisons. Reading that as "one checkpoint" would let an empty
  // comparison set produce the strongest absence variant.
  assert.equal(
    equivocationArtifactStatusOf({
      comparison_status: "no_conflict_in_committed_comparison_set",
      relations: [],
    }),
    "absent_comparison_unavailable"
  );
});

test("[5s-t13] `present` is reported only for a detected fork, never inferred from relations", () => {
  // A relation list containing `incompatible` under a non-fork status is a contradiction between the
  // two, and the artifact status must not resolve it silently in favour of the stronger claim.
  assert.notEqual(
    equivocationArtifactStatusOf({
      comparison_status: "comparison_unavailable",
      relations: ["incompatible"],
    }),
    "present"
  );
});
