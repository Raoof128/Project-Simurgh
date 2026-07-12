// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — VUC schema (raw 348). Two TOTAL functions: checkBundleSchema / checkConfigSchema. Both catch
// parse/canonical failures and RETURN 348, never throw (so a malformed bundle is 348, not a 363 wrapper).
// Includes the G13 adequacy-vocabulary belt on the flat annotations surface. Well-formedness only — the
// deep crypto/set/anchor checks are later raw codes; omission_claims are verdict-neutral (audit 361).
import { R } from "./result.mjs";
import { canonicalJson } from "./digests.mjs";
import { ADEQUACY_FORBIDDEN_KEYS } from "../constants.mjs";

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v) => typeof v === "string" && v.length > 0;
const isArr = Array.isArray;
// a union slot: null OR a plain object (never a bare primitive)
const unionSlot = (v) => v === null || isObj(v);

function bad(reason) {
  return R(348, reason);
}

export function checkBundleSchema(bundle) {
  try {
    if (!isObj(bundle)) return bad("bundle_not_object");
    // canonicalisability (round-trips without throwing — catches BigInt / cycles / non-JSON)
    canonicalJson(bundle);

    if (!isStr(bundle.schema_version)) return bad("schema_version_missing");
    if (bundle.composition_profile !== "vpc_and_vrc" && bundle.composition_profile !== "vpc_only")
      return bad("composition_profile_invalid");

    const pcs = bundle.producer_commitment_statement;
    if (!isObj(pcs)) return bad("producer_commitment_statement_missing");
    for (const k of [
      "universe_commitment_digest",
      "producer_identity_digest",
      "producer_key_fingerprint",
      "commitment_session_id",
      "policy_profile_id",
      "policy_digest",
      "sig",
    ])
      if (!isStr(pcs[k])) return bad(`producer_commitment_statement.${k}_missing`);

    const uc = bundle.universe_commitment;
    if (!isObj(uc)) return bad("universe_commitment_missing");
    if (uc.canonicalization_profile !== "simurgh.vuc.merkle_set.v1")
      return bad("canonicalization_profile_invalid");
    if (uc.hash_algorithm !== "sha-256") return bad("hash_algorithm_invalid");
    if (!isStr(uc.tree_profile)) return bad("tree_profile_missing");
    if (!isArr(uc.leaves) || uc.leaves.length === 0) return bad("leaves_missing");
    for (const l of uc.leaves) {
      if (
        !isObj(l) ||
        !isStr(l.leaf_id) ||
        !isStr(l.leaf_type) ||
        !isStr(l.subject_digest) ||
        !isStr(l.leaf_digest)
      )
        return bad("leaf_malformed");
    }
    if (!Number.isInteger(uc.leaf_count)) return bad("leaf_count_invalid");
    if (!isStr(uc.universe_root)) return bad("universe_root_missing");
    if (!isStr(uc.universe_commitment_digest)) return bad("universe_commitment_digest_missing");

    if (!isObj(bundle.ordering_anchor)) return bad("ordering_anchor_missing");
    if (bundle.finality_anchor !== null && !isObj(bundle.finality_anchor))
      return bad("finality_anchor_slot_invalid");
    if (
      bundle.claimed_finality_state !== "pending" &&
      bundle.claimed_finality_state !== "confirmed"
    )
      return bad("claimed_finality_state_invalid");

    for (const arrKey of [
      "start_challenges",
      "review_start_records",
      "review_execution_bindings",
      "inclusion_proofs",
    ])
      if (!isArr(bundle[arrKey])) return bad(`${arrKey}_not_array`);

    if (!isObj(bundle.producer_rating_start_record))
      return bad("producer_rating_start_record_missing");
    if (!isObj(bundle.producer_execution_binding)) return bad("producer_execution_binding_missing");
    if (!isObj(bundle.vpc_ref)) return bad("vpc_ref_missing");
    if (bundle.vrc_ref !== null && !isObj(bundle.vrc_ref)) return bad("vrc_ref_slot_invalid");
    if (!isObj(bundle.verification_context)) return bad("verification_context_missing");
    if (!isStr(bundle.verification_context.policy_digest))
      return bad("verification_context.policy_digest_missing");

    // prior_universe_ref: null | { vuc_bundle_digest, universe_commitment_digest, ordering_receipt_digest }
    const pur = bundle.prior_universe_ref;
    if (pur !== null) {
      if (!isObj(pur)) return bad("prior_universe_ref_slot_invalid");
      for (const k of [
        "vuc_bundle_digest",
        "universe_commitment_digest",
        "ordering_receipt_digest",
      ])
        if (!isStr(pur[k])) return bad(`prior_universe_ref.${k}_missing`);
    }

    // omission_claims[] — verdict-neutral surface; well-formedness only here (sig-validated at 361).
    if (!isArr(bundle.omission_claims)) return bad("omission_claims_not_array");
    for (const oc of bundle.omission_claims) {
      if (!isObj(oc)) return bad("omission_claim_malformed");
      for (const k of [
        "claim_id",
        "claimant_principal_digest",
        "omitted_subject_description_digest",
        "claimant_basis_digest",
        "universe_commitment_digest",
        "ordering_evidence_digest",
        "sig",
      ])
        if (!isStr(oc[k])) return bad(`omission_claim.${k}_missing`);
      if (oc.producer_response_digest !== null && !isStr(oc.producer_response_digest))
        return bad("omission_claim.producer_response_digest_invalid");
    }

    // active-optional + reserved slots
    if (bundle.external_registry_anchor !== null && !isObj(bundle.external_registry_anchor))
      return bad("external_registry_anchor_slot_invalid");
    if (!unionSlot(bundle.review_window_binding)) return bad("review_window_binding_slot_invalid");
    if (!unionSlot(bundle.campaign_composition_root))
      return bad("campaign_composition_root_slot_invalid");

    // G13 belt — an adequacy assertion in the flat annotations surface fails closed.
    if (bundle.annotations !== undefined) {
      if (!isObj(bundle.annotations)) return bad("annotations_not_object");
      for (const k of Object.keys(bundle.annotations))
        if (ADEQUACY_FORBIDDEN_KEYS.has(k)) return bad(`adequacy_vocabulary_forbidden:${k}`);
    }

    return null;
  } catch (e) {
    return bad(`bundle_uncanonicalisable:${String(e && e.message)}`);
  }
}

export function checkConfigSchema(cfg) {
  try {
    if (!isObj(cfg)) return bad("cfg_not_object");
    canonicalJson(cfg);
    if (!isObj(cfg.key_registry)) return bad("cfg.key_registry_missing");
    if (!isObj(cfg.vpc_bundle)) return bad("cfg.vpc_bundle_missing");
    if (!isObj(cfg.vpc_external_config)) return bad("cfg.vpc_external_config_missing");
    if (!isObj(cfg.vrc_bundle)) return bad("cfg.vrc_bundle_missing");
    if (!isObj(cfg.vrc_external_config)) return bad("cfg.vrc_external_config_missing");
    return null;
  } catch (e) {
    return bad(`cfg_uncanonicalisable:${String(e && e.message)}`);
  }
}
