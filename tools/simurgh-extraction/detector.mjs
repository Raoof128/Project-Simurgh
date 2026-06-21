// SPDX-License-Identifier: AGPL-3.0-or-later
// Frozen, deterministic, order-independent detector. Decision uses DISTINCT signal
// families (>=2 → extraction). Thresholds are frozen into the detector identity; any
// change requires a new DETECTOR_ID.
import { metaSetDigest } from "./metaSet.mjs";
import { distinctFamilies } from "./signalFamilies.mjs";

export const DETECTOR_ID = "stage3t_frozen_detector_v1";
export const THRESHOLD = 2;
export const THRESHOLDS = Object.freeze({
  CLUSTER_MIN: 3,
  DOMINANCE: 0.6,
  COT_MAJORITY: 0.5,
  VOLUME_BURST_FRACTION: 0.6,
  HIGH_REQUEST_COUNT: 10,
  HYDRA_MIN_ACTORS: 3,
});

function counts(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
}
function maxCount(map) {
  let max = 0;
  for (const v of map.values()) if (v > max) max = v;
  return max;
}

export function matchSignals(set) {
  const rows = set.runs;
  const n = rows.length;
  const np = counts(rows, "normalized_prompt_hash");
  const tp = counts(rows, "prompt_template_hash");
  const cap = counts(rows, "capability_tag");
  const task = counts(rows, "task_family");
  const tb = counts(rows, "time_bucket");
  const actors = counts(rows, "actor_cluster_hash");
  const sessions = counts(rows, "session_cluster_hash");
  const cotTrue = rows.filter((r) => r.cot_elicitation_flag === true).length;
  return {
    repetition_cluster: maxCount(np) >= THRESHOLDS.CLUSTER_MIN,
    template_prefix_cluster: maxCount(tp) >= THRESHOLDS.CLUSTER_MIN,
    cot_elicitation: n > 0 && cotTrue / n > THRESHOLDS.COT_MAJORITY,
    capability_targeting: n >= THRESHOLDS.CLUSTER_MIN && maxCount(cap) / n >= THRESHOLDS.DOMINANCE,
    task_taxonomy_repeat: n >= THRESHOLDS.CLUSTER_MIN && maxCount(task) / n >= THRESHOLDS.DOMINANCE,
    hydra_cluster: actors.size >= THRESHOLDS.HYDRA_MIN_ACTORS && sessions.size >= actors.size,
    volume_burst:
      n >= THRESHOLDS.CLUSTER_MIN && maxCount(tb) / n >= THRESHOLDS.VOLUME_BURST_FRACTION,
    high_request_count: n >= THRESHOLDS.HIGH_REQUEST_COUNT,
  };
}

export function firedSignalIds(matched) {
  return Object.keys(matched).filter((k) => matched[k] === true);
}

export function decide(distinctFamilyCount) {
  if (distinctFamilyCount >= THRESHOLD)
    return {
      decision: "extraction_pattern_observed",
      attestation_claim: "manual_review_recommended",
    };
  if (distinctFamilyCount === 1)
    return { decision: "single_signal_observed", attestation_claim: "manual_review_only" };
  return { decision: "no_pattern_observed", attestation_claim: "none" };
}

export function runDetector(set) {
  const matched = matchSignals(set);
  const families = distinctFamilies(firedSignalIds(matched));
  const { decision, attestation_claim } = decide(families.length);
  return {
    type: "simurgh.capability_extraction.detector_result.v1",
    detector_id: DETECTOR_ID,
    meta_set_digest: metaSetDigest(set),
    matched,
    matched_families: families,
    distinct_family_count: families.length,
    decision,
    attestation_claim,
    non_claims: [
      "no_intent_claim",
      "no_attribution_claim",
      "no_complete_distillation_prevention_claim",
      "metadata_only",
      "match_is_not_accusation",
    ],
  };
}
