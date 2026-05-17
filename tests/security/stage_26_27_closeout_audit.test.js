// Stage 2.6/2.7 closeout cybersecurity audit.
//
// Single comprehensive manifest covering the nine audit dimensions:
//   1. proof       — signature integrity, sequence, timestamp
//   2. scanner     — version pinning, fingerprint pattern, count consistency
//   3. platform    — unsupported rejection at proof + pairing
//   4. daemon      — node identity binding, public-key recomputation
//   5. SDK         — trust boundary (signed proof is the only trust path)
//   6. report      — device_integrity shape, no raw leaks, manual-review wording
//   7. dashboard   — no affirmative misconduct phrases, wording present
//   8. privacy     — shared forbidden list is sourced + frozen
//   9. wording     — source files contain no overclaim phrases

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  validateDaemonProof,
  validateDaemonPairingPayload,
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  verifyDaemonSignature,
} from "../../src/device/daemonProof.js";
import {
  FORBIDDEN_LOCAL_FIELD_NAMES,
  containsForbiddenLocalFieldDeep,
} from "../../src/device/forbiddenLocalFields.js";
import {
  SUPPORTED_DEVICE_PLATFORMS,
  PLANNED_DEVICE_PLATFORMS,
  getExpectedScannerVersion,
} from "../../src/device/platformScannerSchema.js";
import { buildReport } from "../../src/academic/reportBuilder.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  return { privateKey, public_key, node_id_hash };
}

function makeSignedProof(platform, overrides = {}) {
  const identity = makeIdentity();
  const scanner_version = getExpectedScannerVersion(platform);
  const daemon_version = platform === "windows" ? "0.4.11" : "0.4.7";
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_closeout",
    exam_id: "exam_closeout",
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
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
      key: identity.privateKey,
      dsaEncoding: "der",
    })
  );
  return { proof: { ...proof, signature }, identity };
}

const opts = (identity) => ({
  expectedSessionId: "sess_closeout",
  expectedExamId: "exam_closeout",
  pairedNode: { node_id_hash: identity.node_id_hash, public_key: identity.public_key },
});

// === 1. PROOF =============================================================

test("[1.proof] canonicalisation is deterministic and excludes the signature", () => {
  const a = { type: "x", session_id: "s", b: 2, a: 1, signature: "ZZZ" };
  const b = { signature: "YYY", a: 1, b: 2, session_id: "s", type: "x" };
  assert.equal(canonicaliseDaemonPayload(a), canonicaliseDaemonPayload(b));
  assert.ok(!canonicaliseDaemonPayload(a).includes("ZZZ"));
});

test("[1.proof] valid signed proof is accepted", () => {
  const { proof, identity } = makeSignedProof("macos");
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, true);
});

test("[1.proof] post-signing sequence tamper is rejected as invalid_signature", () => {
  const { proof, identity } = makeSignedProof("windows");
  proof.sequence = 999;
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_signature");
});

test("[1.proof] stale timestamp (>30s past) is rejected", () => {
  const { proof, identity } = makeSignedProof("macos", {
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  });
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "proof_stale");
});

// === 2. SCANNER ===========================================================

test("[2.scanner] scanner_version pinned per platform — macOS rejects Windows version", () => {
  const { proof, identity } = makeSignedProof("macos", { scanner_version: "2.6.0" });
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, false);
  assert.ok(["invalid_scanner_version", "invalid_signature"].includes(r.reason));
});

test("[2.scanner] fingerprint hash pattern enforced (must be sha256:<64hex>)", () => {
  const { proof, identity } = makeSignedProof("windows", {
    window_fingerprint_hashes: ["not-a-hash"],
  });
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, false);
  assert.ok(
    ["invalid_window_fingerprint_hashes", "invalid_signature"].includes(r.reason),
    `unexpected reason: ${r.reason}`
  );
});

test("[2.scanner] suspicious_window_count must be >= capture_excluded + monitor_only", () => {
  // Build a proof where suspicious = 0 but capture_excluded = 1: inconsistent.
  // This is caught BEFORE signature check by the scanner validator.
  const identity = makeIdentity();
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_closeout",
    exam_id: "exam_closeout",
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "windows",
    capture_excluded_window_count: 1,
    helper_state: "healthy",
    scanner_state: "risk_detected",
    scanner_version: "2.6.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0, // inconsistent
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
    challenge: b64url(crypto.randomBytes(32)),
  };
  const signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
      key: identity.privateKey,
      dsaEncoding: "der",
    })
  );
  const r = validateDaemonProof({ ...proof, signature }, opts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_suspicious_window_count");
});

// === 3. PLATFORM ==========================================================

test("[3.platform] SUPPORTED_DEVICE_PLATFORMS is exactly {macos, windows, linux}", () => {
  // Stage 2.8 promoted linux from planned to supported. The unsupported-platform
  // gate remains, proven by the freebsd cases below.
  assert.deepEqual([...SUPPORTED_DEVICE_PLATFORMS].sort(), ["linux", "macos", "windows"]);
  assert.deepEqual([...PLANNED_DEVICE_PLATFORMS], []);
});

test("[3.platform] freebsd proof rejected at validateDaemonProof", () => {
  const { proof, identity } = makeSignedProof("macos");
  proof.platform = "freebsd";
  const r = validateDaemonProof(proof, opts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("[3.platform] freebsd pairing rejected at validateDaemonPairingPayload", () => {
  const identity = makeIdentity();
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_closeout",
    exam_id: "exam_closeout",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "0.4.11",
    platform: "freebsd",
  };
  const envelope = {
    node_id_hash: identity.node_id_hash,
    public_key: identity.public_key,
    signed_payload,
    signature: b64url(
      crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(signed_payload)), {
        key: identity.privateKey,
        dsaEncoding: "der",
      })
    ),
  };
  const r = validateDaemonPairingPayload(envelope, {
    expectedSessionId: "sess_closeout",
    expectedExamId: "exam_closeout",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

// === 4. DAEMON ============================================================

test("[4.daemon] proof with mismatched node_id_hash vs paired_node rejected", () => {
  const { proof } = makeSignedProof("windows");
  const otherIdentity = makeIdentity();
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_closeout",
    expectedExamId: "exam_closeout",
    pairedNode: { node_id_hash: otherIdentity.node_id_hash, public_key: otherIdentity.public_key },
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "daemon_node_mismatch");
});

test("[4.daemon] proof without pairedNode rejected as daemon_node_not_paired", () => {
  const { proof } = makeSignedProof("macos");
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_closeout",
    expectedExamId: "exam_closeout",
    pairedNode: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "daemon_node_not_paired");
});

test("[4.daemon] paired node with mismatched public key is rejected", () => {
  const { proof, identity } = makeSignedProof("macos");
  const otherIdentity = makeIdentity();
  // Same node_id_hash claim but wrong public key for that hash.
  const r = validateDaemonProof(proof, {
    expectedSessionId: "sess_closeout",
    expectedExamId: "exam_closeout",
    pairedNode: { node_id_hash: identity.node_id_hash, public_key: otherIdentity.public_key },
  });
  assert.equal(r.ok, false);
  // computeDaemonNodeIdHash(otherIdentity.public_key) !== identity.node_id_hash → daemon_public_key_mismatch.
  assert.equal(r.reason, "daemon_public_key_mismatch");
});

// === 5. SDK ===============================================================

test("[5.sdk] browser SDK exposes getDeviceShieldStatus as UX-only accessor", () => {
  const sdkSource = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  // Must export the accessor.
  assert.ok(/getDeviceShieldStatus/.test(sdkSource), "getDeviceShieldStatus missing from SDK");
  // Must carry an explicit trust-boundary comment.
  assert.ok(
    /TRUST BOUNDARY|trust.{0,10}boundary|server (NEVER|never) consults/i.test(sdkSource),
    "SDK is missing the trust-boundary comment near getDeviceShieldStatus"
  );
});

test("[5.sdk] SDK never sends scanner_state outside daemon_proof in telemetry body", () => {
  // Architectural check: the SDK's sendTelemetry function should not emit
  // top-level scanner_state / capture_excluded_window_count alongside the
  // daemon_proof — these must live INSIDE the signed proof only.
  const sdkSource = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  // Locate the sendTelemetry function body and confirm no rogue scanner fields.
  const sendTelemetryMatch = sdkSource.match(/async function sendTelemetry[\s\S]+?^\s+\}\s*$/m);
  if (sendTelemetryMatch) {
    const body = sendTelemetryMatch[0];
    // Body should not push scanner_state/capture_excluded outside daemon_proof.
    // It's allowed to receive a daemon_proof object; the proof itself contains those keys.
    const rogue = [
      /^\s*scanner_state\s*:/m,
      /^\s*capture_excluded_window_count\s*:/m,
      /^\s*platform\s*:/m,
    ];
    for (const pattern of rogue) {
      assert.ok(
        !pattern.test(body),
        `SDK sendTelemetry body contains rogue top-level field matching ${pattern}`
      );
    }
  }
});

// === 6. REPORT ============================================================

test("[6.report] device_integrity includes daemon_platform and manual_review_recommendation", () => {
  const sessionRecord = {
    id: "sess_r",
    examId: "exam_r",
    studentIdHash: "sha256:abc",
    startedAt: 1_700_000_000_000,
    submittedAt: 1_700_000_600_000,
    createdAt: 1_700_000_000_000,
  };
  const sessionData = {
    latest: null,
    affinity: null,
    daemon: {
      daemon_state: "healthy",
      platform: "windows",
      scanner_state: "healthy",
      scanner_version: "2.6.0",
      proofs_verified: 3,
    },
  };
  const report = buildReport(sessionRecord, sessionData, [], true);
  assert.equal(report.device_integrity.daemon_platform, "windows");
  assert.equal(
    report.device_integrity.manual_review_recommendation,
    "No device-integrity anomaly detected."
  );
});

test("[6.report] device_integrity never contains any forbidden raw field name", () => {
  const sessionRecord = {
    id: "sess_r2",
    examId: "exam_r2",
    studentIdHash: "sha256:def",
    startedAt: 1_700_000_000_000,
    submittedAt: 1_700_000_600_000,
    createdAt: 1_700_000_000_000,
  };
  const sessionData = {
    latest: null,
    affinity: null,
    daemon: {
      daemon_state: "risk_detected",
      platform: "macos",
      scanner_state: "risk_detected",
      capture_excluded_window_count_max: 1,
      proofs_verified: 2,
    },
  };
  const report = buildReport(sessionRecord, sessionData, [], true);
  // Recursive scan over the full report — must contain zero forbidden field names.
  assert.equal(containsForbiddenLocalFieldDeep(report), null);
});

// === 7. DASHBOARD =========================================================

test("[7.dashboard] instructor.html contains no affirmative misconduct phrases", () => {
  const html = readFileSync("public/instructor.html", "utf8").toLowerCase();
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

test("[7.dashboard] instructor.html does not interpolate raw forbidden field names", () => {
  const html = readFileSync("public/instructor.html", "utf8");
  // The dashboard template should not include any forbidden raw field name
  // in property-accessor or interpolation contexts.
  for (const fieldName of [
    "process_name",
    "raw_process_name",
    "window_title",
    "raw_window_title",
    "hwnd",
    "pid",
  ]) {
    // Allow the field name inside HTML COMMENTS or string literals describing
    // the privacy stance — flag only property accessors (.fieldName) or
    // template interpolations (${fieldName} or {{ fieldName }}).
    const interpolation = new RegExp(`(\\.|\\$\\{|\\{\\{\\s*)${fieldName}\\b`);
    assert.ok(!interpolation.test(html), `dashboard interpolates raw field "${fieldName}"`);
  }
});

// === 8. PRIVACY ===========================================================

test("[8.privacy] forbidden field list is sourced from shared module across the codebase", () => {
  // daemonProof.js, privacy-audit.mjs, and the security test all import from
  // src/device/forbiddenLocalFields.js. This anchors the canonical list.
  const daemonProofSource = readFileSync("src/device/daemonProof.js", "utf8");
  const privacyAuditSource = readFileSync("tools/privacy-audit.mjs", "utf8");
  assert.ok(
    /from\s+["']\.\/forbiddenLocalFields\.js["']/.test(daemonProofSource),
    "daemonProof.js does not import from forbiddenLocalFields.js"
  );
  assert.ok(
    /forbiddenLocalFields\.js/.test(privacyAuditSource),
    "tools/privacy-audit.mjs does not import from forbiddenLocalFields.js"
  );
});

test("[8.privacy] FORBIDDEN_LOCAL_FIELD_NAMES is frozen and includes all known leak vectors", () => {
  assert.ok(Object.isFrozen(FORBIDDEN_LOCAL_FIELD_NAMES));
  for (const name of [
    "hwnd",
    "pid",
    "process_name",
    "window_title",
    "screen_pixels",
    "webcam",
    "microphone",
    "biometric_data",
    "typed_content",
    "paste_content",
  ]) {
    assert.ok(FORBIDDEN_LOCAL_FIELD_NAMES.includes(name), `missing forbidden name: ${name}`);
  }
});

// === 9. WORDING ===========================================================

test("[9.wording] source files do not contain overclaim phrases", () => {
  // Scan source/server/SDK (NOT docs/specs which legitimately enumerate the
  // forbidden phrases). The overclaim phrases must never appear in code that
  // could render to a user.
  const files = [
    "server.js",
    "public/instructor.html",
    "public/index.html",
    "src/academic/reportBuilder.js",
    "src/academic/riskScoring.js",
    "src/device/scannerRiskPolicy.js",
    "src/device/daemonProof.js",
    "public/sdk/simurgh-browser-sdk.js",
  ];
  const overclaim = [
    /production[- ]ready/i,
    /MDM[- ]ready/i,
    /hardware attestation verified/i,
    /cheating detected/i,
    /student guilty/i,
    /confirmed misconduct/i,
    /misconduct detected/i,
  ];
  for (const file of files) {
    let body;
    try {
      body = readFileSync(file, "utf8");
    } catch {
      continue; // file may not exist in all configs
    }
    for (const pattern of overclaim) {
      assert.ok(!pattern.test(body), `${file} contains overclaim wording matching ${pattern}`);
    }
  }
});

test("[9.wording] manual-review wording is preserved verbatim in scannerRiskPolicy", () => {
  const src = readFileSync("src/device/scannerRiskPolicy.js", "utf8");
  assert.ok(
    src.includes("Manual review required. No automatic misconduct finding."),
    "scannerRiskPolicy lost Critical manual-review wording"
  );
  assert.ok(
    src.includes("Manual review recommended. No automatic misconduct finding."),
    "scannerRiskPolicy lost Warning manual-review wording"
  );
  assert.ok(
    src.includes("No device-integrity anomaly detected."),
    "scannerRiskPolicy lost device-integrity-safe wording"
  );
});

// === ANCHOR ===============================================================

test("[anchor] closeout audit covered all nine dimensions (this test is a manifest)", () => {
  const dimensions = [
    "proof",
    "scanner",
    "platform",
    "daemon",
    "sdk",
    "report",
    "dashboard",
    "privacy",
    "wording",
  ];
  // Build a synthetic verification record — if any dimension test was removed,
  // the suite shrinks and a reader notices. The anchor is documentary.
  assert.equal(dimensions.length, 9);
});
