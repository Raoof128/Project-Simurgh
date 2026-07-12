// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q schema belt (raw 364). Runs BEFORE makeCtx so a malformed bundle/cfg is 364, never a
// 383 throw. NEVER throws itself. Also the G13-style adequacy-vocabulary lexical screen (fails closed).
import { R } from "./result.mjs";
import { DOMAINS, ADEQUACY_FORBIDDEN_KEYS } from "../constants.mjs";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Recursively reject any object KEY drawn from the bounded adequacy vocabulary (bounded lexical screen,
// not a semantic proof — the structural guarantee is the Lean non-adequacy bit).
function hasAdequacyKey(v) {
  if (Array.isArray(v)) return v.some(hasAdequacyKey);
  if (isObj(v)) {
    for (const k of Object.keys(v)) {
      if (ADEQUACY_FORBIDDEN_KEYS.has(k)) return true;
      if (hasAdequacyKey(v[k])) return true;
    }
  }
  return false;
}

export function checkBundleSchema(bundle) {
  if (!isObj(bundle)) return R(364, "bundle_not_object");
  if (bundle.schema_version !== DOMAINS.bundle) return R(364, "bundle_schema_version");
  for (const k of [
    "campaign_id",
    "commitment_session_id",
    "ceremony_id",
    "vuc",
    "ceremony_contract",
    "review_access_authorisation_receipt",
    "reserved_slots",
    "signatures",
  ]) {
    if (!(k in bundle)) return R(364, `bundle_missing_${k}`);
  }
  const cc = bundle.ceremony_contract;
  if (!isObj(cc)) return R(364, "ceremony_contract_not_object");
  for (const k of [
    "review_window_policy_digest",
    "anchor_policy_digest",
    "quorum_policy_digest",
    "trust_domain_registry_digest",
    "declared_release_surface_digest",
    "gate_identity_policy_digest",
  ]) {
    if (typeof cc[k] !== "string") return R(364, `ceremony_contract_missing_${k}`);
  }
  if (!Array.isArray(bundle.anchors) || bundle.anchors.length < 1) return R(364, "anchors_empty");
  for (const a of bundle.anchors) {
    if (!isObj(a)) return R(364, "anchor_not_object");
    if (typeof a.anchor_type !== "string") return R(364, "anchor_type_missing");
    if (a.verifier_result !== null) return R(364, "anchor_verifier_result_prefilled"); // S6
  }
  if (!Array.isArray(bundle.declared_releases)) return R(364, "declared_releases_not_array");
  const rcv = bundle.review_access_authorisation_receipt;
  if (!isObj(rcv) || !isObj(rcv.binds)) return R(364, "receipt_malformed"); // binds = {field: digest}
  if (typeof rcv.start_capability_root_digest !== "string") return R(364, "receipt_no_capability");
  if (hasAdequacyKey(bundle)) return R(364, "adequacy_vocabulary_forbidden");
  return null;
}

export function checkConfigSchema(cfg) {
  if (!isObj(cfg)) return R(364, "config_not_object"); // undefined/null/array → 364 (P0-7a), not 383
  if (cfg.schema_version !== DOMAINS.config) return R(364, "config_schema_version");
  if (typeof cfg.profile !== "string") return R(364, "config_no_profile");
  if (typeof cfg.policy_digest !== "string") return R(364, "config_no_policy_digest");
  if (hasAdequacyKey(cfg)) return R(364, "config_adequacy_vocabulary_forbidden");
  return null;
}
