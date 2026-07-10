import test from "node:test";
import assert from "node:assert/strict";
import { diversityIndex } from "../../../../tools/simurgh-attestation/stage5g/core/diversity.mjs";

test("two anchored, one subject -> monoculture", () => {
  const r = diversityIndex([
    { proven_rung: "externally_anchored", producer_subject_digest: "sha256:x" },
    { proven_rung: "externally_anchored", producer_subject_digest: "sha256:x" },
  ]);
  assert.equal(r.state, "monoculture");
  assert.equal(r.distinct_anchored_subjects, 1);
});
test("two anchored, two subjects -> diverse", () => {
  const r = diversityIndex([
    { proven_rung: "externally_anchored", producer_subject_digest: "sha256:x" },
    { proven_rung: "externally_anchored", producer_subject_digest: "sha256:y" },
  ]);
  assert.equal(r.state, "diverse");
});
test("fewer than two anchored -> insufficient (rung-1 subjects never counted)", () => {
  const r = diversityIndex([
    { proven_rung: "challenge_bound", producer_subject_digest: "sha256:x" },
    { proven_rung: "externally_anchored", producer_subject_digest: "sha256:y" },
  ]);
  assert.equal(r.state, "insufficient_anchored_evidence");
});
