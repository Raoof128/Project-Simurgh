import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveForVerify } from "../../../../tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs";
import { computeContainmentMetrics } from "../../../../tests/e2e/llm_shield_stage3v_metrics_lib.mjs";

// Flipping every external verdict must not change the containment summary: the containment tail
// reuses evaluateStage3lCase(fixture) READ-ONLY and never consumes the external verdict.
test("containment is invariant to the external advisory verdict", () => {
  const d = deriveForVerify();
  const flipped = d.observations.map((o) => ({
    ...o,
    normalised_verdict: o.normalised_verdict === "block" ? "allow" : "block",
  }));
  const a = computeContainmentMetrics(d.corpus, d.observations);
  const b = computeContainmentMetrics(d.corpus, flipped);
  assert.deepEqual(a.unsafe_tool_execution, b.unsafe_tool_execution);
  assert.deepEqual(a.unsafe_output_export, b.unsafe_output_export);
  assert.deepEqual(a.context_authority_escalation, b.context_authority_escalation);
});
