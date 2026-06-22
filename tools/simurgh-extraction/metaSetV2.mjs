// SPDX-License-Identifier: AGPL-3.0-or-later
// v2 metadata-set: schema + provenance + unique run_id + per-row grammar; full-header,
// order-independent digest.
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";
import { validateRowGrammar } from "./metadataGrammar.mjs";

export const META_SET_SCHEMA_V2 = "simurgh.capability_extraction.meta_set.v2";

export function validateMetaSetV2(set) {
  if (!set || typeof set !== "object") throw new Error("meta_set_invalid");
  if (set.type !== META_SET_SCHEMA_V2) throw new Error("meta_set_invalid");
  if (
    set.set_provenance !== "synthetic_reference" ||
    set.live_traffic_used !== false ||
    set.identity_data_used !== false ||
    set.raw_content_used !== false
  ) {
    throw new Error("meta_set_provenance_invalid");
  }
  if (!Array.isArray(set.runs) || set.runs.length === 0) throw new Error("meta_set_invalid");
  const seen = new Set();
  for (const r of set.runs) {
    validateRowGrammar(r); // throws metadata_grammar_violation / forbidden_metadata_field
    if (seen.has(r.run_id)) throw new Error("meta_set_invalid");
    seen.add(r.run_id);
  }
  return true;
}

export function normaliseMetaSetV2(set) {
  validateMetaSetV2(set);
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

export function metaSetDigestV2(set) {
  return sha256Hex(canonicalJson(normaliseMetaSetV2(set)));
}
