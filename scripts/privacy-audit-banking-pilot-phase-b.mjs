#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FORBIDDEN_BANKING_FIELD_NAMES } from "../src/bankingPilot/forbiddenBankingFields.js";

const EVIDENCE_DIR = "docs/research/banking-pilot/evidence/phase-b-internal-dry-run";

const ALLOWED_METADATA_KEYS = new Set([
  "phase",
  "synthetic",
  "human_participant",
  "data_source",
  "real_banking_data_collected",
  "real_financial_decision_affected",
  "aggregate_only",
  "status",
  "trusted_testers_target",
  "minimum",
  "maximum",
  "trusted_testers_completed",
  "scenario_completion_counts",
  "mock_cdr_consent",
  "mock_confirmation_of_payee",
  "remote_access_warning",
  "mock_payment_pause",
  "mock_ai_agent_finance_action",
  "flow_completion_counts",
  "consent_opened",
  "consent_accepted",
  "report_opened",
  "audit_opened",
  "verify_opened",
  "withdrawal_completed",
  "feedback_completed",
  "privacy_counts",
  "real_banking_values_entered",
  "sensitive_values_found_in_evidence",
  "forbidden_payload_structures_found",
  "sonnet_sensitive_payload_events",
  "comprehension_counts",
  "fictional_only_understood",
  "no_bank_connection_understood",
  "no_fraud_detection_understood",
  "no_financial_advice_understood",
  "withdrawal_understood",
  "report_audit_verify_understood",
  "gate_results",
  "phase_b_privacy_audit",
  "phase_a_privacy_audit",
  "phase_a_smoke",
  "phase_a_security_audit",
  "phase_a_full_e2e",
  "feedback_category_counts",
  "consent_wording_clear",
  "consent_wording_needs_simplification",
  "fictional_scope_clear",
  "fictional_scope_needs_repetition",
  "warning_language_clear",
  "warning_language_too_strong",
  "report_understandable",
  "report_confusing",
  "audit_understandable",
  "audit_confusing",
  "verify_understandable",
  "verify_confusing",
  "withdrawal_understandable",
  "withdrawal_confusing",
  "non_claims_understandable",
  "non_claims_need_more_prominence",
  "comprehension_rating_counts",
  "consent_page",
  "scenario_warnings",
  "report_output",
  "audit_output",
  "verify_output",
  "withdrawal_behavior",
  "non_claims",
  "clear",
  "partly_clear",
  "unclear",
  "safe_note_category_counts",
  "label_needs_clarification",
  "scope_needs_repetition",
  "report_language_needs_clarification",
  "audit_language_needs_clarification",
  "verify_language_needs_clarification",
  "withdrawal_language_needs_clarification",
]);

const FORBIDDEN_JSON_KEYS = new Set(
  FORBIDDEN_BANKING_FIELD_NAMES.filter((field) => !ALLOWED_METADATA_KEYS.has(field))
);

const FORBIDDEN_CONTAINER_KEYS = new Set([
  "raw_payload",
  "request_payload",
  "submitted_payload",
  "banking_payload",
  "sonnet_payload",
  "narrative_payload",
  "session_payload",
  "raw_request_body",
  "screen_capture",
  "screen_recording",
  "screenshot_file",
  "per_tester_free_text",
]);

const SENSITIVE_VALUE_PATTERNS = [
  ["card_like_number", /\b(?:\d[ -]?){13,19}\b/],
  ["bsb_like_value", /\b\d{3}[- ]?\d{3}\b/],
  ["otp_like_labelled_value", /\b(?:otp|mfa|code)\s*[:=]\s*[A-Za-z0-9]{4,12}\b/i],
  [
    "account_like_labelled_value",
    /\b(?:account|acct)\s*(?:number|id)?\s*[:=]\s*[A-Za-z0-9-]{6,32}\b/i,
  ],
  ["currency_amount", /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?\b/],
  [
    "real_bank_branding",
    /\b(?:CommBank|Commonwealth Bank|Westpac|NAB|ANZ|St\. George|Bendigo Bank|Macquarie Bank)\b/i,
  ],
  [
    "remote_access_app_branding",
    /\b(?:AnyDesk|TeamViewer|ScreenConnect|ConnectWise Control|Zoho Assist|Splashtop)\b/i,
  ],
];

function listFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) files.push(...listFiles(path));
    if (stats.isFile()) files.push(path);
  }
  return files;
}

function walkJsonKeys(value, file, pathParts, failures) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      walkJsonKeys(item, file, [...pathParts, String(index)], failures)
    );
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    const location = [...pathParts, key].join(".");
    if (FORBIDDEN_JSON_KEYS.has(key)) {
      failures.push(`${file}: forbidden banking evidence key "${key}" at ${location}`);
    }
    if (FORBIDDEN_CONTAINER_KEYS.has(key)) {
      failures.push(`${file}: forbidden raw payload container "${key}" at ${location}`);
    }
    walkJsonKeys(nested, file, [...pathParts, key], failures);
  }
}

function scanJson(file, text, failures) {
  try {
    const parsed = JSON.parse(text);
    walkJsonKeys(parsed, file, [], failures);
  } catch (error) {
    failures.push(`${file}: invalid JSON (${error.message})`);
  }
}

const files = listFiles(EVIDENCE_DIR);
const failures = [];

if (files.length === 0) {
  failures.push(`${EVIDENCE_DIR}: no Phase B evidence scaffold files found`);
}

for (const file of files) {
  const text = readFileSync(file, "utf8");

  for (const [name, pattern] of SENSITIVE_VALUE_PATTERNS) {
    if (pattern.test(text)) failures.push(`${file}: sensitive value pattern "${name}"`);
  }

  if (file.endsWith(".json")) scanJson(file, text, failures);
}

if (failures.length > 0) {
  console.error("privacy-audit-banking-pilot-phase-b: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("privacy-audit-banking-pilot-phase-b: PASS");
console.log(`scanned files: ${files.length}`);
console.log("phase b evidence contains no sensitive values or forbidden payload structures");
