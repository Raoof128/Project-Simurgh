// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { META_SET_SCHEMA_V2 } from "../../../../tools/simurgh-extraction/metaSetV2.mjs";
import {
  DETECTOR_ID,
  PREVIOUS_DETECTOR_ID,
  THRESHOLD_STRONG,
  matchSignalsV2,
  firedSignalIds,
  decideV2,
  runDetectorV2,
} from "../../../../tools/simurgh-extraction/detectorV2.mjs";

const hh = (s) => "sha256:" + crypto.createHash("sha256").update(s).digest("hex");
const TF = ["code_generation", "data_analysis", "summarisation", "translation", "qa", "planning", "other"];
const CAP = ["tool_use", "coding", "reasoning", "translation", "summarisation", "general"];
const varied = (i) => ({ task_family: TF[i % TF.length], capability_tag: CAP[i % CAP.length] });
function row(id, o = {}) {
  return {
    run_id: "s3u_run_" + String(id).padStart(3, "0"),
    actor_cluster_hash: hh("actor_a"),
    session_cluster_hash: hh("s" + id),
    normalized_prompt_hash: hh("np" + id),
    prompt_template_hash: hh("tp" + id),
    task_family: "code_generation",
    capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_" + String((id % 998) + 1).padStart(3, "0"),
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...o,
  };
}
const mset = (runs) => ({
  type: META_SET_SCHEMA_V2,
  set_id: "t",
  set_provenance: "synthetic_reference",
  live_traffic_used: false,
  identity_data_used: false,
  raw_content_used: false,
  runs,
});

test("identity constants", () => {
  assert.equal(DETECTOR_ID, "stage3u_extraction_detector_v2");
  assert.equal(PREVIOUS_DETECTOR_ID, "stage3t_frozen_detector_v1");
  assert.equal(THRESHOLD_STRONG, 2);
});

test("decideV2 is total over strong count", () => {
  assert.deepEqual(decideV2(0), { decision: "no_pattern_observed", attestation_claim: "none" });
  assert.deepEqual(decideV2(1), { decision: "single_signal_observed", attestation_claim: "manual_review_only" });
  assert.deepEqual(decideV2(2), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
});

test("A10: structural + volume → single (volume cannot corroborate)", () => {
  // shared template (structural) + 11 rows (high_request_count → volume); VARY task/cap so
  // targeting does NOT fire (the fix-#1 correction). 1 actor, spread time buckets.
  const runs = Array.from({ length: 11 }, (_, i) =>
    row(i, { prompt_template_hash: hh("shared"), ...varied(i) })
  );
  const res = runDetectorV2(mset(runs));
  assert.equal(res.strong_family_count, 1);
  assert.deepEqual(res.matched_strong_families, ["structural"]);
  assert.deepEqual(res.matched_contextual_families, ["volume"]);
  assert.equal(res.decision, "single_signal_observed");
});

test("0 strong + contextual only → single_signal_observed", () => {
  // 11 varied rows, no template/prompt cluster, no dominance → only volume(high count)
  const runs = Array.from({ length: 11 }, (_, i) => row(i, varied(i)));
  const res = runDetectorV2(mset(runs));
  assert.equal(res.strong_family_count, 0);
  assert.deepEqual(res.matched_contextual_families, ["volume"]);
  assert.equal(res.decision, "single_signal_observed");
});

test("extraction: structural + behavioural → extraction", () => {
  const runs = Array.from({ length: 4 }, (_, i) =>
    row(i, { normalized_prompt_hash: hh("same"), cot_elicitation_flag: true, ...varied(i) })
  );
  const res = runDetectorV2(mset(runs));
  assert.deepEqual(res.matched_strong_families, ["structural", "behavioural"]);
  assert.equal(res.decision, "extraction_pattern_observed");
  assert.equal(res.detector_id, DETECTOR_ID);
  assert.equal(res.previous_detector_id, PREVIOUS_DETECTOR_ID);
  assert.match(res.meta_set_digest, /^sha256:/);
  assert.ok(res.non_claims.includes("match_is_not_accusation"));
});

test("firedSignalIds returns only true signals", () => {
  assert.deepEqual(firedSignalIds({ a: true, b: false }), ["a"]);
});

test("clean varied small set → no pattern", () => {
  const res = runDetectorV2(mset([row(1, varied(1)), row(2, varied(2))]));
  assert.equal(res.decision, "no_pattern_observed");
});
