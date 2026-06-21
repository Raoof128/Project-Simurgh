// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { META_SET_SCHEMA } from "../../../../tools/simurgh-extraction/metaSet.mjs";
import {
  DETECTOR_ID,
  THRESHOLD,
  matchSignals,
  firedSignalIds,
  decide,
  runDetector,
} from "../../../../tools/simurgh-extraction/detector.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:actor_a",
    session_cluster_hash: "sha256:session_" + id,
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "tf_" + id,
    capability_tag: "cap_" + id,
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "tb_" + id,
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function set(rows) {
  return {
    type: META_SET_SCHEMA,
    set_id: "t",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
  };
}

test("identity constants are frozen at v1 / threshold 2", () => {
  assert.equal(DETECTOR_ID, "stage3t_frozen_detector_v1");
  assert.equal(THRESHOLD, 2);
});

test("decide is a total function over distinct family count", () => {
  assert.deepEqual(decide(0), { decision: "no_pattern_observed", attestation_claim: "none" });
  assert.deepEqual(decide(1), { decision: "single_signal_observed", attestation_claim: "manual_review_only" });
  assert.deepEqual(decide(2), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
  assert.deepEqual(decide(5), { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" });
});

test("repetition cluster fires structural only (double-count trap)", () => {
  // 4 rows, identical normalized AND template hash → both structural members fire → 1 family
  const rows = [0, 1, 2, 3].map((i) =>
    row("r" + i, { normalized_prompt_hash: "sha256:same", prompt_template_hash: "sha256:same_t" })
  );
  const m = matchSignals(set(rows));
  assert.equal(m.repetition_cluster, true);
  assert.equal(m.template_prefix_cluster, true);
  const res = runDetector(set(rows));
  assert.equal(res.distinct_family_count, 1);
  assert.deepEqual(res.matched_families, ["structural"]);
  assert.equal(res.decision, "single_signal_observed");
});

test("structural + behavioural = extraction", () => {
  const rows = [0, 1, 2, 3].map((i) =>
    row("r" + i, { normalized_prompt_hash: "sha256:same", cot_elicitation_flag: true })
  );
  const res = runDetector(set(rows));
  assert.deepEqual(res.matched_families, ["structural", "behavioural"]);
  assert.equal(res.decision, "extraction_pattern_observed");
  assert.equal(res.detector_id, DETECTOR_ID);
  assert.match(res.meta_set_digest, /^sha256:/);
  assert.ok(res.non_claims.includes("match_is_not_accusation"));
});

test("firedSignalIds returns only true signals", () => {
  assert.deepEqual(firedSignalIds({ a: true, b: false, c: true }).sort(), ["a", "c"]);
});

test("clean varied set → no pattern", () => {
  const rows = [0, 1].map((i) => row("r" + i));
  const res = runDetector(set(rows));
  assert.equal(res.decision, "no_pattern_observed");
  assert.equal(res.distinct_family_count, 0);
});
