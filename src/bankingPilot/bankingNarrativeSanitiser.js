// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

export function hashBankingSessionId(sessionId) {
  return "sha256:" + crypto.createHash("sha256").update(String(sessionId)).digest("hex");
}

export function buildBankingNarrativePayload({
  banking_session_id,
  scenario,
  risk,
  privacy_assertions,
}) {
  const userActionCategory = scenario?.user_action ?? scenario?.user_decision ?? "not_applicable";
  return {
    session_id_hash: hashBankingSessionId(banking_session_id),
    scenario_type: scenario?.scenario_type ?? "unknown",
    risk_score: risk.risk_score,
    verdict: risk.verdict,
    risk_categories: Array.isArray(risk.risk_categories) ? [...risk.risk_categories] : [],
    user_action_category: userActionCategory,
    privacy_assertions: {
      credential_recorded_by_simurgh: privacy_assertions.credential_recorded_by_simurgh,
      account_identifier_recorded_by_simurgh:
        privacy_assertions.account_identifier_recorded_by_simurgh,
      transaction_content_recorded_by_simurgh:
        privacy_assertions.transaction_content_recorded_by_simurgh,
      sonnet_received_sensitive_payload: false,
    },
    manual_review_required: Boolean(risk.manual_review_required),
  };
}
