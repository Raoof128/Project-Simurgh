#!/usr/bin/env node
import crypto from "node:crypto";

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

function pairEnvelope(identity, sessionId, examId, challengeValue) {
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: sessionId,
    exam_id: examId,
    challenge: challengeValue,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "windows",
  };
  return {
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: sign(identity, signed_payload),
  };
}

function proof({ identity, sessionId, examId, sequence, challengeValue, fields = {} }) {
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: sessionId,
    exam_id: examId,
    sequence,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "windows",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    challenge: challengeValue,
    ...windowsScannerFields(),
    ...fields,
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

async function pauseForTelemetryWindow() {
  await new Promise((resolve) => setTimeout(resolve, 2600));
}

async function main() {
  const baseUrl = process.argv[2] ?? "http://127.0.0.1:33126";
  const identity = createIdentity();
  const exam = await expectJson(
    baseUrl,
    "/api/exams",
    { method: "POST", body: { title: "Stage 2.6 Windows scanner smoke" } },
    201,
    "create exam"
  );
  const join = await expectJson(
    baseUrl,
    `/api/exams/${exam.id}/join`,
    { method: "POST", body: { studentId: "stage26@student.test" } },
    200,
    "join exam"
  );
  const { sessionId, sessionToken: token } = join;
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/privacy-accept`,
    { method: "POST", token },
    200,
    "privacy"
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/start`,
    { method: "POST", token },
    200,
    "start"
  );
  await expectJson(
    baseUrl,
    "/api/device/pair",
    {
      method: "POST",
      token,
      body: {
        sessionId,
        ...pairEnvelope(
          identity,
          sessionId,
          exam.id,
          await challenge(baseUrl, sessionId, token, "pair")
        ),
      },
    },
    200,
    "pair Windows daemon"
  );

  const healthy = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    1,
    proof({
      identity,
      sessionId,
      examId: exam.id,
      sequence: 1,
      challengeValue: await challenge(baseUrl, sessionId, token, "proof"),
    })
  );
  assertSmoke(
    healthy.status === 200 && healthy.json.device_integrity?.platform === "windows",
    "healthy Windows proof rejected",
    healthy
  );

  await pauseForTelemetryWindow();
  const monitorOnly = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    2,
    proof({
      identity,
      sessionId,
      examId: exam.id,
      sequence: 2,
      challengeValue: await challenge(baseUrl, sessionId, token, "proof"),
      fields: windowsScannerFields({
        scanner_state: "restricted_detected",
        suspicious_window_count: 1,
        capture_restricted_window_count: 1,
        monitor_only_window_count: 1,
      }),
    })
  );
  assertSmoke(
    monitorOnly.status === 200 && monitorOnly.json.risk_level === "Warning",
    "WDA_MONITOR did not map to Warning",
    monitorOnly
  );

  await pauseForTelemetryWindow();
  const excluded = await sendTelemetry(
    baseUrl,
    sessionId,
    token,
    3,
    proof({
      identity,
      sessionId,
      examId: exam.id,
      sequence: 3,
      challengeValue: await challenge(baseUrl, sessionId, token, "proof"),
      fields: windowsScannerFields({
        scanner_state: "risk_detected",
        capture_excluded_window_count: 1,
        suspicious_window_count: 1,
        window_fingerprint_hashes: [`sha256:${"c".repeat(64)}`],
      }),
    })
  );
  assertSmoke(
    excluded.status === 200 && excluded.json.risk_level === "Critical",
    "WDA_EXCLUDEFROMCAPTURE did not map to Critical",
    excluded
  );

  await pauseForTelemetryWindow();
  const tamperBase = proof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 4,
    challengeValue: await challenge(baseUrl, sessionId, token, "proof"),
  });
  const tampered = await sendTelemetry(baseUrl, sessionId, token, 4, {
    ...tamperBase,
    visible_window_count: 99,
  });
  assertSmoke(
    tampered.status === 401 && tampered.json.error === "invalid_signature",
    "tampered Windows scanner proof accepted",
    tampered
  );

  await pauseForTelemetryWindow();
  const raw = proof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 5,
    challengeValue: await challenge(baseUrl, sessionId, token, "proof"),
  });
  const rawRejected = await sendTelemetry(baseUrl, sessionId, token, 5, {
    ...raw,
    scanner_debug: { hwnd: "0x1234" },
  });
  assertSmoke(
    rawRejected.status === 409 && rawRejected.json.error === "forbidden_local_field",
    "raw HWND was not rejected",
    rawRejected
  );

  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "submit"
  );
  const report = await expectJson(baseUrl, `/api/sessions/${sessionId}/report`, {}, 200, "report");
  assertSmoke(
    report.device_integrity?.platform === "windows",
    "report missing Windows platform",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.monitor_only_window_count_max === 1,
    "report missing monitor-only count",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.capture_excluded_window_count_max === 1,
    "report missing excluded count",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.manual_review_recommendation ===
      "Manual review recommended. No automatic misconduct finding.",
    "report lost manual review wording",
    report.device_integrity
  );
  const auditVerify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    {},
    200,
    "audit verify"
  );
  assertSmoke(auditVerify.valid === true, "audit chain did not verify", auditVerify);
  console.log("Stage 2.6 Windows scanner smoke: pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
