#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const FORBIDDEN_TERMS = [
  "process_name",
  "window_title",
  "pid",
  "username",
  "home_directory",
  "serial_number",
  "mac_address",
  "screen_pixels",
  "screenshot",
  "webcam",
  "typed_content",
  "paste_content",
];

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:33100",
    hardenedBaseUrl: "http://127.0.0.1:33101",
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i];
    else if (argv[i] === "--hardened-base-url") args.hardenedBaseUrl = argv[++i];
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

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

function createMockDaemonIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = `sha256:${crypto.createHash("sha256").update(publicKeyDer).digest("hex")}`;
  return { privateKey, public_key, node_id_hash };
}

function signDaemonPayload(identity, payload) {
  const signature = crypto.sign("sha256", Buffer.from(canonicalDaemonPayload(payload), "utf8"), {
    key: identity.privateKey,
    dsaEncoding: "der",
  });
  return b64url(signature);
}

function scannerFields(overrides = {}) {
  return {
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 8,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 1,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    ...overrides,
  };
}

function makePairingEnvelope({ identity, sessionId, examId, challenge }) {
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: sessionId,
    exam_id: examId,
    challenge,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.7",
    platform: "macos",
  };
  return {
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: signDaemonPayload(identity, signed_payload),
  };
}

function makeProof({ identity, sessionId, examId, challenge, sequence, fields = {} }) {
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: sessionId,
    exam_id: examId,
    sequence,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.7",
    platform: "macos",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    ...scannerFields(),
    challenge,
    ...fields,
  };
  return { ...payload, signature: signDaemonPayload(identity, payload) };
}

function standardTelemetry() {
  return {
    keystrokes: 4,
    chars_typed: 12,
    effective_wpm: 42,
    focus_losses: 0,
    time_off_window_ms: 0,
    pastes: 0,
    paste_payload_chars: 0,
    max_idle_gap_ms: 0,
    window_seconds: 5,
  };
}

async function waitForTelemetryWindow() {
  await new Promise((resolve) => setTimeout(resolve, 2600));
}

async function requestJson(baseUrl, pathName, { method = "GET", body, token } = {}) {
  const response = await fetch(new URL(pathName, baseUrl), {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, json };
}

async function expectJson(baseUrl, pathName, options, expectedStatus, label) {
  const result = await requestJson(baseUrl, pathName, options);
  assertSmoke(
    result.status === expectedStatus,
    `${label} returned ${result.status}, expected ${expectedStatus}`,
    result.json
  );
  return result.json;
}

async function checkSdkLoad() {
  const sdkPath = path.join(projectRoot, "public/sdk/simurgh-browser-sdk.js");
  const indexPath = path.join(projectRoot, "public/index.html");
  const [sdkSource, indexSource] = await Promise.all([
    fs.readFile(sdkPath, "utf8"),
    fs.readFile(indexPath, "utf8"),
  ]);
  assertSmoke(sdkSource.includes("createSimurghClient"), "Browser SDK source missing client API");
  assertSmoke(
    indexSource.includes("simurgh-browser-sdk.js"),
    "public/index.html does not reference the browser SDK"
  );
  assertSmoke(
    !/token=.*location\.href|location\.search.*token/i.test(sdkSource),
    "SDK has token URL logic"
  );
  const sdk = await import(pathToFileURL(sdkPath).href);
  assertSmoke(
    typeof sdk.createSimurghClient === "function",
    "SDK import did not expose createSimurghClient"
  );
  assertSmoke(
    sdk.SIMURGH_DAEMON_STATES.includes("proof_ready"),
    "SDK daemon states missing proof_ready"
  );
}

async function checkRawLocalFieldValidator() {
  const { validateDaemonProof } = await import(
    pathToFileURL(path.join(projectRoot, "src/device/daemonProof.js")).href
  );
  for (const field of FORBIDDEN_TERMS) {
    const identity = createMockDaemonIdentity();
    const proof = makeProof({
      identity,
      sessionId: "raw_field_check",
      examId: "raw_field_exam",
      sequence: 1,
      challenge: b64url(crypto.randomBytes(32)),
    });
    const result = validateDaemonProof(
      {
        ...proof,
        [field]: field === "pid" ? 123 : "raw-local-data",
      },
      {
        now: Date.now(),
        expectedSessionId: "raw_field_check",
        expectedExamId: "raw_field_exam",
        pairedNode: { node_id_hash: identity.node_id_hash, public_key: identity.public_key },
      }
    );
    assertSmoke(
      result.reason === "forbidden_local_field",
      `validator did not reject raw local field ${field}`,
      result
    );
  }
}

async function pairDaemon(baseUrl, sessionId, examId, sessionToken, identity) {
  const challenge = await expectJson(
    baseUrl,
    "/api/device/challenge",
    { method: "POST", token: sessionToken, body: { sessionId, purpose: "pair" } },
    200,
    "pair challenge"
  );
  const pair = await expectJson(
    baseUrl,
    "/api/device/pair",
    {
      method: "POST",
      token: sessionToken,
      body: {
        sessionId,
        ...makePairingEnvelope({ identity, sessionId, examId, challenge: challenge.challenge }),
      },
    },
    200,
    "daemon pair"
  );
  assertSmoke(pair.node_id_hash === identity.node_id_hash, "paired node hash mismatch", pair);
}

async function nextProofChallenge(baseUrl, sessionId, token) {
  const challenge = await expectJson(
    baseUrl,
    "/api/device/challenge",
    { method: "POST", token, body: { sessionId, purpose: "proof" } },
    200,
    "proof challenge"
  );
  return challenge.challenge;
}

async function sendTelemetry(baseUrl, sessionId, token, sequence, daemonProof) {
  return requestJson(baseUrl, "/api/telemetry", {
    method: "POST",
    token,
    body: {
      sessionId,
      sequence,
      timestamp: Date.now(),
      telemetry: standardTelemetry(),
      ...(daemonProof ? { daemon_proof: daemonProof } : {}),
    },
  });
}

async function assertNoForbiddenGeneratedData(label, value) {
  const text = JSON.stringify(value);
  const found = FORBIDDEN_TERMS.filter((term) => text.includes(term));
  assertSmoke(found.length === 0, `${label} leaked forbidden local fields`, found);
}

async function runMainSmoke(baseUrl) {
  const identity = createMockDaemonIdentity();
  const exam = await expectJson(
    baseUrl,
    "/api/exams",
    { method: "POST", body: { title: "Stage 2.4/2.5 smoke", durationMinutes: 30 } },
    201,
    "create exam"
  );
  const sessionId = `stage24_25_${crypto.randomBytes(4).toString("hex")}`;
  const join = await expectJson(
    baseUrl,
    `/api/exams/${exam.id}/join`,
    { method: "POST", body: { studentId: "stage-smoke@example.edu", sessionId } },
    200,
    "join exam"
  );
  const token = join.sessionToken;

  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/privacy-accept`,
    { method: "POST", token },
    200,
    "privacy accept"
  );
  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/start`,
    { method: "POST", token },
    200,
    "start session"
  );
  await pairDaemon(baseUrl, sessionId, exam.id, token, identity);

  const healthyProof = makeProof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 1,
    challenge: await nextProofChallenge(baseUrl, sessionId, token),
  });
  const healthy = await sendTelemetry(baseUrl, sessionId, token, 1, healthyProof);
  assertSmoke(healthy.status === 200, "healthy scanner telemetry rejected", healthy.json);
  assertSmoke(
    healthy.json.device_integrity?.daemon_state === "healthy",
    "healthy daemon state missing",
    healthy.json
  );
  assertSmoke(
    healthy.json.device_integrity?.scanner_state === "healthy",
    "healthy scanner state missing",
    healthy.json
  );

  const riskProof = makeProof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 2,
    challenge: await nextProofChallenge(baseUrl, sessionId, token),
    fields: {
      capture_excluded_window_count: 1,
      helper_state: "risk_detected",
      ...scannerFields({
        scanner_state: "risk_detected",
        suspicious_window_count: 1,
        visible_window_count: 2,
        window_fingerprint_hashes: [`sha256:${"a".repeat(64)}`],
      }),
    },
  });
  const risky = await sendTelemetry(baseUrl, sessionId, token, 2, riskProof);
  assertSmoke(risky.status === 200, "risk scanner telemetry rejected", risky.json);
  assertSmoke(
    risky.json.risk_level === "Critical",
    "risk scanner proof did not escalate to Critical",
    risky.json
  );
  assertSmoke(
    risky.json.recommendation === "Manual review required. No automatic misconduct finding.",
    "risk recommendation lost manual-review wording",
    risky.json
  );

  const tamperBase = makeProof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 3,
    challenge: await nextProofChallenge(baseUrl, sessionId, token),
  });
  const tampered = await sendTelemetry(baseUrl, sessionId, token, 3, {
    ...tamperBase,
    capture_excluded_window_count: 1,
    scanner_state: "risk_detected",
    suspicious_window_count: 1,
  });
  assertSmoke(
    tampered.status === 401 && tampered.json.error === "invalid_signature",
    "tampered scanner field was not rejected",
    tampered
  );

  await waitForTelemetryWindow();
  const replayProof = makeProof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 4,
    challenge: await nextProofChallenge(baseUrl, sessionId, token),
    fields: {
      capture_excluded_window_count: 1,
      helper_state: "risk_detected",
      ...scannerFields({
        scanner_state: "risk_detected",
        suspicious_window_count: 1,
        visible_window_count: 2,
        window_fingerprint_hashes: [`sha256:${"b".repeat(64)}`],
      }),
    },
  });
  const firstReplayUse = await sendTelemetry(baseUrl, sessionId, token, 4, replayProof);
  assertSmoke(firstReplayUse.status === 200, "first replay proof use failed", firstReplayUse.json);
  await waitForTelemetryWindow();
  const replayed = await sendTelemetry(baseUrl, sessionId, token, 5, replayProof);
  assertSmoke(
    replayed.status === 409 && replayed.json.error === "challenge_not_found",
    "replayed proof was not rejected",
    replayed
  );

  await waitForTelemetryWindow();
  const rawFieldProof = makeProof({
    identity,
    sessionId,
    examId: exam.id,
    sequence: 6,
    challenge: await nextProofChallenge(baseUrl, sessionId, token),
  });
  const rawRejected = await sendTelemetry(baseUrl, sessionId, token, 6, {
    ...rawFieldProof,
    process_name: "SecretApp",
  });
  assertSmoke(
    rawRejected.status === 409 && rawRejected.json.error === "forbidden_local_field",
    "raw local field proof was not rejected",
    rawRejected
  );

  await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/submit`,
    { method: "POST", token },
    200,
    "submit session"
  );
  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET" },
    200,
    "fetch report"
  );
  assertSmoke(
    report.device_integrity?.scanner_final_state === "risk_detected",
    "report missing scanner risk",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.capture_excluded_window_count_max === 1,
    "report missing capture-excluded max",
    report.device_integrity
  );
  assertSmoke(
    report.device_integrity?.manual_review_recommendation ===
      "Manual review recommended. No automatic misconduct finding.",
    "report device-integrity recommendation changed",
    report.device_integrity
  );
  await assertNoForbiddenGeneratedData("report", report);

  const auditVerify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { method: "GET" },
    200,
    "audit verify"
  );
  assertSmoke(auditVerify.valid === true, "audit chain did not verify", auditVerify);
  const audit = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}`,
    { method: "GET" },
    200,
    "audit export"
  );
  const auditTypes = new Set((audit.entries || []).map((entry) => entry.type));
  for (const required of [
    "DAEMON_PROOF_VERIFIED",
    "SCANNER_SCAN_COMPLETED",
    "SCANNER_RISK_DETECTED",
    "DAEMON_PROOF_REJECTED",
    "SCANNER_PRIVACY_REJECTED",
  ]) {
    assertSmoke(auditTypes.has(required), `audit missing ${required}`, audit.entries);
  }
  await assertNoForbiddenGeneratedData("audit", audit);

  const dashboard = await expectJson(
    baseUrl,
    `/api/dashboard/${sessionId}`,
    { method: "GET" },
    200,
    "dashboard state"
  );
  assertSmoke(
    dashboard.daemon?.scanner_state === "risk_detected",
    "dashboard missing scanner state",
    dashboard
  );
  assertSmoke(
    dashboard.daemon?.capture_excluded_window_count_max === 1,
    "dashboard missing scanner count",
    dashboard
  );
  await assertNoForbiddenGeneratedData("dashboard", dashboard);
}

async function runHardenedSmoke(hardenedBaseUrl) {
  const exam = await expectJson(
    hardenedBaseUrl,
    "/api/exams",
    { method: "POST", body: { title: "Stage 2.4/2.5 hardened smoke", durationMinutes: 15 } },
    201,
    "hardened create exam"
  );
  const sessionId = `stage24_25_required_${crypto.randomBytes(4).toString("hex")}`;
  const join = await expectJson(
    hardenedBaseUrl,
    `/api/exams/${exam.id}/join`,
    { method: "POST", body: { studentId: "required-smoke@example.edu", sessionId } },
    200,
    "hardened join exam"
  );
  const missing = await sendTelemetry(hardenedBaseUrl, sessionId, join.sessionToken, 1, null);
  assertSmoke(
    missing.status === 428 && missing.json.error === "daemon_proof_required",
    "hardened mode did not reject missing daemon proof",
    missing
  );
  const audit = await expectJson(
    hardenedBaseUrl,
    `/api/audit/${sessionId}`,
    { method: "GET" },
    200,
    "hardened audit export"
  );
  assertSmoke(
    (audit.entries || []).some(
      (entry) =>
        entry.type === "DAEMON_MISSING" && entry.payload?.reason === "daemon_proof_required"
    ),
    "hardened mode did not audit DAEMON_MISSING",
    audit.entries
  );
}

async function main() {
  const { baseUrl, hardenedBaseUrl } = parseArgs(process.argv);
  await checkSdkLoad();
  await checkRawLocalFieldValidator();
  const health = await expectJson(baseUrl, "/health", { method: "GET" }, 200, "optional health");
  const hardenedHealth = await expectJson(
    hardenedBaseUrl,
    "/health",
    { method: "GET" },
    200,
    "hardened health"
  );
  assertSmoke(health.ok === true && hardenedHealth.ok === true, "health responses not ok", {
    health,
    hardenedHealth,
  });
  await runMainSmoke(baseUrl);
  await runHardenedSmoke(hardenedBaseUrl);
  process.stdout.write("Stage 2.4/2.5 E2E smoke passed\n");
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
