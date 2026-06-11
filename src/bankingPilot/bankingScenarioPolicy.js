import {
  containsForbiddenBankingFieldDeep,
  isStructuralPollutionKey,
  MAX_DEPTH_SENTINEL,
} from "./forbiddenBankingFields.js";

export const VALID_CONSENT_SCOPE_HASH = /^sha256:[a-f0-9]{64}$/;

const SCENARIOS = Object.freeze({
  mock_cdr_consent: {
    required: Object.freeze([
      "scenario_type",
      "submit_intent",
      "consent_scope_hash",
      "consent_duration_category",
      "withdrawal_option_shown",
    ]),
    allowed: Object.freeze([
      "scenario_type",
      "submit_intent",
      "consent_scope_hash",
      "consent_duration_category",
      "withdrawal_option_shown",
    ]),
    categories: Object.freeze({
      consent_duration_category: Object.freeze(["one_time", "limited_duration"]),
    }),
  },
  mock_confirmation_of_payee: {
    required: Object.freeze([
      "scenario_type",
      "mock_cop_result_category",
      "risk_prompt_shown",
      "user_action",
    ]),
    allowed: Object.freeze([
      "scenario_type",
      "mock_cop_result_category",
      "risk_prompt_shown",
      "user_action",
    ]),
    categories: Object.freeze({
      mock_cop_result_category: Object.freeze(["match", "close_match", "no_match", "unavailable"]),
      user_action: Object.freeze(["continue", "pause", "request_review"]),
    }),
  },
  remote_access_warning: {
    required: Object.freeze([
      "scenario_type",
      "user_selected_context",
      "risk_prompt_shown",
      "user_action",
    ]),
    allowed: Object.freeze([
      "scenario_type",
      "user_selected_context",
      "risk_prompt_shown",
      "user_action",
    ]),
    categories: Object.freeze({
      user_selected_context: Object.freeze([
        "caller_requested_remote_access",
        "unexpected_support_call",
        "remote_access_not_requested",
      ]),
      user_action: Object.freeze(["continue", "pause", "request_review"]),
    }),
  },
  mock_payment_pause: {
    required: Object.freeze(["scenario_type", "risk_prompt_shown", "user_action"]),
    allowed: Object.freeze(["scenario_type", "risk_prompt_shown", "user_action"]),
    categories: Object.freeze({
      user_action: Object.freeze(["continue", "pause", "request_review"]),
    }),
  },
  mock_ai_agent_finance_action: {
    required: Object.freeze([
      "scenario_type",
      "agent_action_type",
      "user_decision",
      "financial_payload_recorded_by_simurgh",
    ]),
    allowed: Object.freeze([
      "scenario_type",
      "agent_action_type",
      "user_decision",
      "financial_payload_recorded_by_simurgh",
    ]),
    categories: Object.freeze({
      agent_action_type: Object.freeze([
        "budget_summary",
        "bill_reminder",
        "payment_draft",
        "subscription_cancel_draft",
      ]),
      user_decision: Object.freeze(["approve", "reject", "request_review"]),
    }),
  },
});

export const BANKING_SCENARIO_TYPES = Object.freeze(Object.keys(SCENARIOS));

function validateRequiredFields(body, required) {
  for (const field of required) {
    if (!Object.hasOwn(body, field)) return { ok: false, reason: "missing_required_field", field };
  }
  return null;
}

function validateAllowedFields(body, allowed) {
  const allowedSet = new Set(allowed);
  for (const field of Object.keys(body)) {
    if (!allowedSet.has(field)) return { ok: false, reason: "unknown_field", field };
  }
  return null;
}

function validateCategories(body, categories) {
  for (const [field, allowedValues] of Object.entries(categories)) {
    if (Object.hasOwn(body, field) && !allowedValues.includes(body[field])) {
      return { ok: false, reason: "invalid_category", field };
    }
  }
  return null;
}

function validateBoolean(body, field) {
  if (typeof body[field] !== "boolean") return { ok: false, reason: "invalid_type", field };
  return null;
}

export function validateBankingScenarioPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, reason: "invalid_payload" };
  }

  const forbiddenField = containsForbiddenBankingFieldDeep(body);
  if (forbiddenField === MAX_DEPTH_SENTINEL) {
    return { ok: false, reason: "payload_too_deep", field: null };
  }
  if (forbiddenField) {
    return {
      ok: false,
      reason: isStructuralPollutionKey(forbiddenField) ? "invalid_payload_key" : "forbidden_field",
      field: forbiddenField,
    };
  }

  if (typeof body.scenario_type !== "string" || !SCENARIOS[body.scenario_type]) {
    return { ok: false, reason: "invalid_scenario_type", field: "scenario_type" };
  }

  const contract = SCENARIOS[body.scenario_type];
  const allowedError = validateAllowedFields(body, contract.allowed);
  if (allowedError) return allowedError;

  const requiredError = validateRequiredFields(body, contract.required);
  if (requiredError) return requiredError;

  const categoryError = validateCategories(body, contract.categories);
  if (categoryError) return categoryError;

  if (body.scenario_type === "mock_cdr_consent") {
    if (body.submit_intent !== true) {
      return { ok: false, reason: "invalid_submit_intent", field: "submit_intent" };
    }
    if (!VALID_CONSENT_SCOPE_HASH.test(body.consent_scope_hash)) {
      return {
        ok: false,
        reason: "invalid_consent_scope_hash",
        field: "consent_scope_hash",
      };
    }
    const withdrawalTypeError = validateBoolean(body, "withdrawal_option_shown");
    if (withdrawalTypeError) return withdrawalTypeError;
  }

  if (
    ["mock_confirmation_of_payee", "remote_access_warning", "mock_payment_pause"].includes(
      body.scenario_type
    )
  ) {
    const riskPromptError = validateBoolean(body, "risk_prompt_shown");
    if (riskPromptError) return riskPromptError;
  }

  if (body.scenario_type === "mock_ai_agent_finance_action") {
    if (body.financial_payload_recorded_by_simurgh !== false) {
      return {
        ok: false,
        reason: "invalid_privacy_assertion",
        field: "financial_payload_recorded_by_simurgh",
      };
    }
  }

  return { ok: true, scenario: body.scenario_type };
}
