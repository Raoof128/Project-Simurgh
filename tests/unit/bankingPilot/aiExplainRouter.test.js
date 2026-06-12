import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

process.env.SIMURGH_BANKING_PILOT_PEPPER = "test-banking-pepper-32-chars-long";
process.env.SIMURGH_BANKING_PILOT_TOKEN_SECRET = "test-banking-token-secret-32-chars";
process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "false";

const { default: bankingRouter } = await import("../../../src/bankingPilot/index.js");

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use("/api/banking-pilot", bankingRouter);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/banking-pilot`;
});
after(() => new Promise((resolve) => server.close(resolve)));

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
async function getJson(path, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() };
}
const auth = (t) => ({ Authorization: `Bearer ${t}` });

async function submittedSession() {
  const c = (await postJson("/consent/accept", {})).body;
  await postJson(
    "/submit",
    {
      banking_session_id: c.banking_session_id,
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    },
    auth(c.token)
  );
  return c;
}

describe("GET /:sessionId/ai-privacy-explain", () => {
  test("flag off -> 503 ai_explain_disabled with off-path receipt", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "false";
    const c = await submittedSession();
    const { status, body } = await getJson(
      `/${c.banking_session_id}/ai-privacy-explain`,
      auth(c.token)
    );
    assert.equal(status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.error, "ai_explain_disabled");
    assert.equal(body.ai_privacy_layer_enabled, false);
    assert.equal(body.narrative_generated, false);
  });

  test("flag on -> 200 narrative + receipt, sensitive payload false", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const { status, body } = await getJson(
      `/${c.banking_session_id}/ai-privacy-explain`,
      auth(c.token)
    );
    assert.equal(status, 200);
    assert.equal(body.ai_privacy_layer_enabled, true);
    assert.equal(body.receipt.sensitive_payload_sent_to_ai, false);
    assert.equal(body.receipt.network_egress_used, false);
    assert.match(body.receipt.narrative_hash, /^sha256:[a-f0-9]{64}$/);
  });

  test("missing token -> 401", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const { status } = await getJson(`/${c.banking_session_id}/ai-privacy-explain`);
    assert.equal(status, 401);
  });

  test("withdrawn session -> 403 blocked, no narrative", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    await postJson("/withdraw", {}, auth(c.token));
    const { status, body } = await getJson(
      `/${c.banking_session_id}/ai-privacy-explain`,
      auth(c.token)
    );
    assert.equal(status, 403);
    assert.equal(body.ok, false);
    assert.equal(body.error, "ai_explain_blocked_session_withdrawn");
    assert.equal(body.narrative_generated, false);
  });

  test("success appends exactly one AI_EXPLANATION_EXPORTED audit event", async () => {
    process.env.SIMURGH_BANKING_PILOT_AI_EXPLAIN = "true";
    const c = await submittedSession();
    const before = (await getJson(`/${c.banking_session_id}/audit`, auth(c.token))).body.entries
      .length;
    await getJson(`/${c.banking_session_id}/ai-privacy-explain`, auth(c.token));
    const after = (await getJson(`/${c.banking_session_id}/audit`, auth(c.token))).body.entries;
    const aiEvents = after.filter((e) => e.type === "BANKING_AI_EXPLANATION_EXPORTED");
    assert.equal(aiEvents.length, 1);
    assert.ok(after.length > before);
  });
});
