// SPDX-License-Identifier: AGPL-3.0-or-later
// Pass-3 audit repair (docs/superpowers/specs/2026-10-28-pass3-audit-repair.md):
// runtime regressions for the audit-chain forgery (H1) and the two session floods.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import test from "node:test";
import { verifyChain } from "../../../src/audit/hmacChain.js";

const AUDIT_SECRET = "pass3-audit-secret-32-characters-long";

test("H1: /join's studentIdHash cannot be used as an audit-chain signature", async () => {
  const saved = {
    pepper: process.env.SIMURGH_STUDENT_ID_PEPPER,
    audit: process.env.SIMURGH_AUDIT_SECRET,
  };
  delete process.env.SIMURGH_STUDENT_ID_PEPPER;
  process.env.SIMURGH_AUDIT_SECRET = AUDIT_SECRET;
  try {
    const { hashStudentId } = await import(
      `../../../src/privacy/hashIdentity.js?pass3=${Date.now()}-${Math.random()}`
    );
    // The attacker chooses the studentId, so they choose the bytes that get "signed".
    const entry = {
      seq: 0,
      ts: 1,
      type: "forged_clean_verdict",
      payload: { verdict: "clean" },
      prev: "GENESIS",
    };
    const forgedSig = hashStudentId(JSON.stringify(entry)).slice(3);
    assert.match(forgedSig, /^[0-9a-f]{64}$/);

    const chain = {
      prevHash: forgedSig,
      entries: [{ ...entry, sig: forgedSig }],
      truncated: false,
    };
    const result = verifyChain(chain, AUDIT_SECRET);
    assert.equal(result.valid, false, "a signature minted through hashStudentId must not verify");

    // Control: the same entry signed with the real key does verify.
    const real = crypto
      .createHmac("sha256", AUDIT_SECRET)
      .update(JSON.stringify(entry))
      .digest("hex");
    const good = { prevHash: real, entries: [{ ...entry, sig: real }], truncated: false };
    assert.equal(verifyChain(good, AUDIT_SECRET).valid, true);
  } finally {
    if (saved.pepper === undefined) delete process.env.SIMURGH_STUDENT_ID_PEPPER;
    else process.env.SIMURGH_STUDENT_ID_PEPPER = saved.pepper;
    if (saved.audit === undefined) delete process.env.SIMURGH_AUDIT_SECRET;
    else process.env.SIMURGH_AUDIT_SECRET = saved.audit;
  }
});

// ─────────────────────────────────────────────────────────────
//  Flood regressions — each boots server.js on an ephemeral port in demo mode.
// ─────────────────────────────────────────────────────────────
async function bootServer(overrides = {}) {
  const port = 36000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      SIMURGH_SKIP_DOTENV: "1",
      SIMURGH_DEMO_MODE: "1",
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i += 1) {
    const health = await fetch(`${base}/health`).catch(() => null);
    if (health?.ok) return { base, stop: () => child.kill() };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error("server did not start");
}

const post = (url, body, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });

async function createExam(base) {
  const res = await post(`${base}/api/exams`, { title: "pass3 flood" });
  assert.equal(res.status, 201);
  return (await res.json()).id;
}

const telemetry = (base, sessionId) =>
  post(`${base}/api/telemetry`, { sessionId, telemetry: { keystrokes: 1, chars_typed: 1 } });

test("tokenless telemetry cannot fill the capacity that /join needs", async () => {
  const { base, stop } = await bootServer({
    SIMURGH_MAX_SESSIONS: "20",
    SIMURGH_LEGACY_TELEMETRY_SESSION_RATE_MAX: "1000",
  });
  try {
    const examId = await createExam(base);
    const statuses = [];
    for (let i = 0; i < 40; i += 1) statuses.push((await telemetry(base, `flood_${i}`)).status);

    const refused = statuses.filter((s) => s === 503).length;
    assert.ok(refused > 0, "the flood must be refused once the legacy sub-cap is reached");

    const join = await post(`${base}/api/exams/${examId}/join`, {
      studentId: "honest@student.test",
    });
    assert.equal(join.status, 200, "a real join still succeeds after the flood");

    // MAX_SESSIONS=20 => the default legacy sub-cap is a quarter, i.e. 5 sessions.
    const accepted = statuses.filter((s) => s !== 503).length;
    assert.equal(accepted, 5);

    // A legacy session that already exists keeps working; the cap only stops new ones.
    assert.notEqual((await telemetry(base, "flood_0")).status, 503);
  } finally {
    stop();
  }
});

test("tokenless telemetry session creation is rate-limited per IP", async () => {
  const { base, stop } = await bootServer({ SIMURGH_LEGACY_TELEMETRY_SESSION_RATE_MAX: "3" });
  try {
    for (let i = 0; i < 3; i += 1) {
      assert.notEqual((await telemetry(base, `rate_${i}`)).status, 429);
    }
    const limited = await telemetry(base, "rate_3");
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).scope, "legacy-telemetry-session");

    // Only session creation is limited: an already-created session is not throttled here.
    assert.notEqual((await telemetry(base, "rate_0")).status, 429);
  } finally {
    stop();
  }
});

test("POST /api/llm-shield/sessions is rate-limited per IP", async () => {
  const { base, stop } = await bootServer({
    SIMURGH_LLM_SHIELD_SECRET: "pass3-llm-shield-secret-32-characters",
    SIMURGH_LLM_SHIELD_SESSION_RATE_MAX: "3",
  });
  try {
    for (let i = 0; i < 3; i += 1) {
      const res = await post(`${base}/api/llm-shield/sessions`, {});
      assert.equal(res.status, 200, `create ${i + 1} within the limit`);
    }
    const extra = await post(`${base}/api/llm-shield/sessions`, {});
    assert.equal(extra.status, 429);
    assert.equal((await extra.json()).scope, "llm-shield-sessions");
    // Audit B-1 (31 October 2026): the router accepts these spellings too, and an exact-path
    // limiter in front of it let `//sessions` create 200 sessions in 31 ms from one IP.
    for (const variant of ["//sessions", "/sessions/", "/SESSIONS", "///sessions//"]) {
      const res = await post(`${base}/api/llm-shield${variant}`, {});
      assert.equal(res.status, 429, `${variant} must share the per-IP bound`);
      assert.equal((await res.json()).scope, "llm-shield-sessions");
    }
  } finally {
    stop();
  }
});
