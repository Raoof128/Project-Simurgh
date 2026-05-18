// Live-server integration: a Linux session that switches display_server
// mid-session must be rejected with display_server_mismatch on the
// /api/telemetry handler — not just at the factory level.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import test from "node:test";

function b64url(b) {
  return Buffer.from(b).toString("base64url");
}
function canonical(payload) {
  const o = {};
  for (const k of Object.keys(payload).sort()) if (k !== "signature") o[k] = payload[k];
  return JSON.stringify(o);
}
function ident() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pk = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    public_key: b64url(pk),
    node_id_hash: `sha256:${crypto.createHash("sha256").update(pk).digest("hex")}`,
  };
}
function sign(id, p) {
  return b64url(
    crypto.sign("sha256", Buffer.from(canonical(p)), { key: id.privateKey, dsaEncoding: "der" })
  );
}
function linuxScanner(overrides = {}) {
  return {
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scanner_reason: "none",
    display_server: "x11",
    coverage: "x11_full",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    privacy_mode: "metadata_only",
    ...overrides,
  };
}

async function bootServer() {
  const port = 33129;
  const srv = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(port), SIMURGH_DEMO_MODE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return { srv, url: `http://127.0.0.1:${port}` };
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  srv.kill();
  throw new Error("server did not boot");
}

async function challenge(url, sessionId, token, purpose) {
  const r = await fetch(`${url}/api/device/challenge`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionId, purpose }),
  });
  return (await r.json()).challenge;
}

test("server.js rejects telemetry proof when display_server changes mid-session", async () => {
  const { srv, url } = await bootServer();
  try {
    // Bootstrap a Linux session.
    const exam = await (
      await fetch(`${url}/api/exams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Stage28C-display-lock" }),
      })
    ).json();
    const join = await (
      await fetch(`${url}/api/exams/${exam.id}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: "lock@student.test" }),
      })
    ).json();
    const { sessionId, sessionToken: token } = join;
    await fetch(`${url}/api/sessions/${sessionId}/privacy-accept`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    await fetch(`${url}/api/sessions/${sessionId}/start`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const id = ident();
    // Pair as Linux.
    const pairChallenge = await challenge(url, sessionId, token, "pair");
    const signedPair = {
      type: "simurgh.daemon.pair",
      session_id: sessionId,
      exam_id: exam.id,
      challenge: pairChallenge,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
    };
    const pairResp = await fetch(`${url}/api/device/pair`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        node_id_hash: id.node_id_hash,
        public_key: id.public_key,
        signed_payload: signedPair,
        signature: sign(id, signedPair),
      }),
    });
    assert.equal(pairResp.status, 200, "Linux pair must succeed");

    // First proof: x11
    const c1 = await challenge(url, sessionId, token, "proof");
    const p1 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 1,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c1,
      ...linuxScanner({ display_server: "x11", coverage: "x11_full" }),
    };
    p1.signature = sign(id, p1);
    const t1 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 1,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4,
          chars_typed: 12,
          effective_wpm: 42,
          focus_losses: 0,
          time_off_window_ms: 0,
          pastes: 0,
          paste_payload_chars: 0,
          max_idle_gap_ms: 0,
          window_seconds: 5,
        },
        daemon_proof: p1,
      }),
    });
    assert.equal(t1.status, 200, "x11 proof must be accepted");

    // Second proof: wayland in SAME session.
    const c2 = await challenge(url, sessionId, token, "proof");
    const p2 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 2,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c2,
      ...linuxScanner({
        display_server: "wayland",
        coverage: "wayland_limited",
        scanner_state: "wayland_compositor_restricted",
      }),
    };
    p2.signature = sign(id, p2);
    const t2 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 2,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4,
          chars_typed: 12,
          effective_wpm: 42,
          focus_losses: 0,
          time_off_window_ms: 0,
          pastes: 0,
          paste_payload_chars: 0,
          max_idle_gap_ms: 0,
          window_seconds: 5,
        },
        daemon_proof: p2,
      }),
    });
    assert.ok(t2.status >= 400 && t2.status < 500, `wayland-after-x11 must 4xx, got ${t2.status}`);
    const body = await t2.json().catch(() => ({}));
    const reason = body.error || body.reason;
    assert.equal(reason, "display_server_mismatch", `expected display_server_mismatch, got ${reason}`);
  } finally {
    srv.kill();
  }
});

test("display_server_mismatch rejection does not block subsequent valid telemetry from same daemon", async () => {
  const { srv, url } = await bootServer();
  try {
    // Bootstrap a Linux session.
    const exam = await (
      await fetch(`${url}/api/exams`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Stage28C-no-seq-block" }),
      })
    ).json();
    const join = await (
      await fetch(`${url}/api/exams/${exam.id}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ studentId: "noseqblock@student.test" }),
      })
    ).json();
    const { sessionId, sessionToken: token } = join;
    await fetch(`${url}/api/sessions/${sessionId}/privacy-accept`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    await fetch(`${url}/api/sessions/${sessionId}/start`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });

    const id = ident();
    const pairChallenge = await challenge(url, sessionId, token, "pair");
    const signedPair = {
      type: "simurgh.daemon.pair",
      session_id: sessionId,
      exam_id: exam.id,
      challenge: pairChallenge,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
    };
    await fetch(`${url}/api/device/pair`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        node_id_hash: id.node_id_hash,
        public_key: id.public_key,
        signed_payload: signedPair,
        signature: sign(id, signedPair),
      }),
    });

    // 1. x11 seq=1 → accepted
    const c1 = await challenge(url, sessionId, token, "proof");
    const p1 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 1,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c1,
      ...linuxScanner({ display_server: "x11", coverage: "x11_full" }),
    };
    p1.signature = sign(id, p1);
    const t1 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 1,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4, chars_typed: 12, effective_wpm: 42, focus_losses: 0,
          time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0,
          max_idle_gap_ms: 0, window_seconds: 5,
        },
        daemon_proof: p1,
      }),
    });
    assert.equal(t1.status, 200, "1: x11 seq=1 must be accepted");

    // 2. wayland seq=2 → REJECTED display_server_mismatch
    const c2 = await challenge(url, sessionId, token, "proof");
    const p2 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 2,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c2,
      ...linuxScanner({
        display_server: "wayland",
        coverage: "wayland_limited",
        scanner_state: "wayland_compositor_restricted",
      }),
    };
    p2.signature = sign(id, p2);
    const t2 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 2,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4, chars_typed: 12, effective_wpm: 42, focus_losses: 0,
          time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0,
          max_idle_gap_ms: 0, window_seconds: 5,
        },
        daemon_proof: p2,
      }),
    });
    assert.equal(t2.status, 409, "2: wayland seq=2 must be rejected");
    const b2 = await t2.json().catch(() => ({}));
    assert.equal(b2.error || b2.reason, "display_server_mismatch");

    // 3. x11 seq=3 → must be accepted. The rejected wayland proof should NOT
    // have caused the daemon's last_sequence to advance, so seq=3 is the
    // natural next sequence for a freshly issued proof challenge.
    const c3 = await challenge(url, sessionId, token, "proof");
    const p3 = {
      type: "simurgh.daemon.proof",
      session_id: sessionId,
      exam_id: exam.id,
      sequence: 3,
      timestamp: new Date().toISOString(),
      node_id_hash: id.node_id_hash,
      daemon_version: "2.8.0",
      platform: "linux",
      capture_excluded_window_count: 0,
      helper_state: "healthy",
      challenge: c3,
      ...linuxScanner({ display_server: "x11", coverage: "x11_full" }),
    };
    p3.signature = sign(id, p3);
    const t3 = await fetch(`${url}/api/telemetry`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        sessionId,
        sequence: 3,
        timestamp: Date.now(),
        telemetry: {
          keystrokes: 4, chars_typed: 12, effective_wpm: 42, focus_losses: 0,
          time_off_window_ms: 0, pastes: 0, paste_payload_chars: 0,
          max_idle_gap_ms: 0, window_seconds: 5,
        },
        daemon_proof: p3,
      }),
    });
    assert.equal(
      t3.status,
      200,
      `3: x11 seq=3 after wayland-rejection must be accepted, got ${t3.status} ${JSON.stringify(await t3.json().catch(() => ({})))}`
    );
  } finally {
    srv.kill();
  }
});
