// SPDX-License-Identifier: AGPL-3.0-or-later
import { buildBankingNarrativePayload } from "./bankingNarrativeSanitiser.js";
import { containsForbiddenBankingFieldDeep, MAX_DEPTH_SENTINEL } from "./forbiddenBankingFields.js";
import { generateBankingNarrative } from "./bankingNarrativeGenerator.js";
import { runOutputFirewall } from "./bankingNarrativeOutputFirewall.js";
import { buildEnabledReceipt, buildFirewallFailedReceipt } from "./bankingAiPrivacyReceipt.js";
import { BANKING_PRIVACY_ASSERTIONS } from "./bankingReportBuilder.js";

const MAX_NARRATIVE_PAYLOAD_BYTES = 4096;

// Reads the default-off feature flag. Mirrors bankingCollectionClosed: explicit
// string "true" only; anything else (including "1" or unset) is disabled.
export function isAiExplainEnabled() {
  return process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN === "true";
}

export function buildBankingAiExplanation(record) {
  const scenario = {
    scenario_type: record.scenario_metadata?.scenario_type,
    user_action: record.scenario_metadata?.user_action,
    user_decision: record.scenario_metadata?.user_decision,
  };

  // INPUT FIREWALL — allowlist-only payload (session id hashed, enums only).
  const payload = buildBankingNarrativePayload({
    banking_session_id: record.banking_session_id,
    scenario,
    risk: record.risk,
    privacy_assertions: BANKING_PRIVACY_ASSERTIONS,
  });

  // Defensive re-scan of the assembled payload + byte cap. Fail-closed.
  const forbidden = containsForbiddenBankingFieldDeep(payload);
  if (forbidden === MAX_DEPTH_SENTINEL || forbidden) {
    return {
      ok: false,
      status: 422,
      receipt: buildFirewallFailedReceipt({ gate: "input", inputFirewallPassed: false }),
    };
  }
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > MAX_NARRATIVE_PAYLOAD_BYTES) {
    return {
      ok: false,
      status: 422,
      receipt: buildFirewallFailedReceipt({ gate: "input", inputFirewallPassed: false }),
    };
  }

  // GENERATE (deterministic, offline)
  const narrative = generateBankingNarrative(payload);

  // OUTPUT FIREWALL — schema, length, claim scan, official-result-unchanged.
  const recordOfficial = {
    risk_score: record.risk?.risk_score,
    verdict: record.risk?.verdict,
    manual_review_required: record.risk?.manual_review_required,
  };
  const payloadOfficial = {
    risk_score: payload.risk_score,
    verdict: payload.verdict,
    manual_review_required: payload.manual_review_required,
  };
  const fw = runOutputFirewall({ narrative, payloadOfficial, recordOfficial });
  if (!fw.ok) {
    return { ok: false, status: 422, receipt: buildFirewallFailedReceipt({ gate: fw.gate }) };
  }

  return {
    ok: true,
    status: 200,
    narrative,
    receipt: buildEnabledReceipt({
      narrative,
      officialResultUnchanged: true,
      claimGuardPassed: true,
    }),
  };
}
