// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — VRC schema (raw 332). Two TOTAL functions (never throw — a parse/canonical failure
// RETURNS 332): checkBundleSchema(bundle) and checkConfigSchema(cfg). There is no 317-style
// external-config code in VRC — a malformed cfg is a 332; an anchor MISMATCH is a 333 (context.mjs).
import { R } from "./result.mjs";
import { canonicalJson } from "./digests.mjs";
import { CORRECTNESS_FORBIDDEN_KEYS, VRC_RESERVED_ARTIFACT_SLOTS } from "../constants.mjs";

const REQUIRED_BUNDLE_KEYS = [
  "schema_version",
  "vpc_ref",
  "producer_ref",
  "rating_scale",
  "rating_obligation_root",
  "epoch_tickets",
  "reviewer_ratings",
  "producer_ratings",
  "contest_history",
  "producer_responses",
  "concurrences",
  "reviewer_rebuttals",
  "projections",
];

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function checkBundleSchema(bundle) {
  try {
    if (!isObj(bundle)) return R(332, "bundle_not_object");
    for (const k of REQUIRED_BUNDLE_KEYS) {
      if (!(k in bundle)) return R(332, "missing_required_key", { key: k });
    }
    // canonical round-trip (guards non-serialisable / cyclic input)
    JSON.parse(canonicalJson(bundle));

    // reserved slots: present, and null | object (structural union). external_registry_anchor is an
    // active optional field verified in the audit tier — it may be null | object too.
    for (const slot of [...VRC_RESERVED_ARTIFACT_SLOTS, "external_registry_anchor"]) {
      if (!(slot in bundle)) return R(332, "missing_reserved_slot", { slot });
      const v = bundle[slot];
      if (v !== null && !isObj(v)) return R(332, "reserved_slot_bad_type", { slot });
    }

    // every rating entry: value present IFF value_kind === "ordinal"; collect entry_digests.
    const seen = new Set();
    for (const arr of [bundle.reviewer_ratings, bundle.producer_ratings]) {
      if (!Array.isArray(arr)) return R(332, "rating_chain_not_array");
      for (const e of arr) {
        if (!isObj(e) || !isObj(e.content)) return R(332, "rating_entry_malformed");
        const ordinal = e.content.value_kind === "ordinal";
        const hasValue = "value" in e.content;
        if (ordinal !== hasValue) return R(332, "value_kind_value_mismatch");
        if (typeof e.entry_digest !== "string") return R(332, "entry_digest_missing");
        if (seen.has(e.entry_digest)) return R(332, "duplicate_entry_digest");
        seen.add(e.entry_digest);
      }
    }

    // G13 belt — a correctness/verdict-of-truth assertion in the flat annotation surface fails closed.
    if (bundle.annotations !== undefined) {
      if (!isObj(bundle.annotations)) return R(332, "annotations_not_object");
      for (const k of Object.keys(bundle.annotations)) {
        if (CORRECTNESS_FORBIDDEN_KEYS.has(k))
          return R(332, "correctness_claim_forbidden", { key: k });
      }
    }
    return null;
  } catch (e) {
    return R(332, "bundle_schema_exception", { error: String(e) });
  }
}

export function checkConfigSchema(cfg) {
  try {
    if (!isObj(cfg)) return R(332, "cfg_not_object");
    for (const k of ["policy", "verifier_key_pin", "vpc_bundle", "vpc_external_config"]) {
      if (!(k in cfg)) return R(332, "cfg_missing_key", { key: k });
    }
    if (!isObj(cfg.policy)) return R(332, "cfg_policy_malformed");
    if (typeof cfg.verifier_key_pin?.key_fingerprint !== "string")
      return R(332, "cfg_verifier_pin_malformed");
    if (!isObj(cfg.vpc_bundle) || !isObj(cfg.vpc_external_config))
      return R(332, "cfg_upstream_malformed");
    return null;
  } catch (e) {
    return R(332, "cfg_schema_exception", { error: String(e) });
  }
}
