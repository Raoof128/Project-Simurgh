// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runExtractionSelfProofV2 } from "../../../../tools/simurgh-extraction/selfProofV2.mjs";

test("self-proof v2: all fixtures pass, all failure counters zero", () => {
  const { summary, fixtures } = runExtractionSelfProofV2();
  assert.equal(summary.all_passed, true);
  for (const k of [
    "benign_escalation_failures",
    "single_family_escalations",
    "single_strong_plus_volume_escalations",
    "volume_corroboration_failures",
    "distinct_family_double_count_failures",
    "metadata_payload_acceptance_failures",
    "invalid_bucket_acceptance_failures",
    "invalid_hash_acceptance_failures",
    "intent_claims_rendered",
    "decision_reproduction_failures",
    "duplicate_run_id_failures",
  ])
    assert.equal(summary[k], 0, k);
  assert.ok(fixtures.length >= 20);
  assert.ok(fixtures.every((f) => f.passed));
});

test("benign-heavy-power-user does not escalate", () => {
  const f = runExtractionSelfProofV2().fixtures.find((x) => x.name === "benign-heavy-power-user");
  assert.ok(f && f.passed);
  assert.ok(["no_pattern_observed", "single_signal_observed"].includes(f.detail));
});

test("the A10 regressions explicitly do NOT escalate", () => {
  const { fixtures } = runExtractionSelfProofV2();
  for (const name of [
    "benign-template-plus-volume",
    "benign-single-capability-plus-volume",
    "benign-behavioural-plus-volume",
  ]) {
    const f = fixtures.find((x) => x.name === name);
    assert.ok(f && f.passed, name);
    assert.equal(f.detail, "single_signal_observed");
  }
});

test("the documented limitation fixture DOES escalate (named, not hidden)", () => {
  const f = runExtractionSelfProofV2().fixtures.find((x) => x.name === "strong-plus-strong-benign-collision");
  assert.ok(f && f.passed);
  assert.equal(f.detail, "extraction_pattern_observed");
});
