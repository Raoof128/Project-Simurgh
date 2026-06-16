// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

process.env.SIMURGH_BANKING_PILOT_PEPPER = "test-banking-pepper-32-chars-long";
process.env.SIMURGH_BANKING_PILOT_TOKEN_SECRET = "test-banking-token-secret-32-chars";
process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "false";

const { default: bankingRouter } = await import("../../../src/bankingPilot/index.js");

const VALID_SCOPE_HASH = "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const app = express();
app.use(express.json({ limit: "16kb" }));
app.use("/api/banking-pilot", bankingRouter);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/banking-pilot`;
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

async function consent() {
  const { status, body } = await postJson("/consent/accept", {});
  assert.equal(status, 200);
  return body;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

describe("POST /consent/accept", () => {
  test("returns banking session id, participant code, and scoped token", async () => {
    const body = await consent();
    assert.ok(body.banking_session_id.startsWith("bp_"));
    assert.ok(typeof body.participant_code === "string");
    assert.ok(typeof body.token === "string");
    assert.equal(body.phase, "phase_a_synthetic");
    assert.equal(body.consent_version, "2026-06-b1-v1");
  });
});

describe("POST /submit", () => {
  test("submits one valid synthetic scenario", async () => {
    const c = await consent();
    const { status, body } = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_cdr_consent",
        submit_intent: true,
        consent_scope_hash: VALID_SCOPE_HASH,
        consent_duration_category: "one_time",
        withdrawal_option_shown: true,
      },
      auth(c.token)
    );
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.banking_payload_recorded_by_simurgh, false);
    assert.equal(body.scenario_type, "mock_cdr_consent");
  });

  test("rejects forbidden fields without echoing submitted values", async () => {
    const c = await consent();
    const { status, body } = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
        otp: "VerySecretOtp",
      },
      auth(c.token)
    );
    assert.equal(status, 400);
    assert.deepEqual(body, { ok: false, error: "forbidden_banking_field", field: "otp" });
    assert.equal(JSON.stringify(body).includes("VerySecretOtp"), false);

    const audit = await getJson(`/${c.banking_session_id}/audit`, auth(c.token));
    const rejected = audit.body.entries.find(
      (entry) => entry.type === "BANKING_FORBIDDEN_FIELD_REJECTED"
    );
    assert.deepEqual(rejected.payload, {
      route: "submit",
      reason: "forbidden_banking_field",
      field_name: "otp",
    });
  });

  test("rejects unknown fields, pollution keys, invalid scenarios, and token mismatch", async () => {
    const c = await consent();
    const unknown = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
        note: "extra",
      },
      auth(c.token)
    );
    assert.equal(unknown.status, 400);
    assert.deepEqual(unknown.body, { ok: false, error: "unknown_field", field: "note" });

    const pollution = await postJson(
      "/submit",
      JSON.parse(
        `{"banking_session_id":"${c.banking_session_id}","scenario_type":"mock_payment_pause","risk_prompt_shown":true,"user_action":"pause","__proto__":{"polluted":true}}`
      ),
      auth(c.token)
    );
    assert.equal(pollution.status, 400);
    assert.deepEqual(pollution.body, {
      ok: false,
      error: "invalid_payload_key",
      field: "__proto__",
    });

    const invalidScenario = await postJson(
      "/submit",
      { banking_session_id: c.banking_session_id, scenario_type: "real_payment" },
      auth(c.token)
    );
    assert.equal(invalidScenario.status, 400);
    assert.deepEqual(invalidScenario.body, {
      ok: false,
      error: "invalid_scenario_type",
      field: "scenario_type",
    });

    const c2 = await consent();
    const mismatch = await postJson(
      "/submit",
      {
        banking_session_id: c2.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
      },
      auth(c.token)
    );
    assert.equal(mismatch.status, 403);
    assert.deepEqual(mismatch.body, { ok: false, error: "forbidden" });
  });

  test("does not append unauthenticated rejected payloads to any session audit chain", async () => {
    const c = await consent();
    const rejected = await postJson("/submit", {
      banking_session_id: c.banking_session_id,
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
      otp: "VerySecretOtp",
    });
    assert.equal(rejected.status, 401);

    const audit = await getJson(`/${c.banking_session_id}/audit`, auth(c.token));
    assert.equal(
      audit.body.entries.some((entry) => entry.type === "BANKING_FORBIDDEN_FIELD_REJECTED"),
      false
    );
  });

  test("rejects over-deep payloads with payload_too_deep", async () => {
    const c = await consent();
    let nested = { leaf: true };
    for (let i = 0; i < 25; i += 1) nested = { layer: nested };
    const { status, body } = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
        deep: nested,
      },
      auth(c.token)
    );
    assert.equal(status, 400);
    assert.deepEqual(body, { ok: false, error: "payload_too_deep" });
  });

  test("prior forbidden-field attempt escalates risk on later valid submit", async () => {
    const c = await consent();
    const rejected = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
        account_number: "111111",
      },
      auth(c.token)
    );
    assert.equal(rejected.status, 400);

    const submitted = await postJson(
      "/submit",
      {
        banking_session_id: c.banking_session_id,
        scenario_type: "mock_payment_pause",
        risk_prompt_shown: true,
        user_action: "pause",
      },
      auth(c.token)
    );
    assert.equal(submitted.status, 200);

    const report = await getJson(`/${c.banking_session_id}/report`, auth(c.token));
    assert.equal(report.status, 200);
    assert.ok(report.body.risk.risk_categories.includes("forbidden_payload_attempt"));
    assert.equal(report.body.privacy_contract.forbidden_fields_rejected, 1);
  });

  test("rejects double submit on one session", async () => {
    const c = await consent();
    const payload = {
      banking_session_id: c.banking_session_id,
      scenario_type: "mock_payment_pause",
      risk_prompt_shown: true,
      user_action: "pause",
    };
    assert.equal((await postJson("/submit", payload, auth(c.token))).status, 200);
    const second = await postJson("/submit", payload, auth(c.token));
    assert.equal(second.status, 409);
    assert.deepEqual(second.body, { ok: false, error: "already_submitted_or_withdrawn" });
  });
});

describe("POST /withdraw and GET exports", () => {
  test("withdraw blocks report export", async () => {
    const c = await consent();
    const withdrawn = await postJson("/withdraw", {}, auth(c.token));
    assert.equal(withdrawn.status, 200);
    assert.equal(withdrawn.body.withdrawn, true);
    const report = await getJson(`/${c.banking_session_id}/report`, auth(c.token));
    assert.equal(report.status, 403);
  });

  test("withdrawn session keeps audit and verify exports for transparency", async () => {
    const c = await consent();
    assert.equal((await postJson("/withdraw", {}, auth(c.token))).status, 200);

    const audit = await getJson(`/${c.banking_session_id}/audit`, auth(c.token));
    assert.equal(audit.status, 200);
    assert.equal(audit.body.chain_valid, true);
    assert.ok(audit.body.entries.some((entry) => entry.type === "BANKING_SESSION_WITHDRAWN"));

    const verify = await getJson(`/${c.banking_session_id}/verify`, auth(c.token));
    assert.equal(verify.status, 200);
    assert.equal(verify.body.audit_chain_valid, true);
  });

  test("report, audit, and verify exports are token-bound and safe", async () => {
    const c = await consent();
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

    const report = await getJson(`/${c.banking_session_id}/report`, auth(c.token));
    assert.equal(report.status, 200);
    assert.equal(report.body.privacy_contract.sonnet_received_sensitive_payload, false);
    assert.equal(report.body.audit.chain_valid, true);

    const audit = await getJson(`/${c.banking_session_id}/audit`, auth(c.token));
    assert.equal(audit.status, 200);
    assert.equal(audit.body.chain_valid, true);
    assert.equal(JSON.stringify(audit.body).includes("test-banking-token-secret"), false);

    const verify = await getJson(`/${c.banking_session_id}/verify`, auth(c.token));
    assert.equal(verify.status, 200);
    assert.equal(verify.body.audit_chain_valid, true);

    const other = await consent();
    const mismatch = await getJson(`/${other.banking_session_id}/report`, auth(c.token));
    assert.equal(mismatch.status, 403);
    assert.deepEqual(mismatch.body, { ok: false, error: "forbidden" });
  });
});
