// SPDX-License-Identifier: AGPL-3.0-or-later
// Q13 schedule, Q14 self-leakage, Q16 public-surface scan (spec §6, Fixes 2/3/5).
// Q14 NEVER trusts a record's self_leakage copy — it recomputes from the policy alone.
// Q16 is the linkability tripwire: bilateral material in a public artifact is raw 54.
import { commitBandVector } from "./recordCore.mjs";
import { bandVectorSpaceSize, leakageBitsUpperBound } from "./genesisCore.mjs";
import { windowIndex } from "./windowModel.mjs";
import { PUBLIC_FORBIDDEN_KEYS } from "../constants.mjs";

export function verifyRevealSchedule(records, policy, asOfIndex) {
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  const heartbeats = new Map(
    records.filter((r) => r?.record_type === "heartbeat").map((r) => [r.window_id, r])
  );
  const reveals = new Map(
    records.filter((r) => r?.record_type === "aggregate_reveal").map((r) => [r.window_id, r])
  );
  for (const [window_id, reveal] of reveals) {
    const heartbeat = heartbeats.get(window_id);
    if (!heartbeat) return { raw: 52, reason: "reveal_early" }; // reveal without commitment
    if (
      reveal.revealed_at_window !== heartbeat.reveal_commitment.reveal_due_window ||
      windowIndex(reveal.revealed_at_window) < windowIndex(window_id) + d
    ) {
      return { raw: 52, reason: "reveal_early" };
    }
    const recomputed = commitBandVector({
      window_id,
      bands: reveal.bands,
      salt: reveal.reveal_salt,
    });
    if (recomputed !== heartbeat.reveal_commitment.committed_band_vector_digest) {
      return { raw: 50, reason: "reveal_commitment_mismatch" };
    }
  }
  // Fix 3: due means window <= as_of - d. Later windows are pending, not overdue.
  for (const [window_id] of heartbeats) {
    if (windowIndex(window_id) <= asOfIndex - d && !reveals.has(window_id)) {
      return { raw: 52, reason: "reveal_overdue" };
    }
  }
  return { raw: 0 };
}

export function verifyLeakageBudget(records, policy) {
  const dims = policy.band_policy.dimensions;
  const space = bandVectorSpaceSize(dims);
  const bits = leakageBitsUpperBound(dims);
  const budget = policy.band_policy.leakage_bits_per_reveal_max;
  if (bits > budget) return { raw: 53, reason: "band_vector_space_exceeds_budget" };
  for (const r of records) {
    if (r?.record_type !== "aggregate_reveal") continue;
    for (const dim of Object.keys(r.bands ?? {})) {
      if (!(dim in dims)) return { raw: 53, reason: "undeclared_band_dimension" };
    }
    const sl = r.self_leakage ?? {};
    if (
      sl.band_vector_space_size !== space ||
      sl.leakage_bits_upper_bound !== bits ||
      sl.budget_bits !== budget ||
      sl.within_budget !== bits <= budget
    ) {
      return { raw: 53, reason: "self_leakage_recompute_mismatch" };
    }
  }
  return { raw: 0 };
}

const BAND_KEY_NAMES = Object.freeze(["breach_count", "consumer_count"]);

function scanValue(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = scanValue(item);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "bundle_tier") return "tier_label_public";
      if (key === "respondent_id_digest") return "respondent_material_public";
      if (PUBLIC_FORBIDDEN_KEYS.includes(key)) return "inclusion_proof_material_public";
      if (BAND_KEY_NAMES.includes(key) && typeof child === "number") return "raw_count_public";
      const hit = scanValue(child);
      if (hit) return hit;
    }
  }
  return null;
}

export function scanPublicSurface(artifacts) {
  for (const { value } of artifacts) {
    const hit = scanValue(value);
    if (hit) return { raw: 54, reason: hit };
  }
  return { raw: 0 };
}
