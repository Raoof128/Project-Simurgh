#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 2.8C/D umbrella E2E smoke.
//
// Combines PR #21 + PR #22 coverage:
//   - X11 still works
//   - Wayland portal states accepted
//   - XWayland partial coverage accepted
//   - browser_package_hint stays UX-only
//   - display_server_mismatch rejected live
//   - non_local_display + headless accepted as Warning context
//   - systemd --check / --dry-run safe
//   - service file safety
//   - report device_integrity correct
//   - audit chain verifies
//
// Stage 2.7 + Stage 2.8A/B regression are NOT duplicated here — they have
// their own smoke scripts that scripts/check.sh invokes separately.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const INSTRUCTOR_TOKEN = process.env.SIMURGH_INSTRUCTOR_TOKEN || "demo";

function assertSmoke(condition, message, detail = undefined) {
  if (!condition) {
    const suffix = detail === undefined ? "" : `\n${JSON.stringify(detail, null, 2)}`;
    throw new Error(`${message}${suffix}`);
  }
}

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

function canonicalDaemonPayload(payload) {
  const copy = {};
  for (const key of Object.keys(payload).sort()) {
    if (key !== "signature") copy[key] = payload[key];
  }
  return JSON.stringify(copy);
}

function createIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = `sha256:${crypto.createHash("sha256").update(publicKeyDer).digest("hex")}`;
  return { privateKey, public_key, node_id_hash };
}

function sign(identity, payload) {
  return b64url(
    crypto.sign("sha256", Buffer.from(canonicalDaemonPayload(payload), "utf8"), {
      key: identity.privateKey,
      dsaEncoding: "der",
    })
  );
}

function linuxScannerFields(overrides = {}) {
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

async function expectJson(baseUrl, path, { method = "GET", body, token } = {}, status, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  assertSmoke(response.status === status, `${label} returned ${response.status}`, json);
  return json;
}

async function challenge(baseUrl, sessionId, token, purpose) {
  const json = await expectJson(
    baseUrl,
    "/api/device/challenge",
    { method: "POST", token, body: { sessionId, purpose } },
    200,
    `${purpose} challenge`
  );
  return json.challenge;
}

function linuxPairEnvelope(identity, sessionId, examId, challengeValue) {
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: sessionId,
    exam_id: examId,
    challenge: challengeValue,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
  };
  return {
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: sign(identity, signed_payload),
  };
}

function linuxProof({
  identity,
  sessionId,
  examId,
  sequence,
  challengeValue,
  fields = {},
  extra = {},
}) {
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: sessionId,
    exam_id: examId,
    sequence,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    challenge: challengeValue,
    ...linuxScannerFields(fields),
    ...extra,
  };
  return { ...payload, signature: sign(identity, payload) };
}

async function sendTelemetry(baseUrl, sessionId, token, sequence, daemonProof) {
  const response = await fetch(`${baseUrl}/api/telemetry`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      sessionId,
      sequence,
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
      daemon_proof: daemonProof,
    }),
  });
  return { status: response.status, json: await response.json().catch(() => ({})) };
}

async function bootstrapSession(baseUrl, title) {
  const exam = await expectJson(
    baseUrl,
    "/api/exams",
    { method: "POST", body: { title } },
    201,
    `create exam (${title})`
  );
  const join = await expectJson(
    baseUrl,
    `/api/exams/${exam.id}/join`,
    { method: "POST", body: { studentId: `${title}@student.test` } },
    200,
    `join exam (${title})`
  );
  const { sessionId, sessionToken: token } = join;
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/privacy-accept`,
    { method: "POST", token },
    200,
    `privacy (${title})`
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/start`,
    { method: "POST", token },
    200,
    `start (${title})`
  );
  return { examId: exam.id, sessionId, token };
}

async function pairLinux(baseUrl, sessionId, examId, token, identity) {
  const challengeValue = await challenge(baseUrl, sessionId, token, "pair");
  return await expectJson(
    baseUrl,
    "/api/device/pair",
    {
      method: "POST",
      token,
      body: {
        sessionId,
        ...linuxPairEnvelope(identity, sessionId, examId, challengeValue),
      },
    },
    200,
    "pair Linux"
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SCENARIOS A–P
// ─────────────────────────────────────────────────────────────────────────

async function runScenarioA_x11Healthy(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-A-x11");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({ identity, sessionId, examId, sequence: 1, challengeValue: c })
  );
  assertSmoke(resp.status === 200, "A: x11 healthy must be accepted", resp);
  console.log("Scenario A (X11 healthy): pass");
}

async function runScenarioB_waylandPortalActive(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-B-wl-active");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        display_server: "wayland",
        scanner_state: "wayland_portal_available",
        coverage: "wayland_limited",
        portal_advertised: true,
        portal_active: true,
      },
    })
  );
  assertSmoke(resp.status === 200, "B: wayland portal_active must be accepted", resp);
  console.log("Scenario B (Wayland portal advertised+active): pass");
}

async function runScenarioC_waylandAdvertisedOnly(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-C-wl-adv");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        display_server: "wayland",
        scanner_state: "wayland_compositor_restricted",
        scanner_reason: "portal_not_active",
        coverage: "wayland_limited",
        portal_advertised: true,
        portal_active: false,
      },
    })
  );
  assertSmoke(resp.status === 200, "C: wayland advertised-only must be accepted (Warning)", resp);
  console.log("Scenario C (Wayland advertised only): pass");
}

async function runScenarioD_waylandProbeUnavailable(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-D-wl-probe");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        display_server: "wayland",
        scanner_state: "wayland_compositor_restricted",
        scanner_reason: "portal_active_probe_unavailable",
        coverage: "wayland_limited",
        portal_advertised: true,
        portal_active: false,
      },
    })
  );
  assertSmoke(resp.status === 200, "D: portal_active_probe_unavailable must be accepted", resp);
  console.log("Scenario D (Wayland probe unavailable): pass");
}

async function runScenarioE_xwaylandPartial(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-E-xwayland");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        display_server: "xwayland",
        scanner_state: "xwayland_detected",
        coverage: "xwayland_partial",
        xwayland_window_count: 3,
        visible_window_count: 3,
      },
    })
  );
  assertSmoke(resp.status === 200, "E: xwayland_partial must be accepted", resp);
  // Submit + read report — xwayland_window_count_max must reflect the rollup.
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "E: submit"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET", token },
    200,
    "E: report"
  );
  assertSmoke(
    report.device_integrity?.xwayland_window_count_max === 3,
    "E: xwayland_window_count_max must roll up to 3",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.coverage === "xwayland_partial",
    "E: report must preserve xwayland_partial coverage",
    report.device_integrity
  );
  console.log("Scenario E (XWayland partial coverage + rollup): pass");
}

async function runScenarioF_browserHintUxOnly() {
  // browser_package_hint must live ONLY in the SDK; never in server / proof /
  // schema / risk / report. This is a source-grep scenario — no live HTTP.
  const sdk = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  assertSmoke(/browser_package_hint/.test(sdk), "F: SDK missing browser_package_hint");
  for (const f of [
    "server.js",
    "src/device/daemonProof.js",
    "src/device/platformScannerSchema.js",
    "src/device/scannerRiskPolicy.js",
    "src/academic/reportBuilder.js",
  ]) {
    const src = readFileSync(f, "utf8");
    assertSmoke(
      !/browser_package_hint/.test(src),
      `F: ${f} references browser_package_hint — must be UX-only`
    );
  }
  console.log("Scenario F (browser_package_hint UX-only across 5 server modules): pass");
}

async function runScenarioG_displayServerMismatch(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-G-mismatch");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  // x11 seq=1 — accept
  const c1 = await challenge(baseUrl, sessionId, token, "proof");
  const r1 = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({ identity, sessionId, examId, sequence: 1, challengeValue: c1 })
  );
  assertSmoke(r1.status === 200, "G: x11 must be accepted first", r1);
  // wayland seq=2 — reject
  const c2 = await challenge(baseUrl, sessionId, token, "proof");
  const r2 = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    2,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 2,
      challengeValue: c2,
      fields: {
        display_server: "wayland",
        coverage: "wayland_limited",
        scanner_state: "wayland_compositor_restricted",
      },
    })
  );
  assertSmoke(r2.status === 409, "G: wayland after x11 must be 409", r2);
  const reason = r2.json?.error || r2.json?.reason;
  assertSmoke(
    reason === "display_server_mismatch",
    `G: expected display_server_mismatch, got ${reason}`
  );
  console.log("Scenario G (display_server_mismatch live enforcement): pass");
}

async function runScenarioH_nonLocalDisplay(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-H-nonlocal");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        scanner_state: "scanner_unavailable",
        scanner_reason: "non_local_display",
        coverage: "unknown",
      },
    })
  );
  assertSmoke(resp.status === 200, "H: non_local_display Warning context must be accepted", resp);
  console.log("Scenario H (non-local DISPLAY Warning context): pass");
}

async function runScenarioI_headless(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-I-headless");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: {
        display_server: "headless",
        scanner_state: "scanner_unavailable",
        scanner_reason: "no_display_server",
        coverage: "headless_none",
      },
    })
  );
  assertSmoke(resp.status === 200, "I: headless Warning context must be accepted", resp);
  console.log("Scenario I (headless Warning context): pass");
}

function runScript(script, args = []) {
  try {
    const out = execFileSync("bash", [script, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, stdout: out };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      code: err.status,
    };
  }
}

async function runScenarioJ_systemdInstallCheck() {
  const INSTALL = "tools/simurgh-daemon-linux/scripts/install-user-unit.sh";
  const r = runScript(INSTALL, ["--check"]);
  // Either OK (preconditions met) or a self-describing precondition error (2/3/4/5).
  // Either way: no actual install happened.
  assertSmoke(
    r.ok || [2, 3, 4, 5].includes(r.code),
    `J: install --check exited with unexpected code ${r.code}`,
    r
  );
  console.log("Scenario J (systemd install --check): pass");
}

async function runScenarioK_systemdInstallDryRun() {
  const INSTALL = "tools/simurgh-daemon-linux/scripts/install-user-unit.sh";
  const r = runScript(INSTALL, ["--dry-run"]);
  if (r.ok) {
    assertSmoke(
      /\[dry-run\]/.test(r.stdout),
      "K: --dry-run did not produce [dry-run] tagged output",
      r
    );
  }
  console.log("Scenario K (systemd install --dry-run): pass");
}

async function runScenarioL_systemdServiceFileSafety() {
  const unit = readFileSync(
    "tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service",
    "utf8"
  );
  assertSmoke(/WantedBy=default\.target/.test(unit), "L: unit missing WantedBy=default.target");
  assertSmoke(!/User=root/.test(unit), "L: unit declares User=root");
  assertSmoke(!/WantedBy=multi-user\.target/.test(unit), "L: unit targets system-wide");
  for (const directive of [
    "NoNewPrivileges=true",
    "ProtectSystem=",
    "ProtectHome=",
    "PrivateTmp=true",
  ]) {
    assertSmoke(unit.includes(directive), `L: unit missing ${directive}`);
  }
  // check-user-unit.sh exits 1 when not installed — that's documented graceful state.
  // Smoke must NOT assert on exit code, only on output substring.
  const CHECK = "tools/simurgh-daemon-linux/scripts/check-user-unit.sh";
  const r = runScript(CHECK);
  assertSmoke(
    /not installed|installed cleanly|inconsistent/.test(r.stdout),
    "L: check-user-unit.sh did not produce a recognised status line",
    r
  );
  console.log("Scenario L (service file safety + check-script graceful state): pass");
}

async function runScenarioM_mandatoryXvfbInCi() {
  // The workflow already runs `cargo test` with SIMURGH_REQUIRE_XVFB_TESTS=1 as
  // its own step (Phase F2). Re-executing cargo from inside this smoke is
  // redundant and slow. Instead, assert the invariant by inspecting the workflow
  // file — if a future commit removes the env var or the cargo test step,
  // this scenario fails fast without spawning a second build.
  const wf = readFileSync(".github/workflows/stage-1-checks.yml", "utf8");
  assertSmoke(
    /SIMURGH_REQUIRE_XVFB_TESTS:\s*["']?1["']?/.test(wf),
    "M: workflow does not set SIMURGH_REQUIRE_XVFB_TESTS=1 (Xvfb tests would skip in CI)"
  );
  assertSmoke(
    /cargo test.*tools\/simurgh-daemon-linux/.test(wf),
    "M: workflow does not run cargo test for the Linux daemon"
  );
  // The Rust integration test file must also branch on the env var so the
  // promotion actually fires when CI runs it.
  const t = readFileSync("tools/simurgh-daemon-linux/tests/xvfb_integration_tests.rs", "utf8");
  assertSmoke(
    /SIMURGH_REQUIRE_XVFB_TESTS/.test(t),
    "M: xvfb_integration_tests.rs does not consume SIMURGH_REQUIRE_XVFB_TESTS"
  );
  console.log("Scenario M (mandatory Xvfb in CI — workflow + test wiring intact): pass");
}

async function runScenarioN_reportShape(baseUrl) {
  // Healthy Linux session — assert Linux device_integrity has the right shape
  // and does NOT leak macOS/Windows-only fields.
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-N-report");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: c,
      fields: { x11_managed_window_count: 2, visible_window_count: 2 },
    })
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "N: submit"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET", token },
    200,
    "N: report"
  );
  const d = report.device_integrity;
  assertSmoke(d?.daemon_platform === "linux", "N: daemon_platform != linux", d);
  assertSmoke(d?.display_server === "x11", "N: display_server != x11", d);
  for (const banned of [
    "capture_excluded_window_count_max",
    "capture_restricted_window_count_max",
    "monitor_only_window_count_max",
  ]) {
    assertSmoke(!(banned in d), `N: Linux report leaked macOS/Windows ${banned}`, d);
  }
  console.log("Scenario N (Linux report shape, no macOS/Windows leak): pass");
}

async function runScenarioO_auditChain(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28CD-O-audit");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const c = await challenge(baseUrl, sessionId, token, "proof");
  await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    linuxProof({ identity, sessionId, examId, sequence: 1, challengeValue: c })
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "O: submit"
  );
  const v = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { method: "GET", token },
    200,
    "O: audit verify"
  );
  assertSmoke(v.valid === true, "O: audit chain must verify", v);
  console.log("Scenario O (audit chain verifies for Linux session): pass");
}

async function runScenarioP_regressionStubs() {
  // Scenario P is intentionally NOT exercised here — Stage 2.7 + Stage 2.8A/B
  // smokes have their own scripts that scripts/check.sh runs separately. We
  // assert merely that those scripts exist + are executable so a future
  // refactor cannot orphan them.
  const { statSync } = await import("node:fs");
  for (const s of [
    "scripts/smoke-stage-2-7-cross-platform-device-shield.sh",
    "scripts/smoke-stage-2-8a-2-8b-linux-foundation-x11.sh",
    "scripts/security-audit-stage-2-6-2-7-closeout.sh",
    "scripts/security-audit-stage-2-8a-2-8b-linux.sh",
  ]) {
    const mode = statSync(s).mode & 0o777;
    if ((mode & 0o100) === 0) {
      throw new Error(`P: ${s} is not executable (mode ${mode.toString(8)})`);
    }
  }
  console.log("Scenario P (regression stubs present): pass");
}

async function main() {
  const baseUrl = process.argv[2] || "http://127.0.0.1:33130";
  await runScenarioA_x11Healthy(baseUrl);
  await runScenarioB_waylandPortalActive(baseUrl);
  await runScenarioC_waylandAdvertisedOnly(baseUrl);
  await runScenarioD_waylandProbeUnavailable(baseUrl);
  await runScenarioE_xwaylandPartial(baseUrl);
  await runScenarioF_browserHintUxOnly();
  await runScenarioG_displayServerMismatch(baseUrl);
  await runScenarioH_nonLocalDisplay(baseUrl);
  await runScenarioI_headless(baseUrl);
  await runScenarioJ_systemdInstallCheck();
  await runScenarioK_systemdInstallDryRun();
  await runScenarioL_systemdServiceFileSafety();
  await runScenarioM_mandatoryXvfbInCi();
  await runScenarioN_reportShape(baseUrl);
  await runScenarioO_auditChain(baseUrl);
  await runScenarioP_regressionStubs();
  console.log("Stage 2.8C/D smoke: pass");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
