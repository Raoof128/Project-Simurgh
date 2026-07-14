// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5N — 416 uncertainty unresolved, 417 insufficient separation (No Instant Finalisation). Integer ms,
// conservative subtraction, never silent-zero. Authority uncertainty comes from the committed policy keyed
// by the VALIDATED authority id (facts), not an envelope string.
import { R } from "./result.mjs";

function resolveUncertainty(ef, policy) {
  if (Number.isSafeInteger(ef?.accuracy_ms)) return { ms: ef.accuracy_ms };
  const bound =
    policy?.uncertainty_policy?.per_authority_bounds?.[ef?.authority_id]?.uncertainty_bound_ms;
  if (Number.isSafeInteger(bound)) return { ms: bound };
  return { missing: true };
}

export function checkElapsed(env, facts) {
  const policy = env.delay_policy;
  const s = facts?.start,
    e = facts?.end;
  const su = resolveUncertainty(s, policy),
    eu = resolveUncertainty(e, policy);
  if (su.missing || eu.missing)
    return R(416, "tsa_uncertainty_unresolved", { detail: "accuracy_missing_no_policy" });

  let sMs = su.ms,
    eMs = eu.ms;
  if (s.authority_id !== e.authority_id) {
    const sync = policy?.uncertainty_policy?.cross_authority_sync_bound_ms;
    if (!Number.isSafeInteger(sync))
      return R(416, "tsa_uncertainty_unresolved", { detail: "authority_mismatch_no_sync_bound" });
    sMs += sync;
    eMs += sync;
  }
  if (!Number.isSafeInteger(s.genTime_ms) || !Number.isSafeInteger(e.genTime_ms))
    return R(416, "tsa_uncertainty_unresolved", { detail: "accuracy_missing_no_policy" });

  const elapsed_lower_bound_ms = e.genTime_ms - eMs - (s.genTime_ms + sMs);
  if (elapsed_lower_bound_ms < policy.precommitted_minimum_elapsed_ms)
    return R(417, "insufficient_timestamp_separation", { elapsed_lower_bound_ms });
  return { raw: 0, elapsed_lower_bound_ms };
}
