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
