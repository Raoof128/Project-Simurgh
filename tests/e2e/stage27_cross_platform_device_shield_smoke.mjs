#!/usr/bin/env node
import crypto from "node:crypto";

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
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
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

function windowsScannerFields(overrides = {}) {
  return {
    scanner_state: "healthy",
    scanner_version: "2.6.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 7,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    ...overrides,
  };
}

function macosScannerFields(overrides = {}) {
  return {
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 7,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 6,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    ...overrides,
  };
}

function scannerFieldsFor(platform, overrides = {}) {
  return platform === "macos" ? macosScannerFields(overrides) : windowsScannerFields(overrides);
}

function daemonVersionFor(platform) {
  return platform === "macos" ? "0.4.7" : "0.4.11";
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

function pairEnvelope(identity, sessionId, examId, challengeValue, platform) {
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: sessionId,
    exam_id: examId,
    challenge: challengeValue,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: daemonVersionFor(platform),
    platform,
  };
  return {
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: sign(identity, signed_payload),
  };
}

function proof({ identity, sessionId, examId, sequence, challengeValue, platform, fields = {}, extra = {} }) {
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: sessionId,
    exam_id: examId,
    sequence,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: daemonVersionFor(platform),
    platform,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    challenge: challengeValue,
    ...scannerFieldsFor(platform),
    ...fields,
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

async function rawFetch(baseUrl, path, { method = "GET", token } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
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

async function pairDaemon(baseUrl, sessionId, examId, token, identity, platform, label) {
  const challengeValue = await challenge(baseUrl, sessionId, token, "pair");
  return await expectJson(
    baseUrl,
    "/api/device/pair",
    {
      method: "POST",
      token,
      body: {
        sessionId,
        ...pairEnvelope(identity, sessionId, examId, challengeValue, platform),
      },
    },
    200,
    `pair ${label}`
  );
}

async function runScenarioA(baseUrl) {
  // macOS healthy
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-A-macos-healthy");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "macos", "macOS healthy");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: proofChallenge,
      platform: "macos",
    })
  );
  assertSmoke(resp.status === 200, "A: macOS healthy telemetry rejected", resp);
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "A report"
  );
  assertSmoke(
    report.device_integrity?.daemon_platform === "macos",
    "A: report daemon_platform !== macos",
    report.device_integrity
  );
  assertSmoke(
    report.final_risk_level !== "Critical",
    "A: macOS healthy should not be Critical",
    report
  );
  console.log("Scenario A (macOS healthy): pass");
}

async function runScenarioB(baseUrl) {
  // Windows healthy
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-B-windows-healthy");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "windows", "Windows healthy");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: proofChallenge,
      platform: "windows",
    })
  );
  assertSmoke(resp.status === 200, "B: Windows healthy telemetry rejected", resp);
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "B report"
  );
  assertSmoke(
    report.device_integrity?.daemon_platform === "windows",
    "B: report daemon_platform !== windows",
    report.device_integrity
  );
  assertSmoke(
    report.final_risk_level !== "Critical",
    "B: Windows healthy should not be Critical",
    report
  );
  console.log("Scenario B (Windows healthy): pass");
}

async function runScenarioC(baseUrl) {
  // macOS capture-excluded => Critical
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-C-macos-excluded");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "macos", "macOS Critical");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: proofChallenge,
      platform: "macos",
      fields: macosScannerFields({
        scanner_state: "risk_detected",
        suspicious_window_count: 1,
        window_fingerprint_hashes: [`sha256:${"a".repeat(64)}`],
      }),
      extra: { capture_excluded_window_count: 1 },
    })
  );
  assertSmoke(resp.status === 200, "C: macOS excluded telemetry rejected", resp);
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "C report"
  );
  assertSmoke(
    report.final_risk_level === "Critical",
    "C: macOS capture_excluded did not map to Critical",
    report
  );
  assertSmoke(
    report.device_integrity?.manual_review_recommendation ===
      "Manual review recommended. No automatic misconduct finding.",
    "C: manual review wording missing",
    report.device_integrity
  );
  const verify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "C audit verify"
  );
  assertSmoke(verify.valid === true, "C: audit chain did not verify", verify);
  console.log("Scenario C (macOS capture-excluded Critical): pass");
}

async function runScenarioD(baseUrl) {
  // Windows monitor-only => Warning, manual-review wording present, no shame language
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-D-windows-warning");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "windows", "Windows Warning");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: proofChallenge,
      platform: "windows",
      fields: windowsScannerFields({
        scanner_state: "restricted_detected",
        suspicious_window_count: 1,
        capture_restricted_window_count: 1,
        monitor_only_window_count: 1,
      }),
    })
  );
  assertSmoke(resp.status === 200, "D: Windows Warning telemetry rejected", resp);
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "D report"
  );
  assertSmoke(
    report.final_risk_level === "Warning",
    "D: monitor-only/restricted should yield Warning",
    report
  );
  assertSmoke(
    report.device_integrity?.manual_review_recommendation ===
      "Manual review recommended. No automatic misconduct finding.",
    "D: manual review wording missing",
    report.device_integrity
  );
  const serialized = JSON.stringify(report).toLowerCase();
  // Affirmative misconduct claims (NOT the disclaimer "No automatic misconduct
  // finding", which contains "automatic misconduct" as a substring but
  // legitimately negates it).
  for (const banned of [
    "cheating detected",
    "student guilty",
    "confirmed misconduct",
    "misconduct detected",
    "misconduct confirmed",
    "automatic misconduct detected",
    "automatic misconduct confirmed",
  ]) {
    assertSmoke(
      !serialized.includes(banned),
      `D: report contained forbidden phrase "${banned}"`,
      { snippet: serialized.slice(0, 400) }
    );
  }
  console.log("Scenario D (Windows monitor-only Warning): pass");
}

async function runScenarioE(baseUrl) {
  // Windows capture-excluded => Critical
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-E-windows-critical");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "windows", "Windows Critical");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  const resp = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId,
      sequence: 1,
      challengeValue: proofChallenge,
      platform: "windows",
      fields: windowsScannerFields({
        scanner_state: "risk_detected",
        suspicious_window_count: 1,
        window_fingerprint_hashes: [`sha256:${"c".repeat(64)}`],
      }),
      extra: { capture_excluded_window_count: 1 },
    })
  );
  assertSmoke(resp.status === 200, "E: Windows excluded telemetry rejected", resp);
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { token: INSTRUCTOR_TOKEN },
    200,
    "E report"
  );
  assertSmoke(
    report.final_risk_level === "Critical",
    "E: Windows capture_excluded did not map to Critical",
    report
  );
  console.log("Scenario E (Windows capture-excluded Critical): pass");
}

async function runScenarioF(baseUrl) {
  // Linux pairing => rejected with unsupported_platform
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-F-linux-pair");
  const identity = createIdentity();
  const challengeValue = await challenge(baseUrl, sessionId, token, "pair");
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: sessionId,
    exam_id: examId,
    challenge: challengeValue,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "linux",
  };
  const body = {
    sessionId,
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: sign(identity, signed_payload),
  };
  const response = await fetch(`${baseUrl}/api/device/pair`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  assertSmoke(
    response.status >= 400 && response.status < 500,
    "F: Linux pairing should have been rejected with 4xx",
    { status: response.status, json }
  );
  const reason = json.error || json.reason;
  assertSmoke(
    reason === "unsupported_platform",
    "F: Linux pairing rejection reason !== unsupported_platform",
    { status: response.status, json }
  );
  console.log("Scenario F (Linux unsupported_platform): pass");
}

async function runScenarioG(baseUrl) {
  // Windows valid pairing, telemetry with injected debug fields => 4xx forbidden_local_field
  const { examId, sessionId, token } = await bootstrapSession(baseUrl, "Stage27-G-raw-field");
  const identity = createIdentity();
  await pairDaemon(baseUrl, sessionId, examId, token, identity, "windows", "Windows raw-field");
  const proofChallenge = await challenge(baseUrl, sessionId, token, "proof");
  // Inject debug BEFORE signing so the signature matches the payload but the
  // server rejects it for containing forbidden local fields.
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: sessionId,
    exam_id: examId,
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "windows",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    challenge: proofChallenge,
    ...windowsScannerFields(),
    debug: {
      hwnd: "0x123",
      pid: 4321,
      window_title: "Answers",
      process_name: "hidden.exe",
    },
  };
  const signed = { ...payload, signature: sign(identity, payload) };
  const resp = await sendTelemetry(baseUrl, sessionId, token, 1, signed);
  assertSmoke(
    resp.status >= 400 && resp.status < 500,
    "G: telemetry with raw debug should be rejected with 4xx",
    resp
  );
  const reason = resp.json.error || resp.json.reason;
  assertSmoke(
    reason === "forbidden_local_field",
    "G: rejection reason !== forbidden_local_field",
    resp
  );

  const forbiddenValues = ["0x123", "4321", "Answers", "hidden.exe"];

  const reportResp = await rawFetch(baseUrl, `/api/sessions/${sessionId}/report`, {
    token: INSTRUCTOR_TOKEN,
  });
  if (reportResp.status === 200) {
    const reportJson = JSON.stringify(reportResp.json);
    for (const v of forbiddenValues) {
      assertSmoke(
        !reportJson.includes(v),
        `G: report leaked raw value "${v}"`,
        { snippet: reportJson.slice(0, 400) }
      );
    }
  } else {
    console.log(`  (G) report endpoint returned ${reportResp.status} — no data to leak`);
  }

  const auditResp = await rawFetch(baseUrl, `/api/audit/${sessionId}`, {
    token: INSTRUCTOR_TOKEN,
  });
  if (auditResp.status === 200) {
    const auditJson = JSON.stringify(auditResp.json);
    for (const v of forbiddenValues) {
      assertSmoke(
        !auditJson.includes(v),
        `G: audit leaked raw value "${v}"`,
        { snippet: auditJson.slice(0, 400) }
      );
    }
  } else {
    console.log(`  (G) audit endpoint returned ${auditResp.status} — no data to leak`);
  }
  console.log("Scenario G (raw-field rejection, no leak): pass");
}

async function main() {
  const baseUrl = process.argv[2] ?? "http://127.0.0.1:33127";
  await runScenarioA(baseUrl);
  await runScenarioB(baseUrl);
  await runScenarioC(baseUrl);
  await runScenarioD(baseUrl);
  await runScenarioE(baseUrl);
  await runScenarioF(baseUrl);
  await runScenarioG(baseUrl);
  console.log("Stage 2.7 cross-platform Device Shield smoke: pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
