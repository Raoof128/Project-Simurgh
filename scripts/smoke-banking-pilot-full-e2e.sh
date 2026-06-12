#!/usr/bin/env bash
# scripts/smoke-banking-pilot-full-e2e.sh
# Full Banking Shield Phase A E2E smoke gate.
set -euo pipefail

if [[ -n "${SIMURGH_BASE_URL:-}" ]]; then
  BASE="$SIMURGH_BASE_URL"
else
  PORT="${SIMURGH_BANKING_FULL_E2E_PORT:-33039}"
  BASE="http://127.0.0.1:$PORT"
  LOG="${TMPDIR:-/tmp}/simurgh-banking-full-e2e-$PORT.log"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_BANKING_PILOT_PEPPER="full-e2e-banking-pepper-32-chars" \
  SIMURGH_BANKING_PILOT_TOKEN_SECRET="full-e2e-banking-token-secret-32" \
  SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=false \
  SIMURGH_BANKING_PILOT_AI_EXPLAIN=true \
  PORT="$PORT" node server.js >"$LOG" 2>&1 &
  PID=$!
  cleanup_normal() {
    kill "$PID" >/dev/null 2>&1 || true
  }
  trap cleanup_normal EXIT
  for _ in {1..60}; do
    if curl -sf "$BASE/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  curl -sf "$BASE/health" >/dev/null || {
    echo "normal server did not start"
    tail -80 "$LOG" || true
    exit 1
  }
fi

if [[ -n "${SIMURGH_CLOSED_BASE_URL:-}" ]]; then
  CLOSED_BASE="$SIMURGH_CLOSED_BASE_URL"
else
  CLOSED_PORT="${SIMURGH_BANKING_FULL_E2E_CLOSED_PORT:-33040}"
  CLOSED_BASE="http://127.0.0.1:$CLOSED_PORT"
  CLOSED_LOG="${TMPDIR:-/tmp}/simurgh-banking-full-e2e-closed-$CLOSED_PORT.log"
  SIMURGH_DEMO_MODE=1 \
  SIMURGH_BANKING_PILOT_PEPPER="full-e2e-closed-banking-pepper" \
  SIMURGH_BANKING_PILOT_TOKEN_SECRET="full-e2e-closed-token-secret" \
  SIMURGH_BANKING_PILOT_COLLECTION_CLOSED=true \
  PORT="$CLOSED_PORT" node server.js >"$CLOSED_LOG" 2>&1 &
  CLOSED_PID=$!
  cleanup_closed() {
    kill "$CLOSED_PID" >/dev/null 2>&1 || true
  }
  trap 'cleanup_normal 2>/dev/null || true; cleanup_closed 2>/dev/null || true' EXIT
  for _ in {1..60}; do
    if curl -sf "$CLOSED_BASE/health" >/dev/null 2>&1; then break; fi
    sleep 0.25
  done
  curl -sf "$CLOSED_BASE/health" >/dev/null || {
    echo "closed server did not start"
    tail -80 "$CLOSED_LOG" || true
    exit 1
  }
fi

node scripts/privacy-audit-banking-pilot.mjs >/tmp/simurgh-banking-full-e2e-privacy.log
cat /tmp/simurgh-banking-full-e2e-privacy.log

BASE="$BASE" CLOSED_BASE="$CLOSED_BASE" node --input-type=module - <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { appendEntry, createChain, verifyChain } from "./src/audit/hmacChain.js";
import { BANKING_PILOT_EVENTS } from "./src/bankingPilot/bankingAudit.js";
import { buildBankingNarrativePayload } from "./src/bankingPilot/bankingNarrativeSanitiser.js";

const base = process.env.BASE;
const closedBase = process.env.CLOSED_BASE;
const api = `${base}/api/banking-pilot`;
const closedApi = `${closedBase}/api/banking-pilot`;
const validScopeHash =
  "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

let pass = 0;
let fail = 0;
let rejectionNoEchoChecks = 0;

function ok(message) {
  pass += 1;
  console.log(`[PASS] ${message}`);
}

function failNow(message, detail) {
  fail += 1;
  console.error(`[FAIL] ${message}`);
  if (detail !== undefined) console.error(JSON.stringify(detail, null, 2));
  throw new Error(message);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }
  return { status: res.status, ok: res.ok, body, text };
}

async function getPage(path, label) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) failNow(`${label} page did not load`, { status: res.status });
  const text = await res.text();
  ok(`${label} page loads`);
  return text;
}

async function postJson(path, body, token, rootApi = api) {
  return fetchJson(`${rootApi}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function getJson(path, token, rootApi = api) {
  return fetchJson(`${rootApi}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function accept() {
  const res = await postJson("/consent/accept", {});
  assert.equal(res.status, 200);
  assert.match(res.body.banking_session_id, /^bp_/);
  assert.equal(typeof res.body.token, "string");
  const [payloadB64] = res.body.token.split(".");
  const tokenPayload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  assert.equal(tokenPayload.version, "banking-pilot-token-v1");
  assert.equal(tokenPayload.purpose, "banking_pilot_session");
  assert.equal(tokenPayload.phase, "phase_a_synthetic");
  assert.equal(tokenPayload.banking_session_id, res.body.banking_session_id);
  assert.equal(JSON.stringify(tokenPayload).includes("account_number"), false);
  return res.body;
}

function scenarioPayload(type, sessionId) {
  if (type === "mock_cdr_consent") {
    return {
      banking_session_id: sessionId,
      scenario_type: type,
      submit_intent: true,
      consent_scope_hash: validScopeHash,
      consent_duration_category: "one_time",
      withdrawal_option_shown: true,
    };
  }
  if (type === "mock_confirmation_of_payee") {
    return {
      banking_session_id: sessionId,
      scenario_type: type,
      mock_cop_result_category: "close_match",
      risk_prompt_shown: true,
      user_action: "pause",
    };
  }
  if (type === "remote_access_warning") {
    return {
      banking_session_id: sessionId,
      scenario_type: type,
      user_selected_context: "caller_requested_remote_access",
      risk_prompt_shown: true,
      user_action: "request_review",
    };
  }
  if (type === "mock_payment_pause") {
    return {
      banking_session_id: sessionId,
      scenario_type: type,
      risk_prompt_shown: true,
      user_action: "pause",
    };
  }
  return {
    banking_session_id: sessionId,
    scenario_type: "mock_ai_agent_finance_action",
    agent_action_type: "payment_draft",
    user_decision: "reject",
    financial_payload_recorded_by_simurgh: false,
  };
}

async function submitFreshScenario(type) {
  const c = await accept();
  const res = await postJson("/submit", scenarioPayload(type, c.banking_session_id), c.token);
  if (res.status !== 200) failNow(`${type} did not submit`, res);
  assert.equal(res.body.banking_payload_recorded_by_simurgh, false);
  ok(`${type} submits with fresh session`);
  return c;
}

function assertNoEcho(response, sensitiveValue, label) {
  if (JSON.stringify(response.body).includes(sensitiveValue)) {
    failNow(`${label} echoed sensitive value`, response.body);
  }
  rejectionNoEchoChecks += 1;
}

async function expectRejected(payload, expectedError, expectedField, sensitiveValue, label) {
  const c = await accept();
  const res = await postJson(
    "/submit",
    { banking_session_id: c.banking_session_id, ...payload },
    c.token
  );
  assert.equal(res.status, 400, `${label} status`);
  assert.equal(res.body.error, expectedError, `${label} error`);
  assert.equal(res.body.field, expectedField, `${label} field`);
  if (sensitiveValue) assertNoEcho(res, sensitiveValue, label);
  ok(`${label} rejected`);
  return { c, res };
}

await getPage("/banking-pilot-consent.html", "public consent");
await getPage("/banking-pilot-scenario.html", "public scenario");
const reportPageText = await getPage("/banking-pilot-report.html", "public report");
for (const expected of [
  "AI Privacy Explanation",
  "Metadata-only narrative receipt",
  "Sensitive payload sent to AI",
  "Network egress used",
]) {
  assert.equal(reportPageText.includes(expected), true, `report page missing ${expected}`);
}
ok("public report page exposes the B4-B AI privacy explanation UI contract");

const firstConsent = await accept();
ok("consent accept creates bp_ session id and scoped token");

const submittedSessions = [];
for (const type of [
  "mock_cdr_consent",
  "mock_confirmation_of_payee",
  "remote_access_warning",
  "mock_payment_pause",
  "mock_ai_agent_finance_action",
]) {
  submittedSessions.push(await submitFreshScenario(type));
}

const doubleSubmit = await accept();
const doublePayload = scenarioPayload("mock_payment_pause", doubleSubmit.banking_session_id);
assert.equal((await postJson("/submit", doublePayload, doubleSubmit.token)).status, 200);
const doubleRes = await postJson("/submit", doublePayload, doubleSubmit.token);
assert.equal(doubleRes.status, 409);
ok("one-session-one-submit rejects a second submit");

await expectRejected({ scenario_type: "real_payment" }, "invalid_scenario_type", "scenario_type", null, "unknown scenario_type");
await expectRejected(
  { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", note: "extra" },
  "unknown_field",
  "note",
  "extra",
  "unknown extra field"
);
await expectRejected(
  {
    scenario_type: "mock_cdr_consent",
    submit_intent: true,
    consent_scope_hash: "sha256:abc",
    consent_duration_category: "one_time",
    withdrawal_option_shown: true,
  },
  "invalid_consent_scope_hash",
  "consent_scope_hash",
  "sha256:abc",
  "weak consent_scope_hash"
);

for (const key of ["__proto__", "prototype", "constructor"]) {
  const payload = JSON.parse(
    `{"scenario_type":"mock_payment_pause","risk_prompt_shown":true,"user_action":"pause","${key}":{"polluted":true}}`
  );
  await expectRejected(payload, "invalid_payload_key", key, null, `pollution key ${key}`);
}

const forbiddenAttacks = [
  {
    label: "top-level account_number",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", account_number: "111111" },
    field: "account_number",
    value: "111111",
  },
  {
    label: "nested otp",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", nested: { otp: "123456" } },
    field: "otp",
    value: "123456",
  },
  {
    label: "array-contained card_number",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", rows: [{ card_number: "4111111111111111" }] },
    field: "card_number",
    value: "4111111111111111",
  },
  {
    label: "transaction_amount",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", transaction_amount: "99.00" },
    field: "transaction_amount",
    value: "99.00",
  },
  {
    label: "payee_name",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", payee_name: "MockSensitivePayee" },
    field: "payee_name",
    value: "MockSensitivePayee",
  },
  {
    label: "payment_reference",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", payment_reference: "REF-SECRET" },
    field: "payment_reference",
    value: "REF-SECRET",
  },
  {
    label: "window_title",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", window_title: "Mock Bank Window" },
    field: "window_title",
    value: "Mock Bank Window",
  },
  {
    label: "process_name",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", process_name: "remote-support-app" },
    field: "process_name",
    value: "remote-support-app",
  },
  {
    label: "remote_app_name",
    payload: { scenario_type: "mock_payment_pause", risk_prompt_shown: true, user_action: "pause", remote_app_name: "AnyDesk Example" },
    field: "remote_app_name",
    value: "AnyDesk Example",
  },
];

let rejectedAuditSession;
for (const attack of forbiddenAttacks) {
  const result = await expectRejected(
    attack.payload,
    "forbidden_banking_field",
    attack.field,
    attack.value,
    attack.label
  );
  if (attack.field === "otp") rejectedAuditSession = result.c;
}
assert.equal(rejectionNoEchoChecks >= forbiddenAttacks.length, true);
ok("rejection responses never echo submitted sensitive values");

const rejectedAudit = await getJson(
  `/${rejectedAuditSession.banking_session_id}/audit`,
  rejectedAuditSession.token
);
assert.equal(rejectedAudit.status, 200);
const rejectedEntry = rejectedAudit.body.entries.find(
  (entry) => entry.type === "BANKING_FORBIDDEN_FIELD_REJECTED"
);
assert.deepEqual(Object.keys(rejectedEntry.payload).sort(), ["field_name", "reason", "route"]);
assert.deepEqual(rejectedEntry.payload, {
  route: "submit",
  reason: "forbidden_banking_field",
  field_name: "otp",
});
assert.equal(JSON.stringify(rejectedEntry).includes("123456"), false);
ok("rejected-attempt audit entries contain route, reason, and field name only");

const escalated = await postJson(
  "/submit",
  scenarioPayload("mock_payment_pause", rejectedAuditSession.banking_session_id),
  rejectedAuditSession.token
);
assert.equal(escalated.status, 200);
const escalatedReport = await getJson(
  `/${rejectedAuditSession.banking_session_id}/report`,
  rejectedAuditSession.token
);
assert.equal(escalatedReport.status, 200);
assert.equal(
  escalatedReport.body.risk.risk_categories.includes("forbidden_payload_attempt"),
  true
);
assert.equal(escalatedReport.body.privacy_contract.forbidden_fields_rejected, 1);
ok("prior forbidden attempt escalates risk on later valid submit");

const deepSession = await accept();
let nestedDeep = { leaf: true };
for (let i = 0; i < 25; i += 1) nestedDeep = { layer: nestedDeep };
const deepRes = await postJson(
  "/submit",
  {
    ...scenarioPayload("mock_payment_pause", deepSession.banking_session_id),
    deep: nestedDeep,
  },
  deepSession.token
);
assert.equal(deepRes.status, 400);
assert.equal(deepRes.body.error, "payload_too_deep");
ok("over-deep payload rejected with payload_too_deep");

const reportSession = submittedSessions[0];
const report = await getJson(`/${reportSession.banking_session_id}/report`, reportSession.token);
assert.equal(report.status, 200);
ok("report export works for submitted session");

for (const key of [
  "credential_recorded_by_simurgh",
  "otp_recorded_by_simurgh",
  "account_identifier_recorded_by_simurgh",
  "balance_recorded_by_simurgh",
  "transaction_amount_recorded_by_simurgh",
  "payee_recorded_by_simurgh",
  "payment_reference_recorded_by_simurgh",
  "transaction_content_recorded_by_simurgh",
  "screen_capture_recorded_by_simurgh",
  "webcam_audio_recorded_by_simurgh",
  "raw_process_or_window_title_recorded_by_simurgh",
  "remote_access_app_name_recorded_by_simurgh",
  "banking_payload_recorded_by_simurgh",
  "sonnet_received_sensitive_payload",
]) {
  assert.equal(report.body.privacy_contract[key], false, `${key} was not false`);
}
ok("report privacy assertions are all false");

const audit = await getJson(`/${reportSession.banking_session_id}/audit`, reportSession.token);
assert.equal(audit.status, 200);
assert.equal(audit.body.chain_valid, true);
assert.equal(JSON.stringify(audit.body).includes("full-e2e-banking-token-secret"), false);
assert.equal(JSON.stringify(audit.body).includes("MockSensitivePayee"), false);
ok("/audit returns safe audit entries only");

const verify = await getJson(`/${reportSession.banking_session_id}/verify`, reportSession.token);
assert.equal(verify.status, 200);
assert.equal(verify.body.audit_chain_valid, true);
ok("/verify returns valid audit-chain status");

const aiExplain = await getJson(
  `/${reportSession.banking_session_id}/ai-privacy-explain`,
  reportSession.token
);
assert.equal(aiExplain.status, 200);
assert.equal(typeof aiExplain.body.narrative.plain_english_summary, "string");
assert.equal(aiExplain.body.receipt.sensitive_payload_sent_to_ai, false);
assert.equal(aiExplain.body.receipt.network_egress_used, false);
assert.equal(aiExplain.body.receipt.official_result_unchanged, true);
assert.equal(aiExplain.body.receipt.claim_guard_passed, true);
assert.match(aiExplain.body.receipt.narrative_hash, /^sha256:[a-f0-9]{64}$/);
ok("B4-B AI privacy explanation response carries safe narrative receipt");

const chain = createChain();
const key = "full-e2e-tamper-key";
appendEntry(chain, key, BANKING_PILOT_EVENTS.CONSENT_ACCEPTED, {});
appendEntry(chain, key, BANKING_PILOT_EVENTS.SCENARIO_SUBMITTED, {
  scenario_type: "mock_payment_pause",
});
assert.equal(verifyChain(chain, key).valid, true);
chain.entries[1].payload.scenario_type = "tampered";
assert.equal(verifyChain(chain, key).valid, false);
ok("tampered audit fixture fails verification");

const mismatchA = await accept();
const mismatchB = await accept();
const mismatch = await getJson(`/${mismatchB.banking_session_id}/report`, mismatchA.token);
assert.equal(mismatch.status, 403);
ok("token/session mismatch returns 403");

const withdrawn = await accept();
const withdrawRes = await postJson("/withdraw", {}, withdrawn.token);
assert.equal(withdrawRes.status, 200);
const withdrawnReport = await getJson(`/${withdrawn.banking_session_id}/report`, withdrawn.token);
assert.equal(withdrawnReport.status, 403);
ok("withdrawn session report returns 403");

const withdrawnAudit = await getJson(`/${withdrawn.banking_session_id}/audit`, withdrawn.token);
assert.equal(withdrawnAudit.status, 200);
assert.equal(withdrawnAudit.body.chain_valid, true);
const withdrawnVerify = await getJson(`/${withdrawn.banking_session_id}/verify`, withdrawn.token);
assert.equal(withdrawnVerify.status, 200);
assert.equal(withdrawnVerify.body.audit_chain_valid, true);
ok("withdrawn session keeps audit and verify exports for transparency");

for (const route of ["/consent/accept", "/submit", "/withdraw"]) {
  const closed = await postJson(route, {}, null, closedApi);
  assert.equal(closed.status, 410, `${route} did not return 410`);
  assert.equal(closed.body.error, "banking_pilot_collection_closed");
}
ok("closure mode returns 410 before auth for write routes");

const readNoToken = await getJson("/bp_missing/report", null, closedApi);
assert.equal(readNoToken.status, 401);
ok("read routes remain token-protected in closure mode");

const sonnetPayload = buildBankingNarrativePayload({
  banking_session_id: "bp_full_e2e",
  scenario: {
    scenario_type: "remote_access_warning",
    user_action: "request_review",
    otp: "VerySecretOtp",
    payee_name: "MockSensitivePayee",
  },
  risk: {
    risk_score: 75,
    verdict: "critical",
    risk_categories: ["remote_access_context"],
    manual_review_required: true,
  },
  privacy_assertions: report.body.privacy_contract,
});
const sonnetText = JSON.stringify(sonnetPayload);
for (const term of ["VerySecretOtp", "MockSensitivePayee", "otp", "payee_name", "account_number"]) {
  assert.equal(sonnetText.includes(term), false, `Sonnet payload leaked ${term}`);
}
ok("Sonnet sanitisation fixture contains metadata only with no forbidden field names or values");

for (const file of [
  "accepted-report-fixture.json",
  "rejected-attempt-audit-fixture.json",
  "sonnet-sanitised-payload-fixture.json",
  "closure-response-fixture.json",
]) {
  const text = readFileSync(`docs/research/banking-pilot/evidence/phase-a-synthetic/${file}`, "utf8");
  for (const value of [
    "111111",
    "123456",
    "4111111111111111",
    "VerySecretOtp",
    "MockSensitivePayee",
  ]) {
    assert.equal(text.includes(value), false, `${file} contains ${value}`);
  }
}
ok("generated evidence fixtures contain no sensitive values");

console.log("");
console.log(`smoke-banking-pilot-full-e2e: ${pass} passed, ${fail} failed`);
NODE
