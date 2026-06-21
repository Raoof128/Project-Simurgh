// SPDX-License-Identifier: AGPL-3.0-or-later
// Synthetic, metadata-only reference-set schema + validation + order-independent digest.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

export const META_SET_SCHEMA = "simurgh.capability_extraction.meta_set.v1";

export const ALLOWED_ROW_FIELDS = Object.freeze([
  "run_id",
  "actor_cluster_hash",
  "session_cluster_hash",
  "normalized_prompt_hash",
  "prompt_template_hash",
  "task_family",
  "capability_tag",
  "input_tokens_bucket",
  "output_tokens_bucket",
  "time_bucket",
  "cot_elicitation_flag",
  "tool_use_request_shape",
]);

export function validateMetaSet(set) {
  if (!set || typeof set !== "object") throw new Error("meta_set_invalid");
  if (set.type !== META_SET_SCHEMA) throw new Error("meta_set_invalid");
  if (
    set.set_provenance !== "synthetic_reference" ||
    set.live_traffic_used !== false ||
    set.identity_data_used !== false ||
    set.raw_content_used !== false
  ) {
    throw new Error("meta_set_provenance_invalid");
  }
  if (!Array.isArray(set.runs) || set.runs.length === 0) throw new Error("meta_set_invalid");
  const allowed = new Set(ALLOWED_ROW_FIELDS);
  const seen = new Set();
  for (const r of set.runs) {
    if (!r || typeof r !== "object") throw new Error("meta_set_invalid");
    for (const k of Object.keys(r)) {
      if (!allowed.has(k)) throw new Error("forbidden_metadata_field");
    }
    if (typeof r.run_id !== "string" || r.run_id.length === 0) throw new Error("meta_set_invalid");
    for (const h of [
      "actor_cluster_hash",
      "session_cluster_hash",
      "normalized_prompt_hash",
      "prompt_template_hash",
    ]) {
      if (typeof r[h] !== "string" || !r[h].startsWith("sha256:")) throw new Error("meta_set_invalid");
    }
    if (typeof r.cot_elicitation_flag !== "boolean" || typeof r.tool_use_request_shape !== "boolean")
      throw new Error("meta_set_invalid");
    if (seen.has(r.run_id)) throw new Error("meta_set_invalid");
    seen.add(r.run_id);
  }
  return true;
}

// Bind the FULL synthetic/offline provenance header + sorted rows, not only the rows.
export function normaliseMetaSet(set) {
  validateMetaSet(set);
  return {
    type: set.type,
    set_id: set.set_id,
    set_provenance: set.set_provenance,
    live_traffic_used: set.live_traffic_used,
    identity_data_used: set.identity_data_used,
    raw_content_used: set.raw_content_used,
    runs: [...set.runs].sort((a, b) => a.run_id.localeCompare(b.run_id)),
  };
}

export function metaSetDigest(set) {
  return sha256Hex(canonicalJson(normaliseMetaSet(set)));
}
