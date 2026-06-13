// SPDX-License-Identifier: AGPL-3.0-or-later
export const BANKING_RECOMMENDATIONS = Object.freeze({
  safe: "No banking-integrity anomaly detected.",
  warning: "Manual review recommended. No automatic fraud finding.",
  critical: "Manual review required. No automatic fraud finding.",
});

function verdictFor(score) {
  if (score >= 70) return "critical";
  if (score >= 30) return "warning";
  return "safe";
}

export function scoreBankingRisk(payload = {}) {
  const categories = new Set();
  let score = 0;

  if (payload.scenario_type === "mock_cdr_consent") {
    score += 10;
    categories.add("consent_integrity");
  }

  if (payload.scenario_type === "mock_confirmation_of_payee") {
    score += 20;
    categories.add("payment_redirection_context");
    if (payload.mock_cop_result_category === "close_match") score += 15;
    if (payload.mock_cop_result_category === "no_match") score += 30;
  }

  if (payload.scenario_type === "remote_access_warning") {
    score += 35;
    categories.add("remote_access_context");
    if (payload.user_selected_context === "caller_requested_remote_access") score += 20;
  }

  if (payload.scenario_type === "mock_payment_pause") {
    score += 30;
    categories.add("payment_pause_context");
  }

  if (payload.scenario_type === "mock_ai_agent_finance_action") {
    score += 20;
    categories.add("ai_agent_approval_context");
  }

  if (payload.risk_prompt_shown) {
    score += 5;
    categories.add("risk_prompt_shown");
  }

  if (
    ["pause", "request_review", "reject"].includes(payload.user_action || payload.user_decision)
  ) {
    categories.add("manual_review_signal");
  }

  if (payload.forbiddenPayloadAttempt) {
    score += 35;
    categories.add("forbidden_payload_attempt");
  }

  const risk_score = Math.min(100, score);
  const verdict = verdictFor(risk_score);

  return {
    risk_score,
    verdict,
    risk_categories: Array.from(categories),
    manual_review_required: verdict !== "safe",
    manual_review_recommendation: BANKING_RECOMMENDATIONS[verdict],
  };
}
