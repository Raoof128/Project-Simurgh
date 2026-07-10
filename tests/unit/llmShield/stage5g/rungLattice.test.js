import test from "node:test";
import assert from "node:assert/strict";
import { rungLattice } from "../../../../tools/simurgh-attestation/stage5g/core/rungLattice.mjs";
import { overclaim } from "../../../../tools/simurgh-attestation/stage5g/core/overclaim.mjs";

test("lattice: rung0 / rung1 / rung2 by predicate", () => {
  assert.equal(rungLattice({ challengeBound: false }), "distinct_key_only");
  assert.equal(rungLattice({ challengeBound: true }), "challenge_bound");
  assert.equal(
    rungLattice({ challengeBound: true, anchorValid: true, subjectDistinct: true }),
    "externally_anchored"
  );
  assert.equal(
    rungLattice({ challengeBound: true, anchorValid: true, subjectDistinct: false }),
    "challenge_bound"
  );
});

test("overclaim: claimed > proven -> 296; equal or lower -> null", () => {
  assert.equal(overclaim("externally_anchored", "challenge_bound"), 296);
  assert.equal(overclaim("challenge_bound", "challenge_bound"), null);
  assert.equal(overclaim("distinct_key_only", "challenge_bound"), null); // lower claim over stronger evidence accepted
});
