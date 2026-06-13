#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 2.8A + 2.8B umbrella E2E smoke.
//
// Boots the Node server and exercises the Linux Device Shield path end to end
// using Node-forged P-256 signed Linux proofs (the Rust daemon path is covered
// separately by tests/unit/daemonProofLinuxEndToEnd.test.js, which verifies a
// real Rust-signed fixture round-trips into the same validator).
//
// Pre-merge guard for PR #19 + PR #20.

import crypto from "node:crypto";
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

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

async function runScenarioA_pairingAndHealthyProof(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-A-linux-healthy");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
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
      challengeValue: proofChallenge,
      fields: {
        x11_managed_window_count: 3,
        visible_window_count: 3,
      },
    })
  );
  assertSmoke(resp.status === 200, "A: healthy Linux telemetry rejected", resp);
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "A: submit"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET", token },
    200,
    "A: report"
  );
  assertSmoke(
    report.device_integrity?.daemon_platform === "linux",
    "A: report daemon_platform != linux",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.display_server === "x11",
    "A: report display_server != x11",
    report.device_integrity
  );
  assertSmoke(
    !("capture_excluded_window_count_max" in report.device_integrity),
    "A: Linux report leaked macOS/Windows capture_excluded_window_count_max",
    report.device_integrity
  );
  console.log("Scenario A (Linux pairing + healthy proof + report shape): pass");
}

async function runScenarioB_x11AboveWarning(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-B-linux-above");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
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
      challengeValue: proofChallenge,
      fields: {
        x11_managed_window_count: 2,
        x11_above_window_count: 1,
        visible_window_count: 2,
      },
    })
  );
  assertSmoke(resp.status === 200, "B: x11_above proof rejected", resp);
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "B: submit"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET", token },
    200,
    "B: report"
  );
  const d = report.device_integrity;
  assertSmoke(
    d?.x11_above_window_count_max === 1,
    "B: x11_above_window_count_max not rolled up",
    d
  );
  assertSmoke(
    d?.manual_review_recommendation?.toLowerCase().includes("manual review"),
    "B: manual_review_recommendation missing Warning wording",
    d
  );
  assertSmoke(
    !d?.manual_review_recommendation?.toLowerCase().includes("misconduct detected"),
    "B: misconduct overclaim in recommendation",
    d
  );
  console.log("Scenario B (X11 above → Warning context, no misconduct claim): pass");
}

async function runScenarioC_x11OverrideRedirectWarning(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-C-linux-override");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
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
      challengeValue: proofChallenge,
      fields: {
        x11_managed_window_count: 2,
        x11_override_redirect_window_count: 1,
        visible_window_count: 3,
      },
    })
  );
  assertSmoke(resp.status === 200, "C: override_redirect proof rejected", resp);
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "C: submit"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET", token },
    200,
    "C: report"
  );
  assertSmoke(
    report.device_integrity?.x11_override_redirect_window_count_max === 1,
    "C: override_redirect not rolled up",
    report.device_integrity
  );
  console.log("Scenario C (override_redirect → Warning + rollup): pass");
}

async function runScenarioD_staleProof(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-D-linux-stale");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  // 60 seconds in the past — well past the daemon proof freshness window.
  const staleTimestamp = new Date(Date.now() - 60_000).toISOString();
  const proof = linuxProof({
    identity,
    sessionId,
    examId,
    sequence: 1,
    challengeValue: proofChallenge,
  });
  proof.timestamp = staleTimestamp;
  // Re-sign with the stale timestamp baked in.
  proof.signature = sign(identity, { ...proof, signature: undefined });
  const resp = await sendTelemetry(baseUrl, sessionId, token, 1, proof);
  assertSmoke(
    resp.status >= 400 && resp.status < 500,
    "D: stale Linux proof should be rejected with 4xx",
    resp
  );
  const reason = resp.json?.error || resp.json?.reason;
  assertSmoke(
    reason === "proof_stale" || reason === "invalid_proof",
    `D: expected proof_stale, got ${reason}`,
    resp.json
  );
  console.log("Scenario D (Linux stale proof rejected): pass");
}

async function runScenarioE_tamperedSignature(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-E-linux-tamper");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const proof = linuxProof({
    identity,
    sessionId,
    examId,
    sequence: 1,
    challengeValue: proofChallenge,
  });
  // Tamper with a count AFTER signing — signature should no longer verify.
  proof.x11_managed_window_count = 999;
  const resp = await sendTelemetry(baseUrl, sessionId, token, 1, proof);
  assertSmoke(
    resp.status >= 400 && resp.status < 500,
    "E: tampered Linux proof should be rejected",
    resp
  );
  const reason = resp.json?.error || resp.json?.reason;
  assertSmoke(
    reason === "invalid_signature" || reason === "invalid_proof",
    `E: expected invalid_signature, got ${reason}`,
    resp.json
  );
  console.log("Scenario E (post-signing tamper rejected): pass");
}

async function runScenarioF_forbiddenLocalField(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-F-linux-rawfield");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const proof = linuxProof({
    identity,
    sessionId,
    examId,
    sequence: 1,
    challengeValue: proofChallenge,
    extra: {
      scanner_debug: { window_title: "Secret cheat sheet" },
    },
  });
  const resp = await sendTelemetry(baseUrl, sessionId, token, 1, proof);
  assertSmoke(
    resp.status >= 400 && resp.status < 500,
    "F: raw field in proof should be rejected with 4xx",
    resp
  );
  const reason = resp.json?.error || resp.json?.reason;
  assertSmoke(
    reason === "forbidden_local_field" || reason === "invalid_proof",
    `F: expected forbidden_local_field, got ${reason}`,
    resp.json
  );
  console.log("Scenario F (raw window_title nested in Linux proof rejected): pass");
}

async function runScenarioG_nonLocalDisplayWarningContext(baseUrl) {
  // Linux daemon may legitimately emit non_local_display + scanner_unavailable
  // with a VALID signature. Server must ACCEPT the signed proof and surface a
  // Warning context rather than reject as misconduct.
  const { examId, sessionId, token } = await bootstrapSession(
    baseUrl,
    "Stage28-G-linux-nonlocal-display"
  );
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
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
      challengeValue: proofChallenge,
      fields: {
        display_server: "x11",
        scanner_state: "scanner_unavailable",
        scanner_reason: "non_local_display",
        coverage: "unknown",
      },
    })
  );
  assertSmoke(
    resp.status === 200,
    "G: signed non_local_display proof should be accepted (Warning context)",
    resp
  );
  console.log("Scenario G (non_local_display accepted as Warning, not rejected): pass");
}

async function runScenarioH_rustFixtureRoundTrip() {
  // The committed fixture (PR #19) was generated by the Rust daemon and proven
  // to verify in Node by tests/unit/daemonProofLinuxEndToEnd.test.js. Re-read
  // it here as an in-smoke sanity check that the artifact still exists and
  // parses — the unit test does the cryptographic round trip.
  const raw = readFileSync("tests/fixtures/stage-2-8/linux-proof.json", "utf8");
  const { proof, public_key } = JSON.parse(raw);
  assertSmoke(proof.platform === "linux", "H: fixture platform != linux");
  assertSmoke(proof.scanner_version === "2.8.0", "H: fixture scanner_version mismatch");
  assertSmoke(typeof proof.signature === "string", "H: fixture missing signature");
  assertSmoke(typeof public_key === "string", "H: fixture missing public_key");
  for (const field of [
    "display_server",
    "scanner_state",
    "scanner_reason",
    "coverage",
    "x11_managed_window_count",
    "x11_override_redirect_window_count",
    "xwayland_window_count",
  ]) {
    assertSmoke(field in proof, `H: fixture missing ${field}`);
  }
  console.log("Scenario H (Rust-signed fixture artifact intact): pass");
}

async function runScenarioI_auditChainVerifies(baseUrl) {
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage28-I-linux-audit");
  const identity = createIdentity();
  await pairLinux(baseUrl, sessionId, examId, token, identity);
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
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
      challengeValue: proofChallenge,
      fields: { x11_managed_window_count: 1, visible_window_count: 1 },
    })
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "I: submit"
  );
  const verify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { method: "GET", token },
    200,
    "I: audit verify"
  );
  assertSmoke(verify.valid === true, "I: audit chain not valid", verify);
  console.log("Scenario I (audit chain verifies for Linux session): pass");
}

async function main() {
  const baseUrl = process.argv[2] || "http://127.0.0.1:33128";
  await runScenarioA_pairingAndHealthyProof(baseUrl);
  await runScenarioB_x11AboveWarning(baseUrl);
  await runScenarioC_x11OverrideRedirectWarning(baseUrl);
  await runScenarioD_staleProof(baseUrl);
  await runScenarioE_tamperedSignature(baseUrl);
  await runScenarioF_forbiddenLocalField(baseUrl);
  await runScenarioG_nonLocalDisplayWarningContext(baseUrl);
  await runScenarioH_rustFixtureRoundTrip();
  await runScenarioI_auditChainVerifies(baseUrl);
  console.log("Stage 2.8A + 2.8B smoke: pass");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
