// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — schema gate (plan Task 3, raw 268). Exact top-level keys + exact keys for the stable
// nested objects, and a RECURSIVE reject of any AGGREGATE_FORBIDDEN_KEYS at any depth (an aggregate
// field must not be able to hide in a nested object). Separate control from the Lean codomain lemma.
import { VMP_SCHEMAS, AGGREGATE_FORBIDDEN_KEYS, DECISION_SEMANTICS } from "../constants.mjs";

const BUNDLE_KEYS = new Set([
  "schema",
  "attestation_pub_key_pem",
  "provenance_mode",
  "roster_precommit",
  "roster",
  "detector_universe",
  "applicability_matrix",
  "corpus",
  "cells",
  "completeness",
  "coverage",
  "bootstrap_provenance",
  "closeout",
  "capture_provenance",
  "non_claims",
  "signature",
]);
const MEMBER_COMMON_KEYS = [
  "member_id",
  "model_id",
  "hf_revision",
  "detector_role",
  "decision_semantics",
  "reference_threshold",
  "adapter_digest",
  "tokenizer_manifest_digest",
  "truncation_policy_digest",
  "capability_profile",
];
// binary_malicious_softmax members additionally bind the positive-class mapping (5E lesson: a score is
// meaningless unless the positive-class index is pinned). categorical members carry none of these.
const MEMBER_SOFTMAX_KEYS = ["label_map", "positive_class_index", "positive_label"];
const memberKeysFor = (semantics) =>
  new Set(
    semantics === "binary_malicious_softmax"
      ? [...MEMBER_COMMON_KEYS, ...MEMBER_SOFTMAX_KEYS]
      : MEMBER_COMMON_KEYS
  );
const CAPABILITY_KEYS = new Set([
  "supported_languages",
  "max_input_tokens",
  "accepted_input_type",
  "required_runtime_features",
]);
const UNIVERSE_KEYS = new Set(["universe_digest", "candidates"]);
const COVERAGE_KEYS = new Set([
  "universe_size",
  "panel_size",
  "omission_lower_bound",
  "heterogeneous_label_vector",
]);
const COMPLETENESS_KEYS = new Set([
  "representation_complete",
  "evaluation_complete",
  "cell_status_histogram",
]);
const CORPUS_KEYS = new Set(["corpus_digest", "cases"]);
const CASE_KEYS = new Set(["case_id", "case_class", "source_input_digest"]);
const APPLIC_KEYS = new Set(["member_id", "case_class", "applicable"]);

const exact = (obj, keys) =>
  obj &&
  typeof obj === "object" &&
  !Array.isArray(obj) &&
  Object.keys(obj).every((k) => keys.has(k)) &&
  [...keys].every((k) => k in obj);

// Recursively scan for a forbidden aggregate key anywhere.
function hasForbidden(node) {
  if (Array.isArray(node)) return node.some(hasForbidden);
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (AGGREGATE_FORBIDDEN_KEYS.includes(k)) return true;
      if (hasForbidden(node[k])) return true;
    }
  }
  return false;
}

export function checkSchema(bundle) {
  if (!bundle || typeof bundle !== "object" || bundle.schema !== VMP_SCHEMAS.ATTESTATION)
    return 268;
  const keys = Object.keys(bundle);
  if (keys.some((k) => !BUNDLE_KEYS.has(k))) return 268;
  for (const k of BUNDLE_KEYS) if (!(k in bundle)) return 268;
  if (hasForbidden(bundle)) return 268;
  if (!Array.isArray(bundle.roster) || bundle.roster.length === 0) return 268;
  for (const m of bundle.roster) {
    if (!m || typeof m !== "object" || !DECISION_SEMANTICS.includes(m.decision_semantics))
      return 268;
    if (!exact(m, memberKeysFor(m.decision_semantics))) return 268;
    if (!exact(m.capability_profile, CAPABILITY_KEYS)) return 268;
  }
  if (!exact(bundle.detector_universe, UNIVERSE_KEYS)) return 268;
  if (!exact(bundle.coverage, COVERAGE_KEYS)) return 268;
  if (!exact(bundle.completeness, COMPLETENESS_KEYS)) return 268;
  if (!exact(bundle.corpus, CORPUS_KEYS)) return 268;
  if (!Array.isArray(bundle.corpus.cases)) return 268;
  for (const c of bundle.corpus.cases) if (!exact(c, CASE_KEYS)) return 268;
  if (!Array.isArray(bundle.applicability_matrix)) return 268;
  for (const a of bundle.applicability_matrix) if (!exact(a, APPLIC_KEYS)) return 268;
  return null;
}
