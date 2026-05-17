import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateDaemonProof,
  validateDaemonPairingPayload,
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
} from "../../src/device/daemonProof.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeProof(platform, overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const scanner_version = platform === "windows" ? "2.6.0" : "2.5.0";
  const daemon_version = platform === "windows" ? "0.4.11" : "0.4.7";
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_audit",
    exam_id: "exam_audit",
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash,
    daemon_version,
    platform,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "healthy",
    scanner_version,
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge: b64url(crypto.randomBytes(32)),
    ...overrides,
  };
  const signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
      key: privateKey,
      dsaEncoding: "der",
    })
  );
  return { proof: { ...proof, signature }, public_key, node_id_hash };
}

const validateOpts = (public_key, node_id_hash) => ({
  expectedSessionId: "sess_audit",
  expectedExamId: "exam_audit",
  pairedNode: { node_id_hash, public_key },
});

test("audit: tampered platform macos→windows after signing is rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.platform = "windows";
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  // Could be invalid_signature (caught at signature check) or
  // invalid_scanner_version (caught earlier because scanner_version 2.5.0
  // doesn't match the new windows platform's expected 2.6.0). Either is a
  // valid rejection — the signature MUST NOT be accepted.
  assert.ok(
    ["invalid_signature", "invalid_scanner_version"].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
});

test("audit: tampered scanner_version after signing is rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.scanner_version = "9.9.9";
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  assert.ok(
    ["invalid_scanner_version", "invalid_signature"].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
});

test("audit: tampered monitor_only_window_count after signing rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.monitor_only_window_count = 5;
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  // Either invalid_signature (caught at sig check) or invalid_suspicious_window_count
  // (caught earlier because suspicious_count must be >= capture_excluded + monitor_only).
  // Both are valid rejections; the tampered field MUST NOT be accepted.
  assert.ok(
    ["invalid_signature", "invalid_suspicious_window_count"].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
});

test("audit: tampered capture_excluded_window_count after signing rejected as invalid_signature", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.capture_excluded_window_count = 1;
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  // suspicious_window_count would also be inconsistent, so the validator may
  // catch this at invalid_suspicious_window_count before the signature check.
  assert.ok(
    ["invalid_signature", "invalid_suspicious_window_count"].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
});

test("audit: unsupported platform linux rejected before signature check", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.platform = "linux";
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("audit: raw hwnd nested in scanner_debug rejected as forbidden_local_field", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.scanner_debug = { hwnd: "0x123" };
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: raw process_name nested in debug sub-object rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("macos");
  proof.debug = { extra: { process_name: "hidden" } };
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: raw pid in array element rejected", () => {
  const { proof, public_key, node_id_hash } = makeProof("windows");
  proof.audit_log = [{ event: "scan" }, { pid: 4321 }];
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: dashboard HTML contains no affirmative misconduct phrases", () => {
  const html = readFileSync("public/instructor.html", "utf8").toLowerCase();
  // Only check affirmative misconduct claims, not the disclaimer "No automatic
  // misconduct finding" which legitimately contains "automatic misconduct".
  for (const phrase of [
    "cheating detected",
    "student guilty",
    "confirmed misconduct",
    "misconduct detected",
    "misconduct confirmed",
    "automatic misconduct detected",
    "automatic misconduct confirmed",
  ]) {
    assert.ok(!html.includes(phrase), `dashboard contains forbidden phrase: ${phrase}`);
  }
});

test("audit: forbiddenLocalFields list is the single source of truth for raw-field rejection", async () => {
  // Sanity: the daemonProof validator must reject every name on the canonical list.
  const { FORBIDDEN_LOCAL_FIELD_NAMES } = await import("../../src/device/forbiddenLocalFields.js");
  for (const fieldName of FORBIDDEN_LOCAL_FIELD_NAMES) {
    const { proof, public_key, node_id_hash } = makeProof("macos");
    proof.tainted = { [fieldName]: "raw-value" };
    const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
    assert.equal(r.ok, false, `field ${fieldName} was not rejected`);
    assert.equal(r.reason, "forbidden_local_field", `field ${fieldName} wrong reason`);
  }
});

// --- Hardening (Stage 2.6/2.7 closeout) ------------------------------------

function makePairingEnvelope(platform, overrides = {}) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  const daemon_version = platform === "windows" ? "0.4.11" : "0.4.7";
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_audit",
    exam_id: "exam_audit",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: new Date().toISOString(),
    node_id_hash,
    daemon_version,
    platform,
  };
  const envelope = {
    node_id_hash,
    public_key,
    signed_payload,
    signature: b64url(
      crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(signed_payload)), {
        key: privateKey,
        dsaEncoding: "der",
      })
    ),
    ...overrides,
  };
  return envelope;
}

test("audit: pairing payload with raw hwnd anywhere in envelope rejected as forbidden_local_field", () => {
  const env = makePairingEnvelope("windows");
  env.scanner_debug = { hwnd: "0xdead" };
  const r = validateDaemonPairingPayload(env, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: pairing payload with forbidden field nested in signed_payload rejected", () => {
  const env = makePairingEnvelope("macos");
  env.signed_payload.process_name = "leaked";
  const r = validateDaemonPairingPayload(env, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "forbidden_local_field");
});

test("audit: pairing payload with platform=linux rejected as unsupported_platform", () => {
  const env = makePairingEnvelope("linux");
  const r = validateDaemonPairingPayload(env, {
    expectedSessionId: "sess_audit",
    expectedExamId: "exam_audit",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("audit: validateDaemonProof output only exposes signed scanner fields (no echoed body fields)", () => {
  // SDK trust-boundary invariant: the server's accepted proof object must
  // not include fields that the client could inject outside the signed payload.
  const { proof, public_key, node_id_hash } = makeProof("windows");
  // The signed proof already contains the legitimate scanner_state. Attempt to
  // also inject a NON-forbidden but rogue field — validateDaemonProof should
  // either reject (preferred) or NOT include it in the returned `proof` object.
  proof.client_supplied_scanner_state = "healthy";
  const r = validateDaemonProof(proof, validateOpts(public_key, node_id_hash));
  if (r.ok) {
    assert.equal(
      r.proof.client_supplied_scanner_state,
      undefined,
      "validator echoed an unsigned client field into the trusted proof object"
    );
  } else {
    // Either rejected at signature check (because the rogue key was in the
    // canonical payload at sign time) or earlier — both are valid responses.
    assert.ok(["invalid_signature"].includes(r.reason) || r.reason.startsWith("invalid_"));
  }
});

test("audit: FORBIDDEN_LOCAL_FIELD_NAMES cannot be mutated at runtime (frozen)", async () => {
  const { FORBIDDEN_LOCAL_FIELD_NAMES } = await import("../../src/device/forbiddenLocalFields.js");
  assert.ok(Object.isFrozen(FORBIDDEN_LOCAL_FIELD_NAMES));
  // In strict mode, attempting to mutate a frozen array throws. Modules are
  // strict mode by default in Node.js ESM.
  assert.throws(() => {
    FORBIDDEN_LOCAL_FIELD_NAMES.push("brand_new_leak");
  });
  assert.throws(() => {
    FORBIDDEN_LOCAL_FIELD_NAMES[0] = "overwritten";
  });
});
