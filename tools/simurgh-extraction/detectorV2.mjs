// SPDX-License-Identifier: AGPL-3.0-or-later
// Detector v2: same frozen signal thresholds as v1, but the DECISION requires >=2 distinct
// STRONG families. Volume is contextual and never corroborates (A10 fix).
import { metaSetDigestV2 } from "./metaSetV2.mjs";
import { splitFamilies } from "./signalFamiliesV2.mjs";

export const DETECTOR_ID = "stage3u_extraction_detector_v2";
export const PREVIOUS_DETECTOR_ID = "stage3t_frozen_detector_v1";
export const THRESHOLD_STRONG = 2;
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

export function matchSignalsV2(set) {
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
    volume_burst: n >= THRESHOLDS.CLUSTER_MIN && maxCount(tb) / n >= THRESHOLDS.VOLUME_BURST_FRACTION,
    high_request_count: n >= THRESHOLDS.HIGH_REQUEST_COUNT,
  };
}

export function firedSignalIds(matched) {
  return Object.keys(matched).filter((k) => matched[k] === true);
}

export function decideV2(strongCount) {
  if (strongCount >= THRESHOLD_STRONG)
    return { decision: "extraction_pattern_observed", attestation_claim: "manual_review_recommended" };
  if (strongCount === 1)
    return { decision: "single_signal_observed", attestation_claim: "manual_review_only" };
  return { decision: "no_pattern_observed", attestation_claim: "none" };
}

export function runDetectorV2(set) {
  const matched = matchSignalsV2(set);
  const { strong, contextual } = splitFamilies(firedSignalIds(matched));
  // 0 strong + >=1 contextual surfaces as single_signal_observed (review context), not no_pattern.
  const { decision, attestation_claim } =
    strong.length === 0 && contextual.length > 0
      ? { decision: "single_signal_observed", attestation_claim: "manual_review_only" }
      : decideV2(strong.length);
  return {
    type: "simurgh.capability_extraction.detector_result.v2",
    detector_id: DETECTOR_ID,
    previous_detector_id: PREVIOUS_DETECTOR_ID,
    meta_set_digest: metaSetDigestV2(set),
    matched,
    matched_strong_families: strong,
    matched_contextual_families: contextual,
    strong_family_count: strong.length,
    contextual_family_count: contextual.length,
    decision,
    attestation_claim,
    non_claims: [
      "no_intent_claim",
      "no_attribution_claim",
      "no_complete_distillation_prevention_claim",
      "no_general_fp_fn_claim",
      "no_live_traffic_claim",
      "metadata_only",
      "match_is_not_accusation",
    ],
  };
}
