// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import {
  META_SET_SCHEMA,
  validateMetaSet,
  metaSetDigest,
} from "../../../../tools/simurgh-extraction/metaSet.mjs";

function row(id, over = {}) {
  return {
    run_id: id,
    actor_cluster_hash: "sha256:synthetic_actor_a",
    session_cluster_hash: "sha256:synthetic_session_a",
    normalized_prompt_hash: "sha256:np_" + id,
    prompt_template_hash: "sha256:tp_" + id,
    task_family: "code_generation",
    capability_tag: "tool_use",
    input_tokens_bucket: "1k-2k",
    output_tokens_bucket: "2k-4k",
    time_bucket: "bucket_001",
    cot_elicitation_flag: false,
    tool_use_request_shape: false,
    ...over,
  };
}
function set(rows, over = {}) {
  return {
    type: META_SET_SCHEMA,
    set_id: "stage3t_reference_set",
    set_provenance: "synthetic_reference",
    live_traffic_used: false,
    identity_data_used: false,
    raw_content_used: false,
    runs: rows,
    ...over,
  };
}

test("validateMetaSet accepts a clean synthetic set", () => {
  assert.equal(validateMetaSet(set([row("s3t_run_001"), row("s3t_run_002")])), true);
});

test("validateMetaSet rejects wrong provenance", () => {
  assert.throws(() => validateMetaSet(set([row("a")], { set_provenance: "live" })), /meta_set_provenance_invalid/);
});

test("validateMetaSet rejects live/identity/raw flags", () => {
  assert.throws(() => validateMetaSet(set([row("a")], { live_traffic_used: true })), /meta_set_provenance_invalid/);
  assert.throws(() => validateMetaSet(set([row("a")], { identity_data_used: true })), /meta_set_provenance_invalid/);
  assert.throws(() => validateMetaSet(set([row("a")], { raw_content_used: true })), /meta_set_provenance_invalid/);
});

test("validateMetaSet rejects duplicate run_id", () => {
  assert.throws(() => validateMetaSet(set([row("dup"), row("dup")])), /meta_set_invalid/);
});

test("validateMetaSet rejects an unknown row field", () => {
  assert.throws(() => validateMetaSet(set([row("a", { raw_prompt: "hello" })])), /forbidden_metadata_field/);
});

test("validateMetaSet rejects an empty run set", () => {
  assert.throws(() => validateMetaSet(set([])), /meta_set_invalid/);
});

test("metaSetDigest is order-independent and sha256-prefixed (single prefix)", () => {
  const a = set([row("s3t_run_001"), row("s3t_run_002")]);
  const b = set([row("s3t_run_002"), row("s3t_run_001")]);
  assert.match(metaSetDigest(a), /^sha256:[0-9a-f]{64}$/); // exactly one prefix, not sha256:sha256:
  assert.equal(metaSetDigest(a), metaSetDigest(b));
});

test("metaSetDigest binds the full set header, not only rows", () => {
  const a = set([row("s3t_run_001")]);
  const b = set([row("s3t_run_001")], { set_id: "different_set" });
  assert.notEqual(metaSetDigest(a), metaSetDigest(b));
});
