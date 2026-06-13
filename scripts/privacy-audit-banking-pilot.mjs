#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createChain, appendEntry } from "../src/audit/hmacChain.js";
import {
  BANKING_PILOT_EVENTS,
  buildRejectedAttemptAuditPayload,
} from "../src/bankingPilot/bankingAudit.js";
import {
  buildBankingAuditExport,
  buildBankingReport,
  buildBankingVerifyExport,
} from "../src/bankingPilot/bankingReportBuilder.js";
import { buildBankingNarrativePayload } from "../src/bankingPilot/bankingNarrativeSanitiser.js";

const evidenceDir = "docs/research/banking-pilot/evidence/phase-a-synthetic";
mkdirSync(evidenceDir, { recursive: true });

const hmacKey = "privacy-audit-hmac-key";
const auditChain = createChain();
appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.CONSENT_ACCEPTED, {});
appendEntry(auditChain, hmacKey, BANKING_PILOT_EVENTS.SCENARIO_SUBMITTED, {
  scenario_type: "mock_payment_pause",
  risk_score: 35,
  verdict: "warning",
});
appendEntry(
  auditChain,
  hmacKey,
  BANKING_PILOT_EVENTS.FORBIDDEN_FIELD_REJECTED,
  buildRejectedAttemptAuditPayload({
    route: "submit",
    reason: "forbidden_banking_field",
    fieldName: "otp",
  })
);

const record = {
  banking_session_id: "bp_privacy_fixture",
  participant_code_hash: "hmac-sha256:privacy-fixture",
  phase: "phase_a_synthetic",
  consent_version: "2026-06-b1-v1",
  accepted: true,
  withdrawn: false,
  submitted: true,
  scenario_metadata: {
    scenario_type: "mock_payment_pause",
    risk_prompt_shown: true,
    user_action: "pause",
  },
  risk: {
    risk_score: 35,
    verdict: "warning",
    risk_categories: ["payment_pause_context"],
    manual_review_required: true,
    manual_review_recommendation: "Manual review recommended. No automatic fraud finding.",
  },
  forbidden_fields_rejected: 1,
  auditChain,
  hmacKey,
};

const report = buildBankingReport(record);
const audit = buildBankingAuditExport(record);
const verify = buildBankingVerifyExport(record);
const sonnetPayload = buildBankingNarrativePayload({
  banking_session_id: "bp_privacy_fixture",
  scenario: {
    scenario_type: "mock_payment_pause",
    user_action: "pause",
    otp: "VerySecretOtp",
    payee_name: "MockSensitivePayee",
  },
  risk: record.risk,
  privacy_assertions: report.privacy_contract,
});
const closure = { ok: false, error: "banking_pilot_collection_closed" };

const fixtures = {
  "accepted-report-fixture.json": report,
  "rejected-attempt-audit-fixture.json": audit,
  "sonnet-sanitised-payload-fixture.json": sonnetPayload,
  "closure-response-fixture.json": closure,
};

async function formatJson(data) {
  const json = JSON.stringify(data, null, 2) + "\n";
  try {
    const prettier = await import("prettier");
    return await prettier.format(json, { parser: "json" });
  } catch {
    return json;
  }
}

for (const [file, data] of Object.entries(fixtures)) {
  writeFileSync(join(evidenceDir, file), await formatJson(data));
}

const attackValues = [
  "111111",
  "123456",
  "4111111111111111",
  "VerySecretOtp",
  "MockSensitivePayee",
];
const generatedFiles = Object.keys(fixtures).map((file) => join(evidenceDir, file));

const failures = [];
for (const file of generatedFiles) {
  const text = readFileSync(file, "utf8");
  for (const value of attackValues) {
    if (text.includes(value)) failures.push(`${file} contains attack value ${value}`);
  }
}

const publicFiles = [
  "public/banking-pilot-consent.html",
  "public/banking-pilot-scenario.html",
  "public/banking-pilot-report.html",
];
const realBankPattern = /\b(CommBank|Commonwealth Bank|ANZ|NAB|Westpac)\b/i;
for (const file of publicFiles) {
  const text = readFileSync(file, "utf8");
  if (realBankPattern.test(text)) failures.push(`${file} contains real bank branding`);
}

if (failures.length > 0) {
  console.error("privacy-audit-banking-pilot: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("privacy-audit-banking-pilot: PASS");
console.log(`generated fixtures: ${generatedFiles.length}`);
console.log("attack values absent from generated evidence");
console.log("public demo pages use fictional banking labels only");
