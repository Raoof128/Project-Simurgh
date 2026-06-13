// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic, offline, metadata-only narrative generator for Banking Shield
// B4-A. Pure function of the allowlisted payload: no randomness, no clock, no
// I/O, and no network imports (enforced by the no-egress gate).

const SCENARIO_SUMMARIES = Object.freeze({
  mock_cdr_consent:
    "This fictional session recorded a data-sharing consent screen interaction. It is metadata only.",
  mock_confirmation_of_payee:
    "This fictional session recorded a payee-name check interaction. It is metadata only.",
  remote_access_warning:
    "This fictional session recorded a remote-access caution interaction. It is metadata only.",
  mock_payment_pause:
    "This fictional session recorded a payment-pause prompt interaction. It is metadata only.",
  mock_ai_agent_finance_action:
    "This fictional session recorded an AI-agent finance approval interaction. It is metadata only.",
  unknown: "This fictional session recorded a prototype interaction. It is metadata only.",
});

const VERDICT_OUTCOMES = Object.freeze({
  safe: "The local prototype policy outcome for this fictional session was: safe. No prototype policy signal was raised.",
  warning:
    "The local prototype policy outcome for this fictional session was: warning. The prototype suggests an optional manual look.",
  critical:
    "The local prototype policy outcome for this fictional session was: critical. The prototype suggests an optional manual look.",
});

const PRIVACY_BOUNDARY_NOTE =
  "This explanation was generated from metadata only. The explanation layer received no credentials, OTPs, account identifiers, balances, payees, payment amounts, transaction text, screenshots, app names, process names, or window titles.";

const AUDIT_VERIFY_EXPLANATION =
  "The audit record lists the step-by-step events for this fictional session. Verification checks whether that audit record is internally consistent.";

const NON_CLAIMS = Object.freeze([
  "not fraud detection",
  "not scam prevention",
  "not financial advice",
  "not a real banking decision",
  "not payment verification",
]);

export function generateBankingNarrative(payload) {
  const verdict = payload?.verdict ?? "safe";
  const scenarioType = payload?.scenario_type ?? "unknown";
  const summary = SCENARIO_SUMMARIES[scenarioType] ?? SCENARIO_SUMMARIES.unknown;
  const outcome = VERDICT_OUTCOMES[verdict] ?? VERDICT_OUTCOMES.safe;
  const manualReview = Boolean(payload?.manual_review_required);
  const manualReviewNote = manualReview
    ? "This fictional session is flagged for an optional manual look. No automatic fraud finding is made."
    : "This fictional session is not flagged for a manual look.";

  return {
    plain_english_summary: summary,
    policy_outcome_explanation: outcome,
    privacy_boundary_note: PRIVACY_BOUNDARY_NOTE,
    audit_verify_explanation: AUDIT_VERIFY_EXPLANATION,
    manual_review_note: manualReviewNote,
    non_claims: [...NON_CLAIMS],
    official_result_unchanged: true,
  };
}
