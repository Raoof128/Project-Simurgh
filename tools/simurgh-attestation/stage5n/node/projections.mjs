// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — I-E oversight-log projection (emit-only). Maps a verified envelope onto three record shapes:
// an Art-14-style oversight record, an activity-feed record, and an Art-12 log record. Every emission
// carries the necessary-not-sufficient non-claim; endpoint times are commitment times, NOT system-use times.
const NON_CLAIM =
  "a projection of 5N delay evidence, not a claim of Art-12/Art-14 compliance; proves non-instant finalisation only";

export function oversightProjections(v) {
  const base = {
    run_id: v.run_id,
    decision_commitment: v.D_out,
    commitment_start_time: v.start_genTime_ms,
    commitment_finalisation_time: v.end_genTime_ms,
    elapsed_lower_bound_ms: v.elapsed_lower_bound_ms,
    verifier_verdict: "raw_0",
    non_claim: NON_CLAIM,
  };
  return {
    art14_oversight_record: { ...base, record_type: "human_oversight_evidence" },
    activity_feed_record: { ...base, record_type: "access_activity", accessed_at: null }, // 5N proves interval, feed proves instant
    art12_log_record: {
      ...base,
      record_type: "automatic_log",
      use_period: { start: v.start_genTime_ms, end: v.end_genTime_ms },
    },
  };
}
