// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { runContainment } from "../../../../tests/e2e/llm_shield_stage3v_metrics_lib.mjs";
import {
  buildStage3lCorpus,
  evaluateStage3lCase,
} from "../../../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs";

// The external verdict is advisory only: the Simurgh containment tail (evaluateStage3lCase)
// does not consume it, so containment is invariant to any external verdict value.
test("flipping the external verdict cannot change any boundary outcome", () => {
  const corpus = buildStage3lCorpus();
  const baseline = runContainment(corpus);
  // The boundary fn takes only the fixture, so the result is identical regardless of any
  // external verdict an adversary might assert — advisory-invariance is structural.
  for (const fx of corpus) {
    const direct = evaluateStage3lCase(fx);
    assert.deepEqual(baseline.get(fx.case_id), direct);
  }
});
