// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 399 policy digest, 400 policy-not-accepted (frozen profile + external hard-limit conformance).
import { R } from "./result.mjs";
import { policyDigest } from "./derive.mjs";
import {
  PROFILE_ID,
  DELAY_ALGORITHM_ID,
  HASH_ALGORITHM,
  CANONICAL_ENCODING,
  T,
  CADENCE,
  STAGE_5N_FLOOR_MS,
  MIN_AUTHORITY_UNCERTAINTY_MS,
  ACCEPTED_FRESHNESS_MODES,
  ACCEPTED_INTERP_CHANNELS,
} from "../constants.mjs";

export function checkPolicyDigest(env) {
  if (policyDigest(env.delay_policy) !== env.delay_policy_digest)
    return R(399, "delay_policy_digest_mismatch");
  return null;
}

export function checkPolicyAccepted(env, verifier_config) {
  const p = env.delay_policy;
  const bad = (d) => R(400, "delay_policy_not_accepted", { detail: d });
  if (p.profile_id !== PROFILE_ID) return bad("profile_id");
  if (p.delay_algorithm_id !== DELAY_ALGORITHM_ID) return bad("algorithm");
  if (p.hash_algorithm !== HASH_ALGORITHM) return bad("hash");
  if (p.iteration_count_T !== T) return bad("iteration_count_T");
  if (p.checkpoint_cadence !== CADENCE) return bad("cadence");
  if (p.canonical_encoding !== CANONICAL_ENCODING) return bad("encoding");
  if (
    !Number.isSafeInteger(p.precommitted_minimum_elapsed_ms) ||
    p.precommitted_minimum_elapsed_ms < STAGE_5N_FLOOR_MS
  )
    return bad("floor");
  if (JSON.stringify(p.accepted_freshness_modes) !== JSON.stringify([...ACCEPTED_FRESHNESS_MODES]))
    return bad("freshness_modes");
  if (!ACCEPTED_INTERP_CHANNELS.includes(p.interpretability_policy?.channel))
    return bad("interp_channel");

  // Uncertainty structure: every used authority must be in the registry with a bound >= MIN (P0/A1).
  const reg = verifier_config?.authority_registry ?? {};
  const bounds = p.uncertainty_policy?.per_authority_bounds ?? {};
  for (const [auth, entry] of Object.entries(bounds)) {
    if (!reg[auth]) return bad("authority_not_in_registry");
    const b = entry?.uncertainty_bound_ms;
    if (!Number.isSafeInteger(b) || b < MIN_AUTHORITY_UNCERTAINTY_MS)
      return bad("uncertainty_below_min");
  }

  // External hard limits: the committed policy may only tighten verifier_config.hard_resource_limits (P0-10).
  const hard = verifier_config?.hard_resource_limits ?? {};
  const lim = p.verifier_limits ?? {};
  if (!Number.isSafeInteger(lim.maximum_supported_T) || lim.maximum_supported_T > T)
    return bad("maximum_supported_T");
  if (
    Number.isSafeInteger(hard.max_checkpoint_count) &&
    Number.isSafeInteger(lim.max_checkpoint_count) &&
    lim.max_checkpoint_count > hard.max_checkpoint_count
  )
    return bad("checkpoint_limit_looser_than_config");
  if (
    Number.isSafeInteger(hard.max_raw_bytes) &&
    Number.isSafeInteger(lim.max_envelope_bytes) &&
    lim.max_envelope_bytes > hard.max_raw_bytes
  )
    return bad("envelope_limit_looser_than_config");
  return null;
}
