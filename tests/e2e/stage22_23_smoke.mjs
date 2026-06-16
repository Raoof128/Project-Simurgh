#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import crypto from "node:crypto";

import { canonicalisePairingPayload } from "../../src/integrity/pairingCanonicalise.js";
import { canonicaliseProofPayload } from "../../src/integrity/proofCanonicalise.js";
import { computeNodeIdHash } from "../../src/integrity/proofSignature.js";

const FORBIDDEN_TERMS = [
  "process_name",
  "window_title",
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
    baseUrl: "http://127.0.0.1:33220",
    hardenedBaseUrl: "http://127.0.0.1:33221",
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

function ed25519Identity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const rawPublicKey = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url");
  return {
    privateKey,
    rawPublicKey,
    nodeIdHash: computeNodeIdHash(rawPublicKey),
    nodePublicKey: rawPublicKey.toString("base64"),
  };
}

function daemonIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  return {
    privateKey,
    public_key,
    node_id_hash: `sha256:${crypto.createHash("sha256").update(publicKeyDer).digest("hex")}`,
  };
}

function signEd25519(identity, payload, canonicalise) {
  return crypto
    .sign(null, Buffer.from(canonicalise(payload), "utf8"), identity.privateKey)
    .toString("base64");
}

function signDaemon(identity, payload) {
  return b64url(
    crypto.sign("sha256", Buffer.from(canonicalDaemonPayload(payload), "utf8"), {
      key: identity.privateKey,
      dsaEncoding: "der",
    })
  );
}

function makeIntegrityProof(identity, sessionId, overrides = {}) {
  const proof = {
    version: "simurgh-integrity-proof-v1",
    platform: "macos",
    session_id: sessionId,
    node_id_hash: identity.nodeIdHash,
    node_public_key: identity.nodePublicKey,
    nonce: crypto.randomBytes(16).toString("base64"),
    timestamp: new Date().toISOString(),
    capabilities: {
      screencapturekit_available: false,
      window_enumeration: false,
      sharing_state_scan: false,
      helper_bridge: false,
    },
    signals: {
      node_uptime_ms: 0,
      window_count: 0,
      capture_excluded_window_count: 0,
      helper_status: "not_configured",
    },
    privacy_mode: "metadata_only",
    ...overrides,
  };
  proof.signature = signEd25519(identity, proof, canonicaliseProofPayload);
  return proof;
}

function makePairingProof(identity, sessionId, challenge, overrides = {}) {
  const pairing = {
    version: "simurgh-pairing-proof-v1",
    platform: "macos",
    session_id: sessionId,
    node_id_hash: identity.nodeIdHash,
    node_public_key: identity.nodePublicKey,
    challenge,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
  pairing.signature = signEd25519(identity, pairing, canonicalisePairingPayload);
  return pairing;
}

function makeDaemonPair(identity, sessionId, examId, challenge) {
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
    signature: signDaemon(identity, signed_payload),
  };
}

function makeDaemonProof(identity, sessionId, examId, sequence, challenge, overrides = {}) {
  const proof = {
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
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 1,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge,
    ...overrides,
  };
  return { ...proof, signature: signDaemon(identity, proof) };
}

function telemetry() {
  return {
    keystrokes: 2,
    chars_typed: 8,
    effective_wpm: 35,
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

async function requestJson(baseUrl, path, { method = "GET", token, body } = {}) {
  const res = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, json };
}

async function expectJson(baseUrl, path, options, status, label) {
  const result = await requestJson(baseUrl, path, options);
  assertSmoke(
    result.status === status,
    `${label} returned ${result.status}, expected ${status}`,
    result.json
  );
  return result.json;
}

async function createExamSession(baseUrl, prefix) {
  const exam = await expectJson(
    baseUrl,
    "/api/exams",
    { method: "POST", body: { title: `${prefix} smoke`, durationMinutes: 60 } },
    201,
    `${prefix} create exam`
  );
  const sessionId = `${prefix}_${crypto.randomBytes(4).toString("hex")}`;
  const join = await expectJson(
    baseUrl,
    `/api/exams/${exam.id}/join`,
    { method: "POST", body: { studentId: `${prefix}@example.edu`, sessionId } },
    200,
    `${prefix} join`
  );
  return { exam, sessionId, token: join.sessionToken };
}

async function pairingChallenge(baseUrl, token) {
  const body = await expectJson(
    baseUrl,
    "/api/integrity/pairing/challenge",
    { method: "POST", token, body: {} },
    200,
    "integrity pairing challenge"
  );
  return body.challenge;
}

async function pairIntegrityNode(baseUrl, sessionId, token, identity) {
  const challenge = await pairingChallenge(baseUrl, token);
  const pair = await expectJson(
    baseUrl,
    "/api/integrity/pairing/complete",
    { method: "POST", token, body: makePairingProof(identity, sessionId, challenge) },
    200,
    "integrity pairing complete"
  );
  assertSmoke(pair.signature_status === "verified", "integrity pairing did not verify", pair);
}

async function postIntegrityProof(baseUrl, token, proof) {
  return requestJson(baseUrl, "/api/integrity/proofs", {
    method: "POST",
    token,
    body: proof,
  });
}

async function daemonChallenge(baseUrl, sessionId, token, purpose) {
  const body = await expectJson(
    baseUrl,
    "/api/device/challenge",
    { method: "POST", token, body: { sessionId, purpose } },
    200,
    `daemon ${purpose} challenge`
  );
  return body.challenge;
}

async function pairDaemon(baseUrl, sessionId, examId, token, identity) {
  const challenge = await daemonChallenge(baseUrl, sessionId, token, "pair");
  const pair = await expectJson(
    baseUrl,
    "/api/device/pair",
    {
      method: "POST",
      token,
      body: {
        sessionId,
        ...makeDaemonPair(identity, sessionId, examId, challenge),
      },
    },
    200,
    "daemon pair"
  );
  assertSmoke(pair.node_id_hash === identity.node_id_hash, "daemon pair node mismatch", pair);
}

async function sendTelemetry(baseUrl, sessionId, token, sequence, daemon_proof = undefined) {
  return requestJson(baseUrl, "/api/telemetry", {
    method: "POST",
    token,
    body: {
      sessionId,
      sequence,
      timestamp: Date.now(),
      telemetry: telemetry(),
      ...(daemon_proof ? { daemon_proof } : {}),
    },
  });
}

function assertNoForbidden(label, value) {
  const text = JSON.stringify(value);
  const found = FORBIDDEN_TERMS.filter((term) => text.includes(term));
  assertSmoke(found.length === 0, `${label} leaked forbidden local-data fields`, found);
}

async function runStage22(baseUrl) {
  const { sessionId, token } = await createExamSession(baseUrl, "stage22");
  const nodeA = ed25519Identity();
  await pairIntegrityNode(baseUrl, sessionId, token, nodeA);

  const verified = await postIntegrityProof(baseUrl, token, makeIntegrityProof(nodeA, sessionId));
  assertSmoke(
    verified.status === 202 && verified.json.signature_status === "verified",
    "paired integrity proof was not verified",
    verified
  );

  const nodeB = ed25519Identity();
  const wrongNode = await postIntegrityProof(baseUrl, token, makeIntegrityProof(nodeB, sessionId));
  assertSmoke(
    wrongNode.status === 409 && wrongNode.json.error === "paired_node_mismatch",
    "different paired node was not rejected",
    wrongNode
  );

  const replayProof = makeIntegrityProof(nodeA, sessionId);
  const replayFirst = await postIntegrityProof(baseUrl, token, replayProof);
  assertSmoke(replayFirst.status === 202, "first nonce use failed", replayFirst);
  const replaySecond = await postIntegrityProof(baseUrl, token, replayProof);
  assertSmoke(
    replaySecond.status === 409 && replaySecond.json.error === "nonce_replayed",
    "replayed integrity proof was not rejected",
    replaySecond
  );

  const stale = await postIntegrityProof(
    baseUrl,
    token,
    makeIntegrityProof(nodeA, sessionId, {
      nonce: crypto.randomBytes(16).toString("base64"),
      timestamp: new Date(Date.now() - 60_000).toISOString(),
    })
  );
  assertSmoke(
    stale.status === 400 && stale.json.error === "proof_stale",
    "stale proof was not rejected",
    stale
  );

  const invalid = makeIntegrityProof(nodeA, sessionId, {
    nonce: crypto.randomBytes(16).toString("base64"),
  });
  invalid.signature = Buffer.alloc(64).toString("base64");
  const invalidResult = await postIntegrityProof(baseUrl, token, invalid);
  assertSmoke(
    invalidResult.status === 401 && invalidResult.json.error === "registered_signature_invalid",
    "invalid registered signature was not rejected",
    invalidResult
  );

  const audit = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}`,
    { method: "GET" },
    200,
    "stage22 audit"
  );
  const auditTypes = new Set((audit.entries || []).map((entry) => entry.type));
  assertSmoke(
    auditTypes.has("INTEGRITY_NODE_PAIRED"),
    "audit missing INTEGRITY_NODE_PAIRED",
    audit.entries
  );
  assertSmoke(
    auditTypes.has("INTEGRITY_PROOF_RECEIVED"),
    "audit missing INTEGRITY_PROOF_RECEIVED",
    audit.entries
  );
  assertSmoke(
    auditTypes.has("INTEGRITY_PROOF_REJECTED"),
    "audit missing INTEGRITY_PROOF_REJECTED",
    audit.entries
  );
  assertNoForbidden("stage22 audit", audit);
  const verify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { method: "GET" },
    200,
    "stage22 audit verify"
  );
  assertSmoke(verify.valid === true, "stage22 audit chain did not verify", verify);
}

async function runStage23(baseUrl) {
  const { exam, sessionId, token } = await createExamSession(baseUrl, "stage23");
  const identity = daemonIdentity();
  await pairDaemon(baseUrl, sessionId, exam.id, token, identity);

  const proof = makeDaemonProof(
    identity,
    sessionId,
    exam.id,
    1,
    await daemonChallenge(baseUrl, sessionId, token, "proof")
  );
  const accepted = await sendTelemetry(baseUrl, sessionId, token, 1, proof);
  assertSmoke(
    accepted.status === 200 && accepted.json.device_integrity?.daemon_state === "healthy",
    "daemon proof telemetry was not accepted",
    accepted
  );

  await waitForTelemetryWindow();
  const replay = await sendTelemetry(baseUrl, sessionId, token, 2, proof);
  assertSmoke(
    replay.status === 409 && replay.json.error === "challenge_not_found",
    "replayed daemon proof was not rejected",
    replay
  );

  await waitForTelemetryWindow();
  const tamperBase = makeDaemonProof(
    identity,
    sessionId,
    exam.id,
    3,
    await daemonChallenge(baseUrl, sessionId, token, "proof")
  );
  const tampered = await sendTelemetry(baseUrl, sessionId, token, 3, {
    ...tamperBase,
    helper_state: "missing",
  });
  assertSmoke(
    tampered.status === 401 && tampered.json.error === "invalid_signature",
    "tampered daemon proof was not rejected",
    tampered
  );

  const report = await expectJson(
    baseUrl,
    `/api/sessions/${sessionId}/report`,
    { method: "GET" },
    200,
    "stage23 report"
  );
  assertSmoke(
    report.device_integrity?.proofs_verified === 1,
    "report missing daemon proof count",
    report
  );
  assertSmoke(
    report.device_integrity?.proofs_rejected >= 2,
    "report missing daemon rejection count",
    report
  );
  assertNoForbidden("stage23 report", report);

  const dashboard = await expectJson(
    baseUrl,
    `/api/dashboard/${sessionId}`,
    { method: "GET" },
    200,
    "stage23 dashboard"
  );
  assertSmoke(
    dashboard.daemon?.node_id_hash === identity.node_id_hash,
    "dashboard missing daemon node",
    dashboard
  );
  assertNoForbidden("stage23 dashboard", dashboard);

  const audit = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}`,
    { method: "GET" },
    200,
    "stage23 audit"
  );
  const auditTypes = new Set((audit.entries || []).map((entry) => entry.type));
  assertSmoke(auditTypes.has("DAEMON_PAIRED"), "audit missing DAEMON_PAIRED", audit.entries);
  assertSmoke(
    auditTypes.has("DAEMON_PROOF_VERIFIED"),
    "audit missing DAEMON_PROOF_VERIFIED",
    audit.entries
  );
  assertSmoke(
    auditTypes.has("DAEMON_PROOF_REJECTED"),
    "audit missing DAEMON_PROOF_REJECTED",
    audit.entries
  );
  assertNoForbidden("stage23 audit", audit);

  const verify = await expectJson(
    baseUrl,
    `/api/audit/${sessionId}/verify`,
    { method: "GET" },
    200,
    "stage23 audit verify"
  );
  assertSmoke(verify.valid === true, "stage23 audit chain did not verify", verify);
}

async function runHardened(hardenedBaseUrl) {
  const { sessionId, token } = await createExamSession(hardenedBaseUrl, "stage23_required");
  const missing = await sendTelemetry(hardenedBaseUrl, sessionId, token, 1);
  assertSmoke(
    missing.status === 428 && missing.json.error === "daemon_proof_required",
    "hardened daemon-required mode did not reject missing proof",
    missing
  );
  const audit = await expectJson(
    hardenedBaseUrl,
    `/api/audit/${sessionId}`,
    { method: "GET" },
    200,
    "hardened audit"
  );
  assertSmoke(
    (audit.entries || []).some(
      (entry) =>
        entry.type === "DAEMON_MISSING" && entry.payload?.reason === "daemon_proof_required"
    ),
    "hardened audit missing DAEMON_MISSING",
    audit.entries
  );
}

async function main() {
  const { baseUrl, hardenedBaseUrl } = parseArgs(process.argv);
  const health = await expectJson(baseUrl, "/health", { method: "GET" }, 200, "base health");
  const hardenedHealth = await expectJson(
    hardenedBaseUrl,
    "/health",
    { method: "GET" },
    200,
    "hardened health"
  );
  assertSmoke(health.ok === true && hardenedHealth.ok === true, "server health was not ok", {
    health,
    hardenedHealth,
  });
  await runStage22(baseUrl);
  await runStage23(baseUrl);
  await runHardened(hardenedBaseUrl);
  process.stdout.write("Stage 2.2/2.3 E2E smoke passed\n");
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exit(1);
});
