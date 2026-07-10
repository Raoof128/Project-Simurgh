// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — schemas, enums, reserved slots, score helpers (plan Task 1).
// Raw codes live in the global ledger (stage4h/exitCodes.mjs) and are re-exported here.
export {
  VMP_RAW_CODES,
  VMP_CHECK_ORDER,
  VMP_AUDIT_CODES,
  VMP_PUBLIC_CODES,
} from "../stage4h/exitCodes.mjs";

export const VMP_SCHEMAS = Object.freeze({
  ATTESTATION: "simurgh.vmp.panel_attestation.v1",
  CAPTURE_CENSUS: "simurgh.vmp.capture_census.v1", // audit-private census + attempt log
  LANEB_RECEIPT: "simurgh.vmp.blind_recompute_receipt.v1",
  BYO_PANEL: "simurgh.vmp.byo_panel.v1",
});

export const DECISION_SEMANTICS = Object.freeze([
  "binary_malicious_softmax",
  "categorical_allow_block",
]);

export const CELL_STATUS = Object.freeze([
  "evaluated",
  "not_applicable",
  "unsupported_input",
  "capture_failed",
  "missing_capture",
]);

export const PROVENANCE_MODES = Object.freeze(["historical_verifier", "reference_binding", "none"]);

export const SCORE_PRECISION = 4;

export const AGGREGATE_FORBIDDEN_KEYS = Object.freeze([
  "aggregate_verdict",
  "panel_score",
  "consensus",
  "quorum",
]);

export const VMP_RESERVED_SLOTS = Object.freeze([
  "panel_aggregation_policy_deferred",
  "universe_completeness_deferred",
  "panel_contest_deferred",
  "portable_historical_kernel_deferred",
  "multilingual_ruleset_deferred",
  "live_endpoint_attestation_deferred",
  "unicode_confusables_kernel_hardening_deferred",
  "downstream_efficacy_target_deferred",
]);

// Score handling: NO binary floating-point, NO Number arithmetic on a verdict. Validate an exact-width
// [0,1] decimal string, then compare lexically — equal-width zero-padded decimals in [0,1] sort correctly
// as strings, so "0.8123" >= "0.5000" is exact. There is deliberately no scaleDecimal().
const SCORE_RE = new RegExp(`^(0\\.\\d{${SCORE_PRECISION}}|1\\.0{${SCORE_PRECISION}})$`);

export function validateScore(str) {
  if (typeof str !== "string" || !SCORE_RE.test(str)) {
    throw new Error(`invalid score (want exact-width [0,1] decimal): ${JSON.stringify(str)}`);
  }
  return str;
}

export function scoreGte(a, b) {
  return validateScore(a) >= validateScore(b);
}
