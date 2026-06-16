// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";

process.env.SIMURGH_BANKING_PILOT_PEPPER = "hardening-banking-pepper-32-chars";
process.env.SIMURGH_BANKING_PILOT_TOKEN_SECRET = "hardening-banking-token-secret-32";
process.env.SIMURGH_BANKING_PILOT_COLLECTION_CLOSED = "false";
process.env.SIMURGH_BANKING_PILOT_CONSENT_RATE_MAX = "4";
process.env.SIMURGH_BANKING_PILOT_MAX_SESSIONS = "3";

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
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}/api/banking-pilot`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function postConsent() {
  const res = await fetch(`${baseUrl}/consent/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return { status: res.status, body: await res.json() };
}

describe("banking pilot hardening", () => {
  test("missing env config returns 503 banking_pilot_not_configured", async () => {
    const pepper = process.env.SIMURGH_BANKING_PILOT_PEPPER;
    delete process.env.SIMURGH_BANKING_PILOT_PEPPER;
    try {
      const res = await postConsent();
      assert.equal(res.status, 503);
      assert.deepEqual(res.body, { ok: false, error: "banking_pilot_not_configured" });
    } finally {
      process.env.SIMURGH_BANKING_PILOT_PEPPER = pepper;
    }
  });

  test("session capacity cap then per-IP rate limit on consent", async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await postConsent();
      assert.equal(res.status, 200, `consent ${i + 1} should succeed`);
    }

    const capped = await postConsent();
    assert.equal(capped.status, 503);
    assert.deepEqual(capped.body, { ok: false, error: "banking_session_capacity_reached" });

    const limited = await postConsent();
    assert.equal(limited.status, 429);
    assert.equal(limited.body.error, "rate_limited");
    assert.equal(limited.body.scope, "banking-consent");
  });
});
