// Stage 2.8C/D combined cybersecurity audit.
//
// 16 dimensions. Lock the doors behind Phase G's smoke. Every dimension is
// a source-grep, validator-level, or factory-level assertion — no live HTTP
// (that's the smoke's job). This audit is the boring guarantor: every future
// commit must satisfy these or the gate fails.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createDisplayServerLock } from "../../src/device/daemonState.js";
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
import { mapScannerSummaryToRisk } from "../../src/device/scannerRiskPolicy.js";

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function makeIdentity() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pkDer = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    public_key: b64url(pkDer),
    node_id_hash: computeDaemonNodeIdHash(b64url(pkDer)),
  };
}

function makeLinuxProof(overrides = {}, identity = makeIdentity()) {
  const proof = {
    type: "simurgh.daemon.proof",
    session_id: "sess_28cd_audit",
    exam_id: "exam_28cd_audit",
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
  proof.signature = b64url(
    crypto.sign("sha256", Buffer.from(canonicaliseDaemonPayload(proof)), {
      key: identity.privateKey,
      dsaEncoding: "der",
    })
  );
  return { proof, identity };
}

const validateOpts = (identity) => ({
  expectedSessionId: "sess_28cd_audit",
  expectedExamId: "exam_28cd_audit",
  pairedNode: { node_id_hash: identity.node_id_hash, public_key: identity.public_key },
});

// ── 1. proof canonicalisation + tamper rejection ──────────────────────────

test("[28cd.1] canonical proof JSON is deterministic and excludes signature", () => {
  const a = { platform: "linux", scanner_state: "healthy", b: 2, a: 1, signature: "ZZZ" };
  const b = { signature: "YYY", a: 1, b: 2, scanner_state: "healthy", platform: "linux" };
  assert.equal(canonicaliseDaemonPayload(a), canonicaliseDaemonPayload(b));
  assert.ok(!canonicaliseDaemonPayload(a).includes("ZZZ"));
});

test("[28cd.1] post-signing count tamper rejected", () => {
  const { proof, identity } = makeLinuxProof();
  proof.x11_managed_window_count = 999;
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.ok(["invalid_signature", "invalid_linux_x11_count"].includes(r.reason));
});

test("[28cd.1] stale Linux proof rejected as proof_stale", () => {
  const { proof, identity } = makeLinuxProof({
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  });
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "proof_stale");
});

test("[28cd.1] future Linux proof rejected as proof_in_future", () => {
  const { proof, identity } = makeLinuxProof({
    timestamp: new Date(Date.now() + 60_000).toISOString(),
  });
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "proof_in_future");
});

// ── 2. pairing trust boundary ─────────────────────────────────────────────

test("[28cd.2] Linux platform in SUPPORTED_DEVICE_PLATFORMS", () => {
  assert.ok(SUPPORTED_DEVICE_PLATFORMS.includes("linux"));
});

test("[28cd.2] unknown platform freebsd rejected", () => {
  const { proof, identity } = makeLinuxProof();
  proof.platform = "freebsd";
  const r = validateDaemonProof(proof, validateOpts(identity));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

test("[28cd.2] freebsd pairing payload rejected", () => {
  const identity = makeIdentity();
  const signed_payload = {
    type: "simurgh.daemon.pair",
    session_id: "sess_28cd_audit",
    exam_id: "exam_28cd_audit",
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
    expectedSessionId: "sess_28cd_audit",
    expectedExamId: "exam_28cd_audit",
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "unsupported_platform");
});

// ── 3. display-server lock ────────────────────────────────────────────────

test("[28cd.3] display_server_lock rejects mid-session change", () => {
  const lock = createDisplayServerLock();
  lock.observe("sess_lock", "x11");
  const r = lock.observe("sess_lock", "wayland");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "display_server_mismatch");
});

test("[28cd.3] server.js wires displayServerLock.observe into telemetry path", () => {
  const src = readFileSync("server.js", "utf8");
  assert.ok(
    /displayServerLock\.observe\(/.test(src),
    "server.js missing displayServerLock.observe call"
  );
  assert.ok(
    /display_server_mismatch/.test(src),
    "server.js missing display_server_mismatch rejection"
  );
});

// ── 4. Wayland advertised ≠ active ────────────────────────────────────────

test("[28cd.4] validateLinuxScannerSummary treats portal_advertised and portal_active independently", () => {
  const base = {
    platform: "linux",
    scanner_state: "wayland_portal_available",
    scanner_version: "2.8.0",
    display_server: "wayland",
    coverage: "wayland_limited",
    scanner_reason: "none",
    portal_advertised: true,
    portal_active: true,
    x11_managed_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_above_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    privacy_mode: "metadata_only",
  };
  // advertised=true, active=true → ok
  assert.equal(validateLinuxScannerSummary(base).ok, true);
  // advertised=true, active=false → ok (compositor restricted is valid)
  assert.equal(
    validateLinuxScannerSummary({
      ...base,
      scanner_state: "wayland_compositor_restricted",
      scanner_reason: "portal_not_active",
      portal_active: false,
    }).ok,
    true
  );
  // advertised=false, active=true → INVALID (cannot be active without being advertised)
  const r = validateLinuxScannerSummary({
    ...base,
    scanner_state: "wayland_compositor_unsupported",
    portal_advertised: false,
    portal_active: true,
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_linux_portal_state");
});

// ── 5. CONSENT SAFETY — banned-method grep on wayland.rs ─────────────────

test("[28cd.5] wayland.rs contains no consent-triggering ScreenCast method calls", () => {
  const src = readFileSync("tools/simurgh-daemon-linux/src/scanner/wayland.rs", "utf8");
  for (const banned of ["CreateSession", "SelectSources", "OpenPipeWireRemote"]) {
    assert.ok(
      !src.includes(`"${banned}"`) && !src.includes(`.${banned}(`),
      `wayland.rs references ScreenCast method ${banned} — would trigger consent dialog`
    );
  }
  // "Start" is a more generic word — check only the explicit "\"Start\"" form
  // (e.g., a call like `.call::<_, _, R>("Start", &(...))` is the dangerous shape).
  assert.ok(
    !src.includes('"Start"'),
    'wayland.rs references ScreenCast method "Start" — would trigger consent dialog'
  );
});

// ── 6. XWayland partial-only — never claims x11_full or wayland_limited ──

test("[28cd.6] xwayland.rs only emits coverage=xwayland_partial (or unavailable)", () => {
  const src = readFileSync("tools/simurgh-daemon-linux/src/scanner/xwayland.rs", "utf8");
  assert.ok(
    /coverage: "xwayland_partial"/.test(src),
    "xwayland.rs missing xwayland_partial coverage"
  );
  assert.ok(!/coverage: "x11_full"/.test(src), "xwayland.rs claims x11_full coverage");
  assert.ok(
    !/coverage: "wayland_limited"/.test(src),
    "xwayland.rs claims wayland_limited coverage"
  );
});

test("[28cd.6] LINUX_COVERAGES contains xwayland_partial", () => {
  assert.ok(LINUX_COVERAGES.has("xwayland_partial"));
});

// ── 7. browser_package_hint UX-only — 5-source perimeter ─────────────────

test("[28cd.7] browser_package_hint is present in SDK only", () => {
  const sdk = readFileSync("public/sdk/simurgh-browser-sdk.js", "utf8");
  assert.ok(/browser_package_hint/.test(sdk), "SDK missing browser_package_hint");
});

test("[28cd.7] browser_package_hint absent from server.js (UX-only trust boundary)", () => {
  const src = readFileSync("server.js", "utf8");
  assert.ok(!/browser_package_hint/.test(src), "server.js references browser_package_hint");
});

test("[28cd.7] browser_package_hint absent from daemonProof.js", () => {
  const src = readFileSync("src/device/daemonProof.js", "utf8");
  assert.ok(!/browser_package_hint/.test(src), "daemonProof.js references browser_package_hint");
});

test("[28cd.7] browser_package_hint absent from platformScannerSchema.js", () => {
  const src = readFileSync("src/device/platformScannerSchema.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(src),
    "platformScannerSchema.js references browser_package_hint"
  );
});

test("[28cd.7] browser_package_hint absent from scannerRiskPolicy.js", () => {
  const src = readFileSync("src/device/scannerRiskPolicy.js", "utf8");
  assert.ok(
    !/browser_package_hint/.test(src),
    "scannerRiskPolicy.js references browser_package_hint"
  );
});

test("[28cd.7] browser_package_hint absent from reportBuilder.js", () => {
  const src = readFileSync("src/academic/reportBuilder.js", "utf8");
  assert.ok(!/browser_package_hint/.test(src), "reportBuilder.js references browser_package_hint");
});

// ── 8. systemd user-only, no root/sudo/system-wide ───────────────────────

test("[28cd.8] systemd unit is user-only with hardening directives", () => {
  const src = readFileSync(
    "tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service",
    "utf8"
  );
  assert.ok(/WantedBy=default\.target/.test(src));
  assert.ok(!/User=root/.test(src));
  assert.ok(!/WantedBy=multi-user\.target/.test(src));
  assert.ok(!/\bsudo\b/.test(src));
  for (const directive of [
    "NoNewPrivileges=true",
    "ProtectSystem=",
    "ProtectHome=",
    "PrivateTmp=true",
  ]) {
    assert.ok(src.includes(directive), `unit missing ${directive}`);
  }
});

// ── 9. scripts — no sudo / no eval / no curl pipe ────────────────────────

test("[28cd.9] lifecycle scripts use no sudo, no eval, no curl-pipe-sh", () => {
  for (const s of [
    "tools/simurgh-daemon-linux/scripts/install-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/uninstall-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/check-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/doctor-user-unit.sh",
  ]) {
    const src = readFileSync(s, "utf8");
    assert.ok(!/\bsudo\b/.test(src), `${s} uses sudo`);
    assert.ok(!/\beval\b/.test(src), `${s} uses eval`);
    assert.ok(!/curl[^|]+\|\s*(sh|bash)/.test(src), `${s} pipes curl to shell`);
  }
});

// ── 10. CI Rust fmt/clippy/test enforced ─────────────────────────────────

test("[28cd.10] CI workflow enforces Rust fmt / clippy / test", () => {
  const src = readFileSync(".github/workflows/stage-1-checks.yml", "utf8");
  assert.ok(/cargo fmt --check/.test(src));
  assert.ok(/cargo clippy.*-D warnings/.test(src));
  assert.ok(/cargo test.*tools\/simurgh-daemon-linux/.test(src));
});

// ── 11. Xvfb mandatory in CI ─────────────────────────────────────────────

test("[28cd.11] CI workflow sets SIMURGH_REQUIRE_XVFB_TESTS=1", () => {
  const src = readFileSync(".github/workflows/stage-1-checks.yml", "utf8");
  assert.ok(/SIMURGH_REQUIRE_XVFB_TESTS:\s*["']?1["']?/.test(src));
});

// ── 12. recursive raw-field rejection ─────────────────────────────────────

test("[28cd.12] every forbidden raw field recursively rejected in Linux proof", () => {
  for (const fieldName of FORBIDDEN_LOCAL_FIELD_NAMES) {
    const { proof, identity } = makeLinuxProof();
    proof.tainted = { [fieldName]: "raw-value" };
    const r = validateDaemonProof(proof, validateOpts(identity));
    assert.equal(r.ok, false, `Linux proof accepted with raw ${fieldName}`);
    assert.equal(r.reason, "forbidden_local_field", `wrong reason for ${fieldName}`);
  }
});

test("[28cd.12] containsForbiddenLocalFieldDeep matches deep array elements", () => {
  const obj = { scanner_debug: [{ ok: true }, { pid: 1234 }] };
  assert.equal(containsForbiddenLocalFieldDeep(obj), "pid");
});

// ── 13. report shape — no macOS/Windows leak when platform=linux ──────────

test("[28cd.13] reportBuilder.js Linux branch excludes macOS/Windows count fields", () => {
  const src = readFileSync("src/academic/reportBuilder.js", "utf8");
  // The Linux branch (platform === 'linux') must NOT emit these keys.
  // Easiest invariant: the Linux return block must not list them.
  const linuxBranch = src.match(/if \(platform === "linux"\) \{[\s\S]*?return \{[\s\S]*?\};/);
  assert.ok(linuxBranch, "Linux branch not found in reportBuilder");
  for (const banned of [
    "capture_excluded_window_count_max",
    "capture_restricted_window_count_max",
    "monitor_only_window_count_max",
  ]) {
    assert.ok(
      !linuxBranch[0].includes(banned),
      `Linux branch leaks macOS/Windows field: ${banned}`
    );
  }
});

// ── 14. dashboard wording — no misconduct phrases ────────────────────────

test("[28cd.14] dashboard contains no affirmative misconduct phrases", () => {
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

// ── 15. audit chain verify + tamper invalidates ──────────────────────────
//
// The full HMAC-SHA256 audit chain implementation is already exercised by
// existing Stage 1/2.7 audit tests. We assert at this level only that the
// daemonState rollup, reportBuilder, and lock factory don't accidentally
// bypass the chain.

test("[28cd.15] daemon proof flow integrates with HMAC audit (no parallel ledger)", () => {
  const srv = readFileSync("server.js", "utf8");
  // Must call appendAudit on DAEMON_PROOF_VERIFIED and DAEMON_PROOF_REJECTED paths.
  assert.ok(/appendAudit\(sess, EVENTS\.DAEMON_PROOF_VERIFIED/.test(srv));
  assert.ok(/appendAudit\(sess, EVENTS\.DAEMON_PROOF_REJECTED/.test(srv));
});

// ── 16. wording — no production / attestation / automatic-misconduct ─────

test("[28cd.16] design wording — no production / attestation / automatic-misconduct overclaim", () => {
  const SCAN_FILES = [
    "tools/simurgh-daemon-linux/systemd/simurgh-daemon-linux.service",
    "tools/simurgh-daemon-linux/scripts/install-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/uninstall-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/check-user-unit.sh",
    "tools/simurgh-daemon-linux/scripts/doctor-user-unit.sh",
    "public/sdk/simurgh-browser-sdk.js",
  ];
  for (const f of SCAN_FILES) {
    const src = readFileSync(f, "utf8").toLowerCase();
    for (const phrase of [
      "production deployment",
      "production endpoint",
      "hardware attestation",
      "automatic misconduct",
      "misconduct detected",
      "cheating detected",
    ]) {
      assert.ok(!src.includes(phrase), `${f} contains forbidden phrase: ${phrase}`);
    }
  }
});

// ── Linux risk policy — Warning, never automatic Critical ────────────────

test("[28cd.risk] Linux signals → Warning, never Critical", () => {
  for (const record of [
    {
      daemon_state: "healthy",
      platform: "linux",
      scanner_state: "healthy",
      x11_above_window_count_max: 1,
    },
    {
      daemon_state: "healthy",
      platform: "linux",
      scanner_state: "healthy",
      x11_override_redirect_window_count_max: 1,
    },
    {
      daemon_state: "healthy",
      platform: "linux",
      scanner_state: "wayland_compositor_restricted",
      coverage: "wayland_limited",
    },
    {
      daemon_state: "healthy",
      platform: "linux",
      scanner_state: "xwayland_detected",
      coverage: "xwayland_partial",
    },
  ]) {
    const r = mapScannerSummaryToRisk(record);
    assert.equal(r.forceCritical, false, `Linux signal forced Critical: ${JSON.stringify(record)}`);
  }
});
