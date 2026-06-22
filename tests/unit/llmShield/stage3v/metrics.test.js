// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  computeExternalMetrics,
  computeContainmentMetrics,
  computeComparativeMetrics,
  runContainment,
} from "../../../../tests/e2e/llm_shield_stage3v_metrics_lib.mjs";
import { buildStage3lCorpus } from "../../../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";
import { recordedFixtureObservations } from "../../../../tools/external-defense-adapters/recordedFixtureExternalDefenseAdapter.mjs";

const corpus = buildStage3lCorpus();
const obs = recordedFixtureObservations();

test("external metrics denominators equal corpus size", () => {
  const m = computeExternalMetrics(obs);
  assert.equal(m.external_allow_rate.split("/")[1], String(obs.length));
  assert.ok("external_detection_by_family" in m);
});
test("containment metrics: zero unsafe outcomes, full coverage", () => {
  const m = computeContainmentMetrics(corpus, obs);
  assert.equal(m.unsafe_tool_execution, 0);
  assert.equal(m.unsafe_output_export, 0);
  assert.equal(m.context_authority_escalation, 0);
  assert.equal(m.evidence_leakage, 0);
  assert.equal(m.receipt_coverage.split("/")[0], m.receipt_coverage.split("/")[1]);
  assert.equal(m.audit_coverage.split("/")[0], m.audit_coverage.split("/")[1]);
});
test("comparative metrics present; external_plus_simurgh ASR numerator is 0", () => {
  const m = computeComparativeMetrics(corpus, obs);
  for (const k of [
    "external_only_targeted_asr",
    "external_plus_simurgh_targeted_asr",
    "over_defence_delta",
  ])
    assert.ok(k in m);
  assert.equal(m.external_plus_simurgh_targeted_asr.split("/")[0], "0");
});
test("runContainment returns one evaluation per case", () => {
  assert.equal(runContainment(corpus).size, corpus.length);
});
