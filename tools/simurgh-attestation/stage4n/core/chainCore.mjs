// SPDX-License-Identifier: AGPL-3.0-or-later
// Single interleaved append-only chain (spec §5.0, Fix 1) + Q10/Q11 (spec §6).
// Q10 = the chain is internally consistent (positions, prev digests, interleave order).
// Q11 = every expected heartbeat up to as_of exists. Missing due reveals are Q13's lane.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../constants.mjs";
import { bandVectorSpaceSize, leakageBitsUpperBound } from "./genesisCore.mjs";
import { bandFor, commitBandVector, validateHeartbeat, validateReveal } from "./recordCore.mjs";
import { expectedSequence, windowIdOf, windowIndex } from "./windowModel.mjs";

const privateEvidenceRoot = (roots, window_id) =>
  recordDigest({
    stage4k_exposure_root: roots.stage4k_exposure_root,
    stage4l_cluster_budget_root: roots.stage4l_cluster_budget_root,
    stage4m_disclosure_root: roots.stage4m_disclosure_root,
    window_id,
  });

const revealSalt = (rawCounts, window_id) => recordDigest({ band_inputs: rawCounts, window_id });

export const bandsOf = (rawCounts) => ({
  breach_count: bandFor(rawCounts.breach_count, BAND_DIMENSIONS.breach_count),
  consumer_count: bandFor(rawCounts.consumer_count, BAND_DIMENSIONS.consumer_count),
});

export function buildChain({ policy, asOfIndex, perWindow }) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const seq = expectedSequence(d, asOfIndex);
  const records = [];
  let prev = recordDigest(policy); // genesis: chain bound to its policy (spec §5.0)
  for (let position = 0; position < seq.length; position++) {
    const { record_type, window_id } = seq[position];
    const k = windowIndex(window_id);
    const input = perWindow.get(k);
    if (!input) throw new Error(`per_window_input_missing: ${window_id}`);
    let record;
    if (record_type === "heartbeat") {
      const salt = revealSalt(input.rawCounts, window_id);
      record = {
        schema: SEISMOGRAPH_HEARTBEAT_SCHEMA,
        record_type,
        stage: "4N",
        chain_id: SEISMOGRAPH_CHAIN_ID,
        window_id,
        position,
        prev_record_digest: prev,
        commitments: {
          ...input.roots,
          private_evidence_root: privateEvidenceRoot(input.roots, window_id),
        },
        reveal_commitment: {
          committed_band_vector_digest: commitBandVector({
            window_id,
            bands: bandsOf(input.rawCounts),
            salt,
          }),
          reveal_due_window: windowIdOf(k + d),
        },
        non_claims: [...HEARTBEAT_NON_CLAIMS],
      };
    } else {
      record = {
        schema: SEISMOGRAPH_REVEAL_SCHEMA,
        record_type,
        stage: "4N",
        chain_id: SEISMOGRAPH_CHAIN_ID,
        window_id,
        revealed_at_window: windowIdOf(k + d),
        position,
        prev_record_digest: prev,
        bands: bandsOf(input.rawCounts),
        reveal_salt: revealSalt(input.rawCounts, window_id),
        self_leakage: {
          band_vector_space_size: bandVectorSpaceSize(BAND_DIMENSIONS),
          leakage_bits_upper_bound: leakageBitsUpperBound(BAND_DIMENSIONS),
          budget_bits: policy.band_policy?.leakage_bits_per_reveal_max ?? 4,
          within_budget:
            leakageBitsUpperBound(BAND_DIMENSIONS) <=
            (policy.band_policy?.leakage_bits_per_reveal_max ?? 4),
        },
        non_claims: [...REVEAL_NON_CLAIMS],
      };
    }
    records.push(record);
    prev = recordDigest(record);
  }
  return records;
}

// Q10 — raw 49. Gate separation is load-bearing: Q10 judges ONLY what exists (schema,
// consecutive positions, prev-digest links, no duplicates, and interleave order as an
// ordered SUBSEQUENCE of the expected schedule). What is MISSING is judged by Q11
// (heartbeats, raw 47) and Q13 (reveals, raw 52). A strict slot-by-slot schedule match
// here would subsume Q11 and make raw 47 unreachable — the T1 cover-up arm (drop +
// re-forged links) must pass Q10 and fail Q11.
export function verifyChainIntegrity(records, policy, asOfIndex) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const seq = expectedSequence(d, asOfIndex);
  let prev = recordDigest(policy);
  const seen = new Set();
  let cursor = 0; // subsequence cursor into the expected schedule
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const valid =
      r?.record_type === "heartbeat"
        ? validateHeartbeat(r)
        : r?.record_type === "aggregate_reveal"
          ? validateReveal(r, null) // structural only — dimension semantics belong to Q14/Q16
          : { ok: false };
    if (!valid.ok) return { raw: 49, reason: "schema_invalid" };
    if (r.position !== i) return { raw: 49, reason: "position_discontinuity" };
    if (r.prev_record_digest !== prev) return { raw: 49, reason: "prev_digest_mismatch" };
    const key = `${r.record_type}|${r.window_id}`;
    if (seen.has(key)) return { raw: 49, reason: "duplicate_record" };
    seen.add(key);
    // advance the schedule cursor to this record; failure to find it in the REMAINING
    // schedule means it is out of order (seen earlier than allowed) or alien to the plan
    let found = -1;
    for (let j = cursor; j < seq.length; j++) {
      if (seq[j].record_type === r.record_type && seq[j].window_id === r.window_id) {
        found = j;
        break;
      }
    }
    if (found === -1) {
      const inSchedule = seq.some(
        (s) => s.record_type === r.record_type && s.window_id === r.window_id
      );
      return {
        raw: 49,
        reason: inSchedule ? "interleave_order_violation" : "window_outside_schedule",
      };
    }
    cursor = found + 1;
    prev = recordDigest(r);
  }
  return { raw: 0 };
}

// Q11 — raw 47. Heartbeat liveness only: every expected heartbeat window <= as_of present.
export function verifyTemporalCompleteness(records, policy, asOfIndex) {
  const present = new Set(
    records.filter((r) => r?.record_type === "heartbeat").map((r) => r.window_id)
  );
  for (let k = 0; k <= asOfIndex; k++) {
    if (!present.has(windowIdOf(k))) {
      return { raw: 47, reason: "heartbeat_absent_for_expected_window" };
    }
  }
  return { raw: 0 };
}
