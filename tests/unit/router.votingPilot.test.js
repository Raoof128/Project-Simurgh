// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

process.env.SIMURGH_VOTING_PILOT_PEPPER = "test-pepper-32-chars-long-enough!";
process.env.SIMURGH_VOTING_PILOT_TOKEN_SECRET = "test-token-secret-32-chars-long!";

const { default: pilotRouter } = await import("../../src/votingPilot/index.js");

const app = express();
app.use(express.json());
app.use("/api/voting-pilot", pilotRouter);

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = createServer(app).listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/voting-pilot`;
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

describe("POST /consent/accept", () => {
  test("returns 200 with pilot_session_id, token, participant_code", async () => {
    const { status, body } = await postJson("/consent/accept", {});
    assert.equal(status, 200);
    assert.ok(body.pilot_session_id.startsWith("vp_"));
    assert.ok(typeof body.token === "string");
    assert.ok(typeof body.participant_code === "string");
    assert.equal(body.integrity_tier, "browser_only");
    assert.equal(body.consent_version, "2026-05-v1");
  });
});

describe("POST /submit", () => {
  test("returns 200 for valid session with submit_intent", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 200);
    assert.equal(body.ballot_submitted, true);
    assert.equal(body.ballot_choice_recorded_by_simurgh, false);
    assert.ok(typeof body.submitted_at === "string");
  });

  test("returns 400 when forbidden ballot field is present", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true, choice: "A" },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 400);
    assert.equal(body.error, "ballot_choice_field_rejected");
    assert.ok(body.forbidden_fields.includes("choice"));
  });

  test("returns 401 with no token", async () => {
    const { status } = await postJson("/submit", { submit_intent: true });
    assert.equal(status, 401);
  });

  test("returns 409 on double submit", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    const { status } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 409);
  });

  test("returns 403 for forbidden fields on withdrawn session", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    const { status } = await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true, choice: "A" },
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 403);
  });

  test("returns 409 when body.pilot_session_id does not match token session", async () => {
    const { body: c1 } = await postJson("/consent/accept", {});
    const { body: c2 } = await postJson("/consent/accept", {});
    const { status } = await postJson(
      "/submit",
      { pilot_session_id: c2.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${c1.token}` }
    );
    assert.equal(status, 409);
  });
});

describe("POST /withdraw", () => {
  test("returns 200 and marks session withdrawn", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status, body } = await postJson(
      "/withdraw",
      {},
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 200);
    assert.equal(body.withdrawn, true);
    assert.ok(typeof body.withdrawn_at === "string");
  });

  test("returns 409 on double withdraw", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    const { status } = await postJson(
      "/withdraw",
      {},
      { Authorization: `Bearer ${consent.token}` }
    );
    assert.equal(status, 409);
  });

  test("returns 401 with no token", async () => {
    const { status } = await postJson("/withdraw", {});
    assert.equal(status, 401);
  });
});

describe("GET /:sessionId/report", () => {
  test("returns 200 with full report for submitted session", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson(
      "/submit",
      { pilot_session_id: consent.pilot_session_id, submit_intent: true },
      { Authorization: `Bearer ${consent.token}` }
    );
    const { status, body } = await getJson(`/${consent.pilot_session_id}/report`, {
      Authorization: `Bearer ${consent.token}`,
    });
    assert.equal(status, 200);
    assert.equal(body.schema_version, "2026-05-v1");
    assert.equal(body.official_vote_impact, false);
    assert.equal(body.privacy_contract.ballot_choice_recorded_by_simurgh, false);
    assert.equal(body.audit.chain_valid, true);
  });

  test("returns 401 without token", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    const { status } = await getJson(`/${consent.pilot_session_id}/report`);
    assert.equal(status, 401);
  });

  test("returns 403 for withdrawn session", async () => {
    const { body: consent } = await postJson("/consent/accept", {});
    await postJson("/withdraw", {}, { Authorization: `Bearer ${consent.token}` });
    const { status } = await getJson(`/${consent.pilot_session_id}/report`, {
      Authorization: `Bearer ${consent.token}`,
    });
    assert.equal(status, 403);
  });

  test("returns 403 when token session does not match path session", async () => {
    const { body: c1 } = await postJson("/consent/accept", {});
    const { body: c2 } = await postJson("/consent/accept", {});
    const { status } = await getJson(`/${c2.pilot_session_id}/report`, {
      Authorization: `Bearer ${c1.token}`,
    });
    assert.equal(status, 403);
  });
});
