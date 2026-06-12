#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scoreBankingRisk } from "../src/bankingPilot/bankingRiskScoring.js";
import { buildBankingAiExplanation } from "../src/bankingPilot/bankingAiExplain.js";
import {
  runOutputFirewall,
  FORBIDDEN_CLAIM_PHRASES,
} from "../src/bankingPilot/bankingNarrativeOutputFirewall.js";

const evidenceDir = "docs/research/banking-pilot/evidence/phase-b4a-ai-firewall";
mkdirSync(evidenceDir, { recursive: true });

const failures = [];

// (a) No-egress static gate over the B4-A modules.
const aiModules = [
  "src/bankingPilot/bankingNarrativeGenerator.js",
  "src/bankingPilot/bankingNarrativeOutputFirewall.js",
  "src/bankingPilot/bankingAiPrivacyReceipt.js",
  "src/bankingPilot/bankingAiExplain.js",
];
const networkPattern =
  /\b(fetch|node:http|node:https|node:net|node:dgram|undici|axios|XMLHttpRequest|WebSocket)\b/;
for (const file of aiModules) {
  if (networkPattern.test(readFileSync(file, "utf8"))) {
    failures.push(`${file} references a network primitive`);
  }
}

// (b) Accepted fixture from a synthetic submitted record.
const acceptedRisk = scoreBankingRisk({
  scenario_type: "mock_payment_pause",
  risk_prompt_shown: true,
  user_action: "pause",
});
const acceptedRecord = {
  banking_session_id: "bp_b4a_fixture",
  scenario_metadata: {
    scenario_type: "mock_payment_pause",
    risk_prompt_shown: true,
    user_action: "pause",
  },
  risk: acceptedRisk,
};
const accepted = buildBankingAiExplanation(acceptedRecord);
if (!accepted.ok) failures.push("accepted fixture unexpectedly failed the firewall");

// (c) Rejected-claim fixture: feed a deliberately poisoned narrative through the
// output firewall and capture the rejection. This proves the claim guard blocks.
const poisonedNarrative = {
  plain_english_summary: "This prototype performed fraud detection on your account.",
  policy_outcome_explanation: "safe payment confirmed",
  privacy_boundary_note: "metadata only",
  audit_verify_explanation: "consistent",
  manual_review_note: "n/a",
  non_claims: ["not financial advice"],
  official_result_unchanged: true,
};
const rejection = runOutputFirewall({
  narrative: poisonedNarrative,
  payloadOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
  recordOfficial: { risk_score: 35, verdict: "warning", manual_review_required: true },
});
if (rejection.ok) failures.push("poisoned narrative was NOT blocked by the claim guard");

const fixtures = {
  "accepted-explanation-fixture.json": {
    narrative: accepted.narrative,
    receipt: accepted.receipt,
  },
  "rejected-claim-fixture.json": {
    injected_phrase: "fraud detection",
    firewall_result: rejection,
    forbidden_phrase_count: FORBIDDEN_CLAIM_PHRASES.length,
  },
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
const generatedFiles = [];
for (const [file, data] of Object.entries(fixtures)) {
  const path = join(evidenceDir, file);
  writeFileSync(path, await formatJson(data));
  generatedFiles.push(path);
}

// (d) Attack-value scan over generated evidence.
const attackValues = [
  "111111",
  "123456",
  "4111111111111111",
  "VerySecretOtp",
  "MockSensitivePayee",
  "bp_b4a_fixture",
];
for (const file of generatedFiles) {
  const text = readFileSync(file, "utf8");
  for (const value of attackValues) {
    if (text.includes(value)) failures.push(`${file} contains attack/raw value ${value}`);
  }
}

if (failures.length > 0) {
  console.error("privacy-audit-banking-pilot-ai-firewall: FAIL");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("privacy-audit-banking-pilot-ai-firewall: PASS");
console.log(`ai firewall modules contain no network primitives (${aiModules.length} scanned)`);
console.log(`generated fixtures: ${generatedFiles.length}`);
console.log(
  "rejected-claim fixture confirms the output claim guard blocks affirmative-capability phrasing"
);
console.log("attack/raw values absent from generated evidence");
