// SPDX-License-Identifier: AGPL-3.0-or-later
// Value-level metadata grammar (A9 fix). Metadata-only is enforced as a grammar, not a
// convention: every string field must match a strict enum or regex, so raw payloads
// cannot hide inside an allowed tag. The grammar is part of the detector identity, so it
// is deep-frozen (rules and enum arrays).
import { canonicalJson, sha256Hex } from "../simurgh-attestation/canonicalise.mjs";

function deepFreeze(obj) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === "object") deepFreeze(v);
  }
  return Object.freeze(obj);
}

const HASH = "^sha256:[0-9a-f]{64}$";
export const METADATA_GRAMMAR = deepFreeze({
  run_id: { type: "regex", pattern: "^s3u_run_[0-9]{3}$" },
  actor_cluster_hash: { type: "regex", pattern: HASH },
  session_cluster_hash: { type: "regex", pattern: HASH },
  normalized_prompt_hash: { type: "regex", pattern: HASH },
  prompt_template_hash: { type: "regex", pattern: HASH },
  task_family: {
    type: "enum",
    values: ["code_generation", "data_analysis", "summarisation", "translation", "qa", "planning", "other"],
  },
  capability_tag: {
    type: "enum",
    values: ["tool_use", "coding", "reasoning", "translation", "summarisation", "general"],
  },
  input_tokens_bucket: { type: "enum", values: ["0-1k", "1k-2k", "2k-4k", "4k-8k", "8k-plus"] },
  output_tokens_bucket: { type: "enum", values: ["0-1k", "1k-2k", "2k-4k", "4k-8k", "8k-plus"] },
  time_bucket: { type: "regex", pattern: "^bucket_[0-9]{3}$" },
  cot_elicitation_flag: { type: "boolean" },
  tool_use_request_shape: { type: "boolean" },
});

export const ALLOWED_ROW_FIELDS_V2 = Object.freeze(Object.keys(METADATA_GRAMMAR));

export function validateRowGrammar(row) {
  if (!row || typeof row !== "object") throw new Error("metadata_grammar_violation");
  const allowed = new Set(ALLOWED_ROW_FIELDS_V2);
  for (const k of Object.keys(row)) {
    if (!allowed.has(k)) throw new Error("forbidden_metadata_field");
  }
  for (const [field, rule] of Object.entries(METADATA_GRAMMAR)) {
    const v = row[field];
    if (rule.type === "boolean") {
      if (typeof v !== "boolean") throw new Error("metadata_grammar_violation");
    } else if (rule.type === "enum") {
      if (typeof v !== "string" || !rule.values.includes(v)) throw new Error("metadata_grammar_violation");
    } else if (rule.type === "regex") {
      if (typeof v !== "string" || !new RegExp(rule.pattern).test(v)) throw new Error("metadata_grammar_violation");
    }
  }
  return true;
}

export function metadataGrammarDigest() {
  return sha256Hex(canonicalJson(METADATA_GRAMMAR));
}
