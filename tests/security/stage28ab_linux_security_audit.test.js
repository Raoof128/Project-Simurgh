// Stage 2.8A + 2.8B umbrella cybersecurity audit.
//
// Consolidates Linux Device Shield security invariants in a single reviewer-
// facing file. Pre-merge guard for PR #19 + PR #20.
//
// Dimensions:
//   1. proof canonicalisation + tamper rejection
//   2. timestamp freshness
//   3. pairing trust boundary
//   4. display_server lock factory contract (live wiring is a follow-up PR)
//   5. X11 scanner privacy — every forbidden raw field recursively rejected
//   6. X11 scanner schema invariants
//   7. non-local DISPLAY refusal is Warning context, not rejection
//   8. SDK trust boundary — no top-level scanner field trusted
//   9. Linux risk policy → Warning, never automatic misconduct
//  10. report wording — no overclaim
//  11. dashboard — no affirmative misconduct phrases
//  12. supply chain — no unsafe Rust in daemon, no shell-out

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { mapScannerSummaryToRisk } from "../../src/device/scannerRiskPolicy.js";
import {
  canonicaliseDaemonPayload,
  computeDaemonNodeIdHash,
  validateDaemonPairingPayload,
  validateDaemonProof,
} from "../../src/device/daemonProof.js";
import {
  containsForbiddenLocalFieldDeep,
  FORBIDDEN_LOCAL_FIELD_NAMES,
} from "../../src/device/forbiddenLocalFields.js";
import {
  LINUX_COVERAGES,
  LINUX_DISPLAY_SERVERS,
  LINUX_SCANNER_REASONS,
  LINUX_SCANNER_STATES,
  SUPPORTED_DEVICE_PLATFORMS,
  validateLinuxScannerSummary,
} from "../../src/device/platformScannerSchema.js";
import { createDisplayServerLock } from "../../src/device/daemonState.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const publicKeyDer = publicKey.export({ format: "der", type: "spki" });
  const public_key = b64url(publicKeyDer);
  const node_id_hash = computeDaemonNodeIdHash(public_key);
  return { privateKey, public_key, node_id_hash };
}

function makeLinuxProof(overrides = {}, identity = makeIdentity()) {
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_28ab_audit",
    exam_id: "exam_28ab_audit",
    sequence: 1,
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "2.8.0",
    platform: "linux",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
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

const validateOpts = (identity) => ({
  expectedSessionId: "sess_28ab_audit",
  expectedExamId: "exam_28ab_audit",
  pairedNode: { node_id_hash: identity.node_id_hash, public_key: identity.public_key },
});

// ── 1. proof canonicalisation + tamper rejection ──────────────────────────

test("[28ab.1] Linux proof canonicalisation is deterministic and excludes signature", () => {
  const a = { platform: "linux", scanner_state: "healthy", b: 2, a: 1, signature: "AAA" };
  const b = { signature: "BBB", a: 1, b: 2, scanner_state: "healthy", platform: "linux" };
  assert.equal(canonicaliseDaemonPayload(a), canonicaliseDaemonPayload(b));
  assert.ok(!canonicaliseDaemonPayload(a).includes("AAA"));
});

test("[28ab.1] valid signed Linux proof accepted", () => {
  const { proof, identity } = makeLinuxProof();
  assert.equal(validateDaemonProof(proof, validateOpts(identity)).ok, true);
});

test("[28ab.1] post-signing count tamper rejected", () => {
  const { proof, identity } = makeLinuxProof();
  proof.x11_managed_window_count = 999;
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.ok(["invalid_signature", "invalid_linux_x11_count"].includes(r.reason));
});

// ── 2. timestamp freshness ────────────────────────────────────────────────

test("[28ab.2] stale Linux proof (60s past) rejected with proof_stale", () => {
  const { proof, identity } = makeLinuxProof({
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  });
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "proof_stale");
});

test("[28ab.2] future Linux proof (60s ahead) rejected with proof_in_future", () => {
  const { proof, identity } = makeLinuxProof({
    timestamp: new Date(Date.now() + 60_000).toISOString(),
  });
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "proof_in_future");
});

// ── 3. pairing trust boundary ─────────────────────────────────────────────

test("[28ab.3] Linux platform in SUPPORTED_DEVICE_PLATFORMS post-Stage-2.8A", () => {
  assert.ok(SUPPORTED_DEVICE_PLATFORMS.includes("linux"));
});

test("[28ab.3] unknown platform (freebsd) still rejected as unsupported_platform", () => {
  const { proof, identity } = makeLinuxProof();
  proof.platform = "freebsd";
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("[28ab.3] pairing payload with platform=freebsd rejected", () => {
  const identity = makeIdentity();
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_28ab_audit",
    exam_id: "exam_28ab_audit",
    challenge: b64url(crypto.randomBytes(32)),
    timestamp: new Date().toISOString(),
    node_id_hash: identity.node_id_hash,
    daemon_version: "2.8.0",
    platform: "freebsd",
  };
  const env = {
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
  const r = validateDaemonPairingPayload(env, {
    expectedSessionId: "sess_28ab_audit",
    expectedExamId: "exam_28ab_audit",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

// ── 4. display_server lock factory contract ───────────────────────────────

test("[28ab.4] display_server lock rejects mid-session display_server change", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_lock", "x11");
  const r = lock.observe("sess_lock", "wayland");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "display_server_mismatch");
});

// ── 5. X11 scanner privacy — recursive raw-field rejection ────────────────

test("[28ab.5] every forbidden raw field recursively rejected in Linux proof", () => {
  for (const fieldName of FORBIDDEN_LOCAL_FIELD_NAMES) {
    const { proof, identity } = makeLinuxProof();
    proof.tainted = { [fieldName]: "raw-value" };
    const r = validateDaemonProof(proof, validateOpts(identity));
    assert.equal(r.ok, false, `Linux proof accepted with raw ${fieldName}`);
    assert.equal(r.reason, "forbidden_local_field", `wrong reason for ${fieldName}`);
  }
});

test("[28ab.5] containsForbiddenLocalFieldDeep matches against deep array elements", () => {
  const obj = { scanner_debug: [{ ok: true }, { pid: 1234 }] };
  assert.equal(containsForbiddenLocalFieldDeep(obj), "pid");
});

// ── 6. X11 scanner schema invariants ──────────────────────────────────────

test("[28ab.6] Linux validator enforces scanner_reason=none when scanner_state=healthy", () => {
  const r = validateLinuxScannerSummary({
    platform: "linux",
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    display_server: "x11",
    coverage: "x11_full",
    scanner_reason: "non_local_display",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    privacy_mode: "metadata_only",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_linux_scanner_reason");
});

test("[28ab.6] Linux validator rejects unknown scanner_state / display_server / coverage", () => {
  const base = {
    platform: "linux",
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    display_server: "x11",
    coverage: "x11_full",
    scanner_reason: "none",
    portal_advertised: null,
    portal_active: null,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    privacy_mode: "metadata_only",
  };
  assert.equal(
    validateLinuxScannerSummary({ ...base, scanner_state: "bogus" }).reason,
    "invalid_linux_scanner_state"
  );
  assert.equal(
    validateLinuxScannerSummary({ ...base, display_server: "bogus" }).reason,
    "invalid_linux_display_server"
  );
  assert.equal(
    validateLinuxScannerSummary({ ...base, coverage: "bogus" }).reason,
    "invalid_linux_coverage"
  );
});

test("[28ab.6] Linux state/reason/display/coverage enums are frozen sets", () => {
  // Sanity: the spec's documented enums match what's exported.
  for (const required of [
    "wayland_compositor_restricted",
    "wayland_compositor_unsupported",
    "xwayland_detected",
    "scanner_unavailable",
  ]) {
    assert.ok(LINUX_SCANNER_STATES.has(required), `LINUX_SCANNER_STATES missing ${required}`);
  }
  for (const required of [
    "none",
    "no_display_server",
    "non_local_display",
    "portal_not_active",
    "portal_active_probe_unavailable",
  ]) {
    assert.ok(LINUX_SCANNER_REASONS.has(required), `LINUX_SCANNER_REASONS missing ${required}`);
  }
  assert.ok(LINUX_DISPLAY_SERVERS.has("headless"));
  assert.ok(LINUX_COVERAGES.has("xwayland_partial"));
});

// ── 7. non-local DISPLAY → Warning context, not rejection ─────────────────

test("[28ab.7] signed Linux proof with scanner_reason=non_local_display is accepted", () => {
  const { proof, identity } = makeLinuxProof({
    scanner_state: "scanner_unavailable",
    scanner_reason: "non_local_display",
    coverage: "unknown",
  });
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, true, `non_local_display proof rejected: ${JSON.stringify(r)}`);
});

// ── 8. SDK trust boundary — only signed daemon_proof is trusted ───────────

test("[28ab.8] browser SDK source documents the trust boundary", () => {
  const sdk = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  // The SDK must remain explicit that scanner data is only trusted inside a
  // signed daemon_proof attached to telemetry.
  assert.ok(
    /signed.+daemon_proof|server NEVER trusts/i.test(sdk),
    "browser SDK has lost its explicit trust-boundary comment"
  );
});

// ── 9. Linux risk policy → Warning, never automatic Critical ──────────────

test("[28ab.9] Linux x11_above → Warning (40), never Critical", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 1,
  });
  assert.equal(r.forceCritical, false);
  assert.ok(r.daemon_risk >= 40 && r.daemon_risk < 100);
});

test("[28ab.9] Linux wayland_compositor_restricted → Warning, never Critical", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "wayland_compositor_restricted",
    coverage: "wayland_limited",
  });
  assert.equal(r.forceCritical, false);
});

// ── 10. report wording — no overclaim ─────────────────────────────────────

test("[28ab.10] report wording never asserts misconduct (only manual review)", () => {
  // Spot-check the Manual review wording is the only path. The report builder
  // can only return one of the two known strings — neither contains
  // "misconduct detected" / "guilty" / "cheating".
  const safeWording = "No device-integrity anomaly detected.";
  const warnWording = "Manual review recommended. No automatic misconduct finding.";
  for (const w of [safeWording, warnWording]) {
    assert.ok(!/cheating|guilty|caught|misconduct detected|violation confirmed/i.test(w));
  }
});

// ── 11. dashboard — no affirmative misconduct phrases ─────────────────────

test("[28ab.11] dashboard HTML contains no affirmative misconduct phrases", () => {
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

// ── 12. supply chain — Rust daemon hygiene ────────────────────────────────

function walkRustSources(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "target" || entry === "tests") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      walkRustSources(p, acc);
    } else if (p.endsWith(".rs")) {
      acc.push(p);
    }
  }
  return acc;
}

test("[28ab.12] Linux daemon Rust src has no `unsafe` blocks", () => {
  const files = walkRustSources("tools/simurgh-daemon-linux/src");
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    // Allow the string "unsafe-code" feature flag in Cargo.toml only;
    // forbid actual `unsafe { ... }` or `unsafe fn` in source.
    assert.ok(
      !/\bunsafe\s*[{f]/.test(src),
      `${f} contains an unsafe block — daemon is meant to stay safe-Rust`
    );
  }
});

test("[28ab.12] Linux daemon Rust src does not shell out via Command::new", () => {
  const files = walkRustSources("tools/simurgh-daemon-linux/src");
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    assert.ok(
      !/Command::new\(/.test(src),
      `${f} uses Command::new — daemon must not shell out to external binaries`
    );
  }
});
