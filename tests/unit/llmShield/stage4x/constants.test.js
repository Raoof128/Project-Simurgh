// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR constants (plan Task 2).
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../../../../tools/simurgh-attestation/stage4x/constants.mjs";

test("schema ids are frozen", () => {
  assert.equal(C.VLR_CORPUS_SCHEMA, "simurgh.vlr.corpus.v1");
  assert.equal(C.VLR_LEDGER_SCHEMA, "simurgh.vlr.ledger.v1");
  assert.equal(C.VLR_ATTESTATION_SCHEMA, "simurgh.vlr.attestation.v1");
  assert.equal(C.VLR_METAMORPHIC_TABLE_ID, "vlr.metamorphic.v1");
  assert.equal(C.VLR_RUBRIC_ID, "vlr.claim_rubric.v1");
});

test("no span/authorise surface leaks into VLR", () => {
  const keys = Object.keys(C).join(" ");
  assert.ok(!/SPAN|authorise/i.test(keys));
});

test("six families + provenance tags", () => {
  assert.deepEqual(
    [...C.VLR_FAMILIES],
    [
      "digit_to_word_quantifier",
      "exact_to_hedged",
      "percent_to_fraction_phrase",
      "date_to_relative",
      "count_to_bulk_phrase",
      "true_semantic_paraphrase",
    ]
  );
  assert.deepEqual([...C.VLR_PROVENANCE], ["enumerated", "incident_sourced"]);
});

test("coverage families mirror the v1 lexical rule ids", () => {
  assert.deepEqual(
    [...C.VLR_V1_COVERAGE_FAMILIES],
    ["digit", "number_word", "percent", "month", "quantifier"]
  );
});

test("non-claims: 9, [8] is the slip-rate field-performance one", () => {
  assert.equal(C.VLR_NON_CLAIMS.length, 9);
  assert.equal(C.VLR_NON_CLAIMS[8], "not_a_claim_that_slip_rate_is_gate_field_performance");
  assert.ok(C.VLR_NON_CLAIMS.includes("not_a_claim_of_model_safety"));
});

test("limitations: 6, incl. corpus-constructible + process-independent", () => {
  assert.equal(C.VLR_KNOWN_LIMITATIONS.length, 6);
  assert.ok(C.VLR_KNOWN_LIMITATIONS.some((l) => /corpus_constructible/.test(l)));
  assert.ok(C.VLR_KNOWN_LIMITATIONS.some((l) => /process_independent/.test(l)));
});

test("reserved slots incl. the 4Y/4Z sockets; superseded slot recorded", () => {
  for (const s of [
    "irreducible_semantic_residue_deferred",
    "multilingual_ruleset_deferred",
    "narrative_version_diff_deferred",
    "transparency_report_profile_deferred",
    "residue_over_submitted_narrative_deferred",
    "cross_gate_residue_benchmark_deferred",
  ])
    assert.ok(C.VLR_RESERVED_SLOTS.includes(s), s);
  assert.equal(
    C.VLR_SUPERSEDED_SLOTS.semantic_leakage_adversary_deferred,
    "semantic_residue_measurement_deferred"
  );
  assert.equal(C.VLR_PAID_SLOT, "semantic_residue_measurement_deferred");
});

test("rails include the v2-measurement-only and monotonicity-recompute honesty", () => {
  assert.ok(C.VLR_RAILS.includes("v2_is_a_measurement_ruleset_not_a_deployed_policy"));
  assert.ok(C.VLR_RAILS.includes("monotonicity_recomputed_never_trusts_the_stored_flag"));
});
