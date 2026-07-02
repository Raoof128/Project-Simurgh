// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4K frozen ledgers (spec §0.1/§0.1A). Changing ANY value here invalidates every
// committed digest — these are the precommitted constants the attestation stands on.
export const EBA_LEDGER_SCHEMA = "simurgh.eba.ledger.v1";
export const EBA_BUDGET_POLICY_SCHEMA = "simurgh.eba.budget-policy.v1";
export const EBA_ATTESTATION_SCHEMA = "simurgh.eba.attestation.v1";
export const EBA_MANIFEST_SCHEMA = "simurgh.eba.manifest.v1";
export const EBA_MANIFEST_DOMAIN = "SIMURGH_STAGE4K_EBA_MANIFEST_V1\0";

// Pinned fixture salt: deterministic (byte-stable golden) — pseudonymous, NOT anonymous.
export const FIXTURE_SALT = "simurgh-stage4k-fixture-salt-v1";

// Declared policy, not measurement (non-claim: weights_are_declared_policy).
export const SIGNAL_CLASS_WEIGHTS = Object.freeze({
  final_answer: 1,
  tool_use_trajectory: 2,
  reasoning_trace: 3,
  reward_like_judgment: 4,
});
export const FROZEN_SIGNAL_CLASSES = Object.freeze(Object.keys(SIGNAL_CLASS_WEIGHTS).sort());

// Exactly these six fields per event (spec §0.1A); anything else fails closed.
export const EVENT_FIELDS = Object.freeze([
  "consumer_id",
  "event_id",
  "response_id_digest",
  "session_id",
  "signal_class",
  "window",
]);
