// SPDX-License-Identifier: AGPL-3.0-or-later
// Genesis-policy validation + leakage math (spec §5.1). The leakage bound is computed
// from the POLICY ALONE (Fix 2) — never trusted from any record.
import {
  BAND_DIMENSIONS,
  LEAKAGE_BITS_MAX,
  SEISMOGRAPH_GENESIS_SCHEMA,
  SEISMOGRAPH_NON_CLAIMS,
} from "../constants.mjs";

export const bandVectorSpaceSize = (dimensions) =>
  Object.values(dimensions).reduce((acc, bands) => acc * bands.length, 1);

export const leakageBitsUpperBound = (dimensions) =>
  Math.ceil(Math.log2(bandVectorSpaceSize(dimensions)));

const TOP_LEVEL_KEYS = Object.freeze([
  "band_policy",
  "chain_id",
  "crypto",
  "non_claims",
  "publication",
  "reveal_policy",
  "schema",
  "scope",
  "stage",
  "window_policy",
]);

export function validateGenesisPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return { ok: false, reason: "schema_invalid" };
  }
  for (const key of Object.keys(policy)) {
    if (!TOP_LEVEL_KEYS.includes(key)) return { ok: false, reason: `unknown_field:${key}` };
  }
  for (const key of TOP_LEVEL_KEYS) {
    if (!(key in policy)) return { ok: false, reason: `missing_field:${key}` };
  }
  if (policy.schema !== SEISMOGRAPH_GENESIS_SCHEMA) return { ok: false, reason: "schema_mismatch" };
  if (policy.window_policy.clock !== "synthetic")
    return { ok: false, reason: "clock_not_synthetic" };
  const d = policy.reveal_policy.aggregate_reveal_delay_windows;
  if (!Number.isInteger(d) || d < 1) return { ok: false, reason: "delay_not_positive_integer" };
  const dims = policy.band_policy.dimensions;
  if (policy.band_policy.band_vector_space_size !== bandVectorSpaceSize(dims)) {
    return { ok: false, reason: "band_space_mismatch" };
  }
  if (leakageBitsUpperBound(dims) > policy.band_policy.leakage_bits_per_reveal_max) {
    return { ok: false, reason: "leakage_bound_exceeds_budget" };
  }
  for (const nc of SEISMOGRAPH_NON_CLAIMS) {
    if (!policy.non_claims.includes(nc)) return { ok: false, reason: "non_claims_incomplete" };
  }
  return { ok: true };
}

// Load-time sanity: the frozen v0 constants must satisfy their own budget, else every
// downstream digest is built on an inconsistent policy.
if (leakageBitsUpperBound(BAND_DIMENSIONS) > LEAKAGE_BITS_MAX) {
  throw new Error("constants_inconsistent: v0 band dimensions exceed the leakage budget");
}
