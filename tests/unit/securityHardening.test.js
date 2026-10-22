// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";

function secureEnv(overrides = {}) {
  const env = {
    ...process.env,
    PORT: String(34000 + Math.floor(Math.random() * 2000)),
    // A developer's local .env must not silently satisfy the fail-closed guards under test.
    SIMURGH_SKIP_DOTENV: "1",
    SIMURGH_DEMO_MODE: "0",
    SIMURGH_HELPER_SECRET: "hardening-helper-secret-32-characters",
    SIMURGH_AUDIT_SECRET: "hardening-audit-secret-32-characters",
    SIMURGH_SESSION_SIGNING_SECRET: "hardening-session-secret-32-characters",
    SIMURGH_INSTRUCTOR_TOKEN: "hardening-instructor-token",
    SIMURGH_ALLOWED_ORIGIN: "http://127.0.0.1",
    ...overrides,
  };
  if (overrides.ANTHROPIC_API_KEY === undefined) delete env.ANTHROPIC_API_KEY;
  return env;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function expectServerExit(env) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const exit = await Promise.race([
    new Promise((resolve) => child.on("exit", (code) => resolve({ code, stderr }))),
    wait(1500).then(() => {
      child.kill();
      return { code: null, stderr };
    }),
  ]);
  return exit;
}

async function startServer(env) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let base = null;
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    const match = stdout.match(/listening on (http:\/\/localhost:\d+)/);
    if (match) base = match[1].replace("localhost", "127.0.0.1");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  for (let i = 0; i < 40; i += 1) {
    if (base) {
      const health = await fetch(`${base}/health`).catch(() => null);
      if (health?.ok) return { base, child, stdout: () => stdout, stderr: () => stderr };
    }
    await wait(100);
  }
  child.kill();
  throw new Error(`server did not start; stdout=${stdout}; stderr=${stderr}`);
}

test("non-demo server fails closed when ANTHROPIC_API_KEY is missing", async () => {
  const exit = await expectServerExit(secureEnv());

  assert.equal(exit.code, 78);
  assert.match(exit.stderr, /ANTHROPIC_API_KEY must be set in non-demo mode/);
});

test("instructor token is bearer-only and is never printed in startup logs", async () => {
  const server = await startServer(secureEnv({ ANTHROPIC_API_KEY: "sk-test-hardening" }));
  try {
    const query = await fetch(`${server.base}/api/sessions?token=hardening-instructor-token`);
    assert.equal(query.status, 401);

    const bearer = await fetch(`${server.base}/api/sessions`, {
      headers: { authorization: "Bearer hardening-instructor-token" },
    });
    assert.equal(bearer.status, 200);

    assert.doesNotMatch(server.stdout(), /hardening-instructor-token/);
  } finally {
    server.child.kill();
  }
});

test("public exam client does not persist raw answer text in browser storage", async () => {
  const html = await readFile("public/index.html", "utf8");

  assert.doesNotMatch(html, /simurgh:answer/);
  assert.doesNotMatch(html, /localStorage\.setItem\(\s*STORAGE_KEY\s*,\s*ta\.value\s*\)/);
  assert.doesNotMatch(html, /localStorage\.getItem\(\s*STORAGE_KEY\s*\)/);
});

test("student identifiers use a peppered HMAC instead of raw SHA-256", async () => {
  const originalPepper = process.env.SIMURGH_STUDENT_ID_PEPPER;
  process.env.SIMURGH_STUDENT_ID_PEPPER = "student-id-pepper-32-characters";
  try {
    const { hashStudentId } = await import(
      `../../src/privacy/hashIdentity.js?hardening=${Date.now()}-${Math.random()}`
    );
    const raw = "student123";
    const digest = hashStudentId(raw);
    const plainSha256 = crypto.createHash("sha256").update(raw).digest("hex");

    assert.match(digest, /^v1:[0-9a-f]{64}$/);
    assert.notEqual(digest, plainSha256);
    assert.equal(digest, hashStudentId(raw));
  } finally {
    if (originalPepper === undefined) delete process.env.SIMURGH_STUDENT_ID_PEPPER;
    else process.env.SIMURGH_STUDENT_ID_PEPPER = originalPepper;
  }
});

test("gateway session creation requires instructor identity outside demo mode", async () => {
  const server = await startServer(
    secureEnv({
      ANTHROPIC_API_KEY: "sk-test-hardening",
      SIMURGH_LLM_SHIELD_SECRET: "hardening-gateway-secret-32-characters",
    })
  );
  try {
    const url = `${server.base}/api/llm-shield/gateway/sessions`;
    for (const suffix of [
      "/sessions",
      "//sessions",
      "///sessions",
      "/SeSsIoNs/",
      "//sessions/?token=hardening-instructor-token",
    ]) {
      assert.equal(
        (await fetch(`${server.base}/api/llm-shield/gateway${suffix}`, { method: "POST" })).status,
        401,
        suffix
      );
    }
    assert.equal(
      (await fetch(`${url}?token=hardening-instructor-token`, { method: "POST" })).status,
      401
    );
    const authorized = await fetch(url, {
      method: "POST",
      headers: { authorization: "Bearer hardening-instructor-token" },
    });
    assert.equal(authorized.status, 200);
    const session = await authorized.json();
    assert.ok(session.token);
    const mock = await fetch(`${server.base}/api/llm-shield/gateway/${session.session_id}/run`, {
      method: "POST",
      headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
      body: JSON.stringify({
        input: "Write a short public summary",
        provider_mode: "mock",
        provider: "mock",
        scenario: "benign",
      }),
    });
    assert.equal(mock.status, 200);
    const otherSession = await fetch(url, {
      method: "POST",
      headers: { authorization: "Bearer hardening-instructor-token" },
    }).then((r) => r.json());
    const mismatch = await fetch(
      `${server.base}/api/llm-shield/gateway/${otherSession.session_id}/run`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${session.token}`, "content-type": "application/json" },
        body: JSON.stringify({ input: "public summary", provider_mode: "mock", provider: "mock" }),
      }
    );
    assert.equal(mismatch.status, 403);
  } finally {
    server.child.kill();
  }
});

test("mounted legacy live gateway is retired even when live flags are enabled", async () => {
  const server = await startServer(
    secureEnv({
      ANTHROPIC_API_KEY: "sk-test-hardening",
      SIMURGH_LLM_SHIELD_SECRET: "hardening-gateway-secret-32-characters",
      SIMURGH_LIVE_PROVIDER_ENABLED: "true",
      SIMURGH_LLM_PROVIDER: "anthropic",
      SIMURGH_LIVE_PROVIDER_MODEL: "fixture-model",
      ANTHROPIC_BASE_URL: "http://127.0.0.1:1",
    })
  );
  try {
    const response = await fetch(`${server.base}/api/llm-shield/gateway/nonexistent/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: "public summary", provider_mode: "live" }),
    });
    assert.equal(response.status, 410);
    assert.equal((await response.json()).error, "legacy_live_gateway_retired");
  } finally {
    server.child.kill();
  }
});

test("legacy process-data ingress, simulator and read endpoints are retired", async () => {
  const server = await startServer(
    secureEnv({ ANTHROPIC_API_KEY: "sk-test-hardening", SIMURGH_DEMO_MODE: "1" })
  );
  try {
    for (const [path, method] of [
      ["/api/affinity", "POST"],
      ["/api/affinity/simulate", "POST"],
      ["/api/affinity/example", "GET"],
    ]) {
      const response = await fetch(`${server.base}${path}`, {
        method,
        headers: {
          "content-type": "application/json",
          "x-simurgh-helper-secret": "hardening-helper-secret-32-characters",
        },
        ...(method === "POST"
          ? {
              body: JSON.stringify({
                sessionId: "example",
                hostile: [{ pid: 123, name: "synthetic-private-process" }],
              }),
            }
          : {}),
      });
      assert.equal(response.status, 410);
      const text = await response.text();
      assert.match(text, /legacy_affinity_retired/);
      assert.doesNotMatch(text, /synthetic-private-process/);
    }
    assert.doesNotMatch(server.stdout() + server.stderr(), /synthetic-private-process/);
  } finally {
    server.child.kill();
  }
});
