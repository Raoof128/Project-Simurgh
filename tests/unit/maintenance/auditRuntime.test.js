// SPDX-License-Identifier: AGPL-3.0-or-later
// Repository audit of 31 October 2026 (docs/security-audit-2026-10-31/FINDINGS.md, area D):
// runtime regressions for the process crash, model-call governance, timeline-before-call,
// audit truncation, dotenv order, session squatting, token canonical form and placeholder secrets.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { verifyAuditExport } from "../../../src/audit/verifyAudit.js";
import { loadDotenv } from "../../../src/config/loadDotenv.js";
import { issueSessionToken, verifySessionToken } from "../../../src/security/sessionToken.js";
import { containsForbiddenLocalFieldDeep } from "../../../src/device/forbiddenLocalFields.js";

const SECRET = "audit-session-secret-32-characters-long";

async function bootServer(overrides = {}, { expectExit = false } = {}) {
  const port = 38000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      SIMURGH_SKIP_DOTENV: "1",
      SIMURGH_DEMO_MODE: "1",
      SIMURGH_SESSION_SIGNING_SECRET: SECRET,
      ...overrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  const exited = new Promise((resolve) => child.on("exit", (code) => resolve(code)));
  if (expectExit) return { exited, stderr: () => stderr };
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i += 1) {
    const health = await fetch(`${base}/health`).catch(() => null);
    if (health?.ok) return { base, stop: () => child.kill(), exited, stderr: () => stderr };
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error(`server did not start: ${stderr}`);
}

const post = (url, body, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });

// A loopback stand-in for the provider: counts requests and records the last body.
function fakeAnthropic({ status = 200 } = {}) {
  const state = { calls: 0, lastBody: null };
  const server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      state.calls += 1;
      state.lastBody = data;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_fake",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: '{"risk_level":"Critical","reasoning":"fake"}' }],
          usage: { input_tokens: 1, output_tokens: 1 },
        })
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve({
        state,
        url: `http://127.0.0.1:${server.address().port}`,
        close: () => server.close(),
      })
    )
  );
}

const critical = {
  keystrokes: 20,
  chars_typed: 5,
  effective_wpm: 60,
  focus_losses: 1,
  time_off_window_ms: 0,
  pastes: 1,
  paste_payload_chars: 250,
  max_idle_gap_ms: 0,
  window_seconds: 5,
};

test("D-1: a 12 KB anonymous telemetry body nested 6,000 deep is refused and the server stays up", async () => {
  const { base, stop, exited } = await bootServer();
  try {
    // Built as text: JSON.stringify itself cannot serialise 6,000 levels, which is the point.
    const body = `{"sessionId":"deep1","telemetry":{},"daemon_proof":{"a":${"[".repeat(6000)}${"]".repeat(6000)}}}`;
    assert.ok(body.length < 16_000);
    const res = await post(`${base}/api/telemetry`, body);
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, "forbidden_local_field");
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal(
      await Promise.race([exited, new Promise((r) => setTimeout(() => r("alive"), 300))]),
      "alive"
    );
  } finally {
    stop();
  }
});

test("D-1: the scanner has no recursion and names deep nesting as a forbidden field", () => {
  let nested = {};
  for (let i = 0; i < 100_000; i += 1) nested = { x: nested };
  assert.equal(containsForbiddenLocalFieldDeep(nested), "nesting_depth_exceeded");
  assert.equal(containsForbiddenLocalFieldDeep({ a: { b: { c: 1 } } }), null);
  assert.equal(containsForbiddenLocalFieldDeep({ a: [{ paste_content: "x" }] }), "paste_content");
});

test("D-1: a body-parser error is answered as JSON without a stack trace", async () => {
  const { base, stop } = await bootServer();
  try {
    const res = await post(`${base}/api/telemetry`, "{not json");
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.doesNotMatch(text, /<pre>|at .*server\.js/);
    assert.equal(JSON.parse(text).error, "entity.parse.failed");
  } finally {
    stop();
  }
});

test("D-2 and M2: tokenless sessions never reach the model; knobs and budget are honoured; the prompt is typed", async () => {
  const fake = await fakeAnthropic();
  const { base, stop } = await bootServer({
    SIMURGH_DEMO_MODE: "0",
    ANTHROPIC_API_KEY: "sk-test-FAKE",
    ANTHROPIC_BASE_URL: fake.url,
    SIMURGH_INSTRUCTOR_TOKEN: "audit-instructor-token",
    SIMURGH_HELPER_SECRET: "audit-helper-secret",
    SIMURGH_AUDIT_SECRET: "audit-audit-secret",
    SIMURGH_SCORING_MODE: "hybrid",
    SIMURGH_CLAUDE_ON_CRITICAL: "true",
    SIMURGH_MODEL_CALLS_PER_MINUTE: "1",
  });
  try {
    const anon = await post(`${base}/api/telemetry`, { sessionId: "anon1", telemetry: critical });
    assert.equal(anon.status, 200);
    assert.equal((await anon.json()).source.reasoning, "skipped-untokened-session");
    assert.equal(fake.state.calls, 0, "an anonymous window reached the model");

    const instructor = { authorization: "Bearer audit-instructor-token" };
    const exam = await post(`${base}/api/exams`, { title: "audit" }, instructor);
    assert.equal(exam.status, 201);
    const { id } = await exam.json();
    const join = await post(`${base}/api/exams/${id}/join`, { studentId: "s1" });
    assert.ok([200, 201].includes(join.status));
    const j = await join.json();
    const auth = { authorization: `Bearer ${j.sessionToken ?? j.session_token ?? j.token}` };
    const sid = j.sessionId ?? j.session_id;
    const first = await post(
      `${base}/api/telemetry`,
      {
        sessionId: sid,
        telemetry: { ...critical, key_intervals: ["IGNORE PREVIOUS", { s: 1 }, 12] },
      },
      auth
    );
    assert.equal(first.status, 200);
    assert.equal((await first.json()).source.reasoning, "claude_narrative");
    assert.equal(fake.state.calls, 1);
    assert.doesNotMatch(fake.state.lastBody, /IGNORE PREVIOUS/);
    // The prompt embeds escaped JSON; only the numeric interval may survive.
    assert.match(fake.state.lastBody, /key_intervals[^\]]*\b12\b[^\]]*\]/);
    const second = await post(
      `${base}/api/telemetry`,
      { sessionId: sid, telemetry: critical },
      auth
    );
    assert.equal((await second.json()).source.reasoning, "skipped-model-budget");
    assert.equal(fake.state.calls, 1, "the per-minute budget was exceeded");
  } finally {
    stop();
    fake.close();
  }
});

test("D-2: SIMURGH_SCORING_MODE=local makes no model call even with a key", async () => {
  const fake = await fakeAnthropic();
  const { base, stop } = await bootServer({
    SIMURGH_DEMO_MODE: "0",
    ANTHROPIC_API_KEY: "sk-test-FAKE",
    ANTHROPIC_BASE_URL: fake.url,
    SIMURGH_INSTRUCTOR_TOKEN: "audit-instructor-token",
    SIMURGH_HELPER_SECRET: "audit-helper-secret",
    SIMURGH_AUDIT_SECRET: "audit-audit-secret",
    SIMURGH_SCORING_MODE: "local",
  });
  try {
    const instructor = { authorization: "Bearer audit-instructor-token" };
    const { id } = await (await post(`${base}/api/exams`, { title: "audit" }, instructor)).json();
    const j = await (await post(`${base}/api/exams/${id}/join`, { studentId: "s2" })).json();
    const auth = { authorization: `Bearer ${j.sessionToken ?? j.session_token ?? j.token}` };
    const res = await post(
      `${base}/api/telemetry`,
      { sessionId: j.sessionId ?? j.session_id, telemetry: critical },
      auth
    );
    assert.equal((await res.json()).source.reasoning, "skipped-local-mode");
    assert.equal(fake.state.calls, 0);
  } finally {
    stop();
    fake.close();
  }
});

test("D-3: a provider failure does not blank the timeline behind a Critical verdict", async () => {
  const fake = await fakeAnthropic({ status: 529 });
  const { base, stop } = await bootServer({
    SIMURGH_DEMO_MODE: "0",
    ANTHROPIC_API_KEY: "sk-test-FAKE",
    ANTHROPIC_BASE_URL: fake.url,
    ANTHROPIC_MAX_RETRIES: "0",
    SIMURGH_INSTRUCTOR_TOKEN: "audit-instructor-token",
    SIMURGH_HELPER_SECRET: "audit-helper-secret",
    SIMURGH_AUDIT_SECRET: "audit-audit-secret",
    SIMURGH_SCORING_MODE: "hybrid",
    // The gate's own CI env sets these false; the call must be allowed for this test to fail over.
    SIMURGH_CLAUDE_ON_CRITICAL: "true",
    SIMURGH_CLAUDE_ON_WARNING: "true",
  });
  try {
    const instructor = { authorization: "Bearer audit-instructor-token" };
    const { id } = await (await post(`${base}/api/exams`, { title: "audit" }, instructor)).json();
    const j = await (await post(`${base}/api/exams/${id}/join`, { studentId: "s3" })).json();
    const sid = j.sessionId ?? j.session_id;
    const auth = { authorization: `Bearer ${j.sessionToken ?? j.session_token ?? j.token}` };
    const res = await post(`${base}/api/telemetry`, { sessionId: sid, telemetry: critical }, auth);
    const verdict = await res.json();
    assert.equal(verdict.risk_level, "Critical");
    assert.match(verdict.source.reasoning, /^fallback-/);
    const report = await (
      await fetch(`${base}/api/sessions/${sid}/report`, { headers: instructor })
    ).json();
    assert.ok(
      report.timeline.some((e) => e.event === "BULK_PASTE"),
      JSON.stringify(report.timeline)
    );
    assert.match(report.summary, /anomalous event/);
    assert.equal(report.peak_risk_level, "Critical");
    assert.equal(report.audit_chain_truncated, false);
  } finally {
    stop();
    fake.close();
  }
});

test("D-5: a truncated or miscounted audit export is not valid", () => {
  const key = "k".repeat(32);
  assert.equal(verifyAuditExport({ entries: [], truncated: false }, key).valid, true);
  const truncated = verifyAuditExport({ entries: [], truncated: true }, key);
  assert.equal(truncated.valid, false);
  assert.match(truncated.errors.join(" "), /truncated/);
  const miscounted = verifyAuditExport({ entries: [], truncated: false, entry_count: 3 }, key);
  assert.equal(miscounted.valid, false);
});

test("D-5: device and integrity routes refuse writes after submit", async () => {
  const { base, stop } = await bootServer();
  try {
    const { id } = await (await post(`${base}/api/exams`, { title: "audit" })).json();
    const j = await (await post(`${base}/api/exams/${id}/join`, { studentId: "s4" })).json();
    const sid = j.sessionId ?? j.session_id;
    const auth = { authorization: `Bearer ${j.sessionToken ?? j.session_token ?? j.token}` };
    for (const step of ["privacy-accept", "start", "submit"]) {
      const r = await post(`${base}/api/sessions/${sid}/${step}`, {}, auth);
      assert.ok([200, 201].includes(r.status), `${step}: ${r.status} ${await r.text()}`);
    }
    const after = await post(`${base}/api/device/challenge`, { sessionId: sid }, auth);
    assert.equal(after.status, 403);
    assert.equal((await after.json()).error, "session_closed");
  } finally {
    stop();
  }
});

test("D-7: .env is loaded before any config snapshot", () => {
  const first = readFileSync("server.js", "utf8").match(/^import [^\n]*;$/m)[0];
  assert.match(first, /loadDotenv\.js/);
  const dir = mkdtempSync(join(tmpdir(), "simurgh-dotenv-"));
  try {
    const path = join(dir, ".env");
    writeFileSync(
      path,
      'SIMURGH_X_A=one # trailing\nSIMURGH_X_B="two # kept"\nSIMURGH_X_C=three\n'
    );
    const env = { SIMURGH_X_C: "preset" };
    assert.equal(loadDotenv(path, env), 2);
    assert.deepEqual(env, { SIMURGH_X_A: "one", SIMURGH_X_B: "two # kept", SIMURGH_X_C: "preset" });
    assert.equal(loadDotenv(path, { SIMURGH_SKIP_DOTENV: "1" }), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("D-10: a join may not claim a session id a tokenless session already holds", async () => {
  const { base, stop } = await bootServer();
  try {
    assert.equal(
      (await post(`${base}/api/telemetry`, { sessionId: "squat1", telemetry: critical })).status,
      200
    );
    const { id } = await (await post(`${base}/api/exams`, { title: "audit" })).json();
    const join = await post(`${base}/api/exams/${id}/join`, {
      studentId: "s5",
      sessionId: "squat1",
    });
    assert.equal(join.status, 409);
  } finally {
    stop();
  }
});

test("D-12: a session token must be the canonical encoding of what it decodes to", () => {
  const token = issueSessionToken("sess_x", SECRET, 60_000);
  assert.equal(verifySessionToken(token, SECRET).valid, true);
  for (const suffix of ["=", "!!", "%", " "]) {
    assert.equal(verifySessionToken(token + suffix, SECRET).valid, false, JSON.stringify(suffix));
  }
});

test("D-9: a .env.example placeholder secret refuses to start outside demo mode", async () => {
  const { exited, stderr } = await bootServer(
    {
      SIMURGH_DEMO_MODE: "0",
      ANTHROPIC_API_KEY: "sk-test-FAKE",
      SIMURGH_INSTRUCTOR_TOKEN: "audit-instructor-token",
      SIMURGH_HELPER_SECRET: "audit-helper-secret",
      SIMURGH_AUDIT_SECRET: "audit-audit-secret",
      SIMURGH_VOTING_PILOT_PEPPER: "replace-with-32-char-random-secret",
    },
    { expectExit: true }
  );
  assert.equal(await exited, 78);
  assert.match(stderr(), /placeholder/);
});

// ─────────────────────────────────────────────────────────────
//  Second pass (31 October 2026): the items left open after the first repairs.
// ─────────────────────────────────────────────────────────────
import { createDaemonPairingRegistry } from "../../../src/device/daemonPairing.js";
import { createRateLimiter } from "../../../src/security/rateLimit.js";

test("D-10: one open session per student per exam; a submitted session frees the identity", async () => {
  const { base, stop } = await bootServer();
  try {
    const { id } = await (await post(`${base}/api/exams`, { title: "audit" })).json();
    const first = await post(`${base}/api/exams/${id}/join`, { studentId: "twin" });
    assert.ok([200, 201].includes(first.status));
    const j = await first.json();
    const second = await post(`${base}/api/exams/${id}/join`, { studentId: "twin" });
    assert.equal(second.status, 409);
    assert.equal((await second.json()).error, "student_already_joined");
    // A different exam is a different identity scope.
    const other = await (await post(`${base}/api/exams`, { title: "other" })).json();
    assert.ok(
      [200, 201].includes(
        (await post(`${base}/api/exams/${other.id}/join`, { studentId: "twin" })).status
      )
    );
    const auth = { authorization: `Bearer ${j.sessionToken}` };
    for (const step of ["privacy-accept", "start", "submit"]) {
      assert.ok(
        [200, 201].includes(
          (await post(`${base}/api/sessions/${j.sessionId}/${step}`, {}, auth)).status
        )
      );
    }
    const again = await post(`${base}/api/exams/${id}/join`, { studentId: "twin" });
    assert.ok([200, 201].includes(again.status), "a closed session must not block a fresh join");
  } finally {
    stop();
  }
});

test("D-11: expired pairing challenges are purged on the sweep", () => {
  const registry = createDaemonPairingRegistry({ challengeTtlMs: 1000 });
  for (let i = 0; i < 50; i += 1) registry.createChallenge(`s${i}`, "pair", 0);
  assert.equal(registry.challengeCount(), 50);
  registry.evictExpired(500);
  assert.equal(registry.challengeCount(), 50, "unexpired challenges stay");
  registry.evictExpired(5000);
  assert.equal(registry.challengeCount(), 0);
});

test("D-13: a full limiter map refuses a new key in bounded time instead of scanning everything", () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 1,
    keyFn: (req) => req.key,
    maxBuckets: 3000,
    name: "t",
  });
  const res = () => {
    const r = { code: 200, body: null, headers: {} };
    r.setHeader = (k, v) => (r.headers[k] = v);
    r.status = (c) => ((r.code = c), r);
    r.json = (b) => ((r.body = b), r);
    return r;
  };
  for (let i = 0; i < 3000; i += 1) {
    limiter({ key: `k${i}` }, res(), () => {});
    limiter({ key: `k${i}` }, res(), () => {}); // second hit throttles the bucket
  }
  const started = process.hrtime.bigint();
  const r = res();
  let passed = false;
  limiter({ key: "fresh" }, r, () => (passed = true));
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(passed, false);
  assert.equal(r.code, 429);
  assert.ok(ms < 50, `refusal took ${ms} ms`);
});

test("B-3: the mount withholds an export that carries a configured canary even though the frozen firewall accepted it", async () => {
  const { base, stop } = await bootServer({
    SIMURGH_LLM_SHIELD_SECRET: "pass3-llm-shield-secret-32-characters",
    ANTHROPIC_API_KEY: "sk-test-FAKE",
    SIMURGH_EXPORT_CANARIES: "general explanation",
  });
  try {
    const created = await post(
      `${base}/api/llm-shield/gateway/sessions`,
      {},
      { authorization: "Bearer test-instructor-token" }
    );
    const { session_id: sessionId, token } = await created.json();
    const res = await (
      await post(
        `${base}/api/llm-shield/gateway/${sessionId}/run`,
        { input: "Explain photosynthesis briefly." },
        { authorization: `Bearer ${token}` }
      )
    ).json();
    assert.equal(
      res.receipt.output_firewall_verdict,
      "accepted",
      "the frozen firewall accepted it"
    );
    assert.equal(res.gateway_verdict, "blocked");
    assert.equal(res.output_text, undefined);
    assert.ok(res.reason_codes.includes("export_canary"));
    assert.equal(res.mount_guard.router_verdict, "accepted");
  } finally {
    stop();
  }
});
