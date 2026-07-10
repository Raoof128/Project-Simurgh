// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkApplicability } from "../../../../tools/simurgh-attestation/stage5f/core/applicability.mjs";
import { validBundle, fixture } from "./_validBundle.mjs";

test("all-evaluated valid bundle -> null", () => {
  assert.equal(checkApplicability(validBundle(), fixture.replayResults), null);
});
test("not_applicable claim without a matrix entry marking it inapplicable -> 275", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "not_applicable";
  c.applicability_ref = "prompt_guard_2_86m|general";
  assert.equal(checkApplicability(b, fixture.replayResults), 275);
});
test("inapplicable obligation typed as not_applicable -> null", () => {
  const b = validBundle();
  b.applicability_matrix[0].applicable = false; // PG2|general
  for (const c of b.cells) {
    if (c.member_id === "prompt_guard_2_86m") {
      delete c.decision_evidence;
      c.status = "not_applicable";
      c.applicability_ref = "prompt_guard_2_86m|general";
    }
  }
  assert.equal(checkApplicability(b, fixture.replayResults), null);
});
test("unsupported_input(token_length) not actually over the limit -> 275", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "unsupported_input";
  c.capability_ref = "prompt_guard_2_86m";
  c.unsupported_reason = "token_length";
  const rr = {
    ...fixture.replayResults,
    "prompt_guard_2_86m|c1": { detector_input_digest: c.detector_input_digest, token_count: 10 },
  };
  assert.equal(checkApplicability(b, rr), 275);
});
test("unsupported_input(token_length) over the limit -> null", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "unsupported_input";
  c.capability_ref = "prompt_guard_2_86m";
  c.unsupported_reason = "token_length";
  const rr = {
    ...fixture.replayResults,
    "prompt_guard_2_86m|c1": { detector_input_digest: c.detector_input_digest, token_count: 999 },
  };
  assert.equal(checkApplicability(b, rr), null);
});
test("missing replay for an unsupported_input claim -> 282", () => {
  const b = validBundle();
  const c = b.cells[0];
  delete c.decision_evidence;
  c.status = "unsupported_input";
  c.capability_ref = "prompt_guard_2_86m";
  c.unsupported_reason = "token_length";
  assert.equal(checkApplicability(b, {}), 282);
});
