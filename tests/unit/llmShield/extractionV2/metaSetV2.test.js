// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  META_SET_SCHEMA_V2,
  validateMetaSetV2,
  metaSetDigestV2,
} from "../../../../tools/simurgh-extraction/metaSetV2.mjs";

const H = "sha256:" + "b".repeat(64);
function row(id, o = {}) {
  return {
    run_id: id,
    actor_cluster_hash: H,
    session_cluster_hash: H,
    normalized_prompt_hash: H,
    prompt_template_hash: H,
    task_family: "code_generation",
    capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_001",
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...o,
  };
}
function set(runs, o = {}) {
  return {
    type: META_SET_SCHEMA_V2,
    set_id: "stage3u_reference_set",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs,
    ...o,
  };
}

test("accepts a clean v2 set", () => {
  assert.equal(validateMetaSetV2(set([row("s3u_run_001"), row("s3u_run_002")])), true);
});
test("rejects bad provenance", () => {
  assert.throws(
    () => validateMetaSetV2(set([row("s3u_run_001")], { live_traffic_used: true })),
    /meta_set_provenance_invalid/
  );
});
test("rejects wrong schema type", () => {
  assert.throws(
    () => validateMetaSetV2(set([row("s3u_run_001")], { type: "x" })),
    /meta_set_invalid/
  );
});
test("rejects non-object", () => {
  assert.throws(() => validateMetaSetV2(null), /meta_set_invalid/);
});
test("rejects duplicate run_id", () => {
  assert.throws(
    () => validateMetaSetV2(set([row("s3u_run_001"), row("s3u_run_001")])),
    /meta_set_invalid/
  );
});
test("rejects empty runs", () => {
  assert.throws(() => validateMetaSetV2(set([])), /meta_set_invalid/);
});
test("rejects grammar violation in a row (A9)", () => {
  assert.throws(
    () => validateMetaSetV2(set([row("s3u_run_001", { capability_tag: "PAYLOAD" })])),
    /metadata_grammar_violation/
  );
});
test("digest is order-independent, full-header, single-prefixed", () => {
  const a = set([row("s3u_run_001"), row("s3u_run_002")]);
  const b = set([row("s3u_run_002"), row("s3u_run_001")]);
  assert.match(metaSetDigestV2(a), /^sha256:[0-9a-f]{64}$/);
  assert.equal(metaSetDigestV2(a), metaSetDigestV2(b));
  assert.notEqual(
    metaSetDigestV2(a),
    metaSetDigestV2(set([row("s3u_run_001")], { set_id: "other" }))
  );
});
