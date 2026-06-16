// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonPairingPayload,
  validateDaemonProof,
} from "../../src/device/daemonProof.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DAEMON_ROOT = join(ROOT, "tools", "simurgh-daemon-macos");
const FIXED_NOW = Date.parse("2026-05-16T00:00:02.000Z");

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function daemonKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  return {
    privateKey,
    public_key,
    node_id_hash: computeDaemonNodeIdHash(public_key),
  };
}

function signPayload(privateKey, payload) {
  return b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(payload), "utf8"), {
      key: privateKey,
      dsaEncoding: "der",
    })
  );
}

function signedProof(overrides = {}) {
  const key = daemonKeypair();
  const payload = {
    type: "simurgh.daemon.proof",
    session_id: "sess_security",
    exam_id: "exam_security",
    sequence: 4,
    timestamp: "2026-05-16T00:00:00.000Z",
    node_id_hash: key.node_id_hash,
    daemon_version: "0.4.7",
    platform: "macos",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: "2026-05-16T00:00:00.000Z",
    scan_duration_ms: 8,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 1,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  return {
    proof: { ...payload, signature: signPayload(key.privateKey, payload) },
    pairedNode: { node_id_hash: key.node_id_hash, public_key: key.public_key },
  };
}

function signedPairing(overrides = {}, envelopeOverrides = {}) {
  const key = daemonKeypair();
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_security",
    exam_id: "exam_security",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: "2026-05-16T00:00:00.000Z",
    node_id_hash: key.node_id_hash,
    daemon_version: "0.4.7",
    platform: "macos",
    ...overrides,
  };
  return {
    node_id_hash: key.node_id_hash,
    public_key: key.public_key,
    signed_payload,
    signature: signPayload(key.privateKey, signed_payload),
    ...envelopeOverrides,
  };
}

test("daemon proof rejects forbidden raw local fields recursively", () => {
  for (const [field, value] of [
    ["process_name", "SecretApp"],
    ["window_title", "Answers"],
    ["pid", 1234],
    ["username", "raouf"],
    ["home_directory", "/Users/raouf"],
    ["serial_number", "C02SECRET"],
    ["mac_address", "00:11:22:33:44:55"],
    ["screen_pixels", "raw"],
    ["screenshot", "raw"],
    ["webcam", "raw"],
    ["typed_content", "answer"],
    ["paste_content", "answer"],
  ]) {
    const { proof, pairedNode } = signedProof({ debug: { scanner: { [field]: value } } });
    const result = validateDaemonProof(proof, {
      now: FIXED_NOW,
      expectedSessionId: "sess_security",
      expectedExamId: "exam_security",
      pairedNode,
    });
    assert.equal(result.reason, "forbidden_local_field");
  }
});

test("daemon pairing rejects forbidden raw local fields recursively in envelope and signed payload", () => {
  const topLevel = validateDaemonPairingPayload(
    signedPairing({}, { debug: { window_title: "Answers" } }),
    { now: FIXED_NOW, expectedSessionId: "sess_security", expectedExamId: "exam_security" }
  );
  assert.equal(topLevel.reason, "forbidden_local_field");

  const signedPayload = validateDaemonPairingPayload(
    signedPairing({ debug: { process_name: "SecretApp" } }),
    { now: FIXED_NOW, expectedSessionId: "sess_security", expectedExamId: "exam_security" }
  );
  assert.equal(signedPayload.reason, "forbidden_local_field");
});

test("browser SDK keeps tokens out of URLs and only fetches daemon proof after a server challenge", async () => {
  const sdk = await readFile(join(ROOT, "public", "sdk", "simurgh-browser-sdk.js"), "utf8");
  const index = await readFile(join(ROOT, "public", "index.html"), "utf8");

  assert.match(index, /simurgh-browser-sdk\.js/);
  assert.doesNotMatch(sdk, /localStorage|sessionStorage/);
  assert.doesNotMatch(sdk, /token=.*location|location\.search.*token/i);
  assert.match(sdk, /authorization:\s*"Bearer "\s*\+/);
  assert.match(sdk, /serverChallenge\("proof"\)/);
  assert.match(sdk, /const daemonProof = await fetchProof\(sequence\)/);
});

test("localhost daemon source enforces loopback, body size, malformed JSON, method, and origin guards", async () => {
  const source = await readFile(
    join(DAEMON_ROOT, "Sources", "SimurghDaemon", "LocalHttpServer.swift"),
    "utf8"
  );

  assert.match(source, /IPv4Address\("127\.0\.0\.1"\)/);
  assert.doesNotMatch(source, /0\.0\.0\.0/);
  assert.match(source, /maxRequestBytes/);
  assert.match(source, /request_too_large/);
  assert.match(source, /malformed_json/);
  assert.match(source, /method_not_allowed/);
  assert.match(source, /origin_not_allowed/);
  assert.match(source, /local_client_header_required/);
});

test("LaunchAgent scripts expose safe dry-run checks and avoid dangerous shell patterns", async () => {
  const install = await readFile(join(DAEMON_ROOT, "scripts", "install-launch-agent.sh"), "utf8");
  const uninstall = await readFile(
    join(DAEMON_ROOT, "scripts", "uninstall-launch-agent.sh"),
    "utf8"
  );
  const combined = install + "\n" + uninstall;

  assert.match(install, /set -euo pipefail/);
  assert.match(uninstall, /set -euo pipefail/);
  assert.match(install, /--check|--dry-run/);
  assert.match(uninstall, /--check|--dry-run/);
  assert.match(combined, /Development-only local LaunchAgent/);
  assert.doesNotMatch(combined, /curl\s+.*sh|sudo\s+rm\s+-rf|chmod\s+777|LaunchDaemons/);
});

test("dashboard and reports keep manual-review wording and avoid overclaim phrases", async () => {
  const files = [
    join(ROOT, "public", "instructor.html"),
    join(ROOT, "src", "academic", "reportBuilder.js"),
    join(ROOT, "README.md"),
    join(ROOT, "SECURITY.md"),
    join(ROOT, "PRIVACY.md"),
  ];
  const text = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.match(text, /Manual review recommended\. No automatic misconduct finding\./);
  assert.doesNotMatch(text, /cheating detected|student guilty|confirmed misconduct/i);
  assert.doesNotMatch(text, /hardware attestation verified|production ready|MDM ready/i);
});
