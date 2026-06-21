// SPDX-License-Identifier: AGPL-3.0-or-later
// Boots a dedicated server child process with caller-supplied env so each live
// smoke can exercise a different SIMURGH_LIVE_* configuration (env is process-wide,
// so the shared 3E-core smoke server cannot cover live scenarios). No network: the
// live smokes that enable live mode still fail closed or skip before any provider call.
import { spawn } from "node:child_process";

export async function startServer(extraEnv = {}) {
  const port = 33060 + Math.floor(Math.random() * 400);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn("node", ["server.js"], {
    env: {
      ...process.env,
      SIMURGH_DEMO_MODE: "1",
      SIMURGH_LLM_SHIELD_SECRET: "smoke-llm-shield-secret-32-characters",
      PORT: String(port),
      ...extraEnv,
    },
    stdio: "ignore",
  });
  // Wait for readiness and ASSERT it: under CI load the boot can exceed the old
  // 20s window, and silently proceeding produced a confusing ECONNREFUSED in
  // newSession. Wait up to 40s and fail loudly if the server never becomes healthy.
  let ready = false;
  for (let i = 0; i < 160; i++) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      // not up yet
    }
    await new Promise((res) => setTimeout(res, 250));
  }
  if (!ready) {
    child.kill();
    throw new Error(`live smoke server did not become healthy on ${base}`);
  }
  return { base, stop: () => child.kill() };
}

export async function newSession(base) {
  const api = `${base}/api/llm-shield/gateway`;
  const s = await (
    await fetch(`${api}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
  ).json();
  return {
    api,
    sessionId: s.session_id,
    auth: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
  };
}

export function ok(c, m, d) {
  if (!c) throw new Error(d ? `${m}: ${JSON.stringify(d)}` : m);
}
