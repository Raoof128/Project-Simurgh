// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAttestationV2,
  deriveForVerifyV2,
} from "../../../../tools/simurgh-extraction/simurgh-extraction-v2.mjs";

test("main attestation binds digests, decision extraction across >=2 strong families", async () => {
  const { attestation: a } = await deriveForVerifyV2();
  assert.equal(a.detector_id, "stage3u_extraction_detector_v2");
  assert.equal(a.previous_detector_id, "stage3t_frozen_detector_v1");
  assert.equal(a.decision, "extraction_pattern_observed");
  assert.ok(a.strong_family_count >= 2);
  assert.deepEqual(a.matched_contextual_families, []);
  assert.match(a.meta_set_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(a.detector_result_digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(a.redteam_regression_result_digest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(a.red_team_hardening.redteam_regression_decision, "single_signal_observed");
  assert.ok(
    a.known_limitations.includes(
      "benign_mono_task_plus_shared_template_can_present_two_strong_families"
    )
  );
  assert.ok(a.rendered_summary.includes("manual review"));
});

test("regression result is single_signal_observed (A10 fixed)", async () => {
  const { regressionResult: r } = await deriveForVerifyV2();
  assert.equal(r.decision, "single_signal_observed");
  assert.deepEqual(r.matched_contextual_families, ["volume"]);
});

test("buildAttestationV2 is pure over the committed sets", async () => {
  const { mainSet, regressionSet } = await deriveForVerifyV2();
  assert.equal(
    JSON.stringify(buildAttestationV2(mainSet, regressionSet)),
    JSON.stringify(buildAttestationV2(mainSet, regressionSet))
  );
});
