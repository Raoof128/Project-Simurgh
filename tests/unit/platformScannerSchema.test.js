import assert from "node:assert/strict";
import test from "node:test";

import {
  SUPPORTED_DEVICE_PLATFORMS,
  PLANNED_DEVICE_PLATFORMS,
  SCANNER_STATES,
  getExpectedScannerVersion,
  isSupportedPlatform,
  getPlatformScannerDefaults,
  validateScannerSummary,
} from "../../src/device/platformScannerSchema.js";

test("SUPPORTED_DEVICE_PLATFORMS contains macos, windows, and linux", () => {
  assert.deepEqual([...SUPPORTED_DEVICE_PLATFORMS].sort(), ["linux", "macos", "windows"]);
});

test("PLANNED_DEVICE_PLATFORMS is empty after Linux acceptance", () => {
  assert.deepEqual([...PLANNED_DEVICE_PLATFORMS], []);
});

test("isSupportedPlatform accepts linux post-Stage-2.8A", () => {
  assert.equal(isSupportedPlatform("macos"), true);
  assert.equal(isSupportedPlatform("windows"), true);
  assert.equal(isSupportedPlatform("linux"), true);
  assert.equal(isSupportedPlatform("freebsd"), false);
  assert.equal(isSupportedPlatform(""), false);
  assert.equal(isSupportedPlatform(null), false);
});

test("getExpectedScannerVersion returns 2.5.0 for macos and 2.6.0 for windows", () => {
  assert.equal(getExpectedScannerVersion("macos"), "2.5.0");
  assert.equal(getExpectedScannerVersion("windows"), "2.6.0");
});

test("getExpectedScannerVersion returns 2.8.0 for linux and null for unsupported platforms", () => {
  assert.equal(getExpectedScannerVersion("linux"), "2.8.0");
  assert.equal(getExpectedScannerVersion("unknown"), null);
});

test("SCANNER_STATES is the canonical enum used across platforms", () => {
  assert.ok(SCANNER_STATES.has("healthy"));
  assert.ok(SCANNER_STATES.has("risk_detected"));
  assert.ok(SCANNER_STATES.has("restricted_detected"));
  assert.ok(SCANNER_STATES.has("scanner_unavailable"));
  assert.ok(SCANNER_STATES.has("permission_denied"));
  assert.ok(SCANNER_STATES.has("scan_error"));
  assert.ok(SCANNER_STATES.has("unsupported_macos_version"));
});

test("getPlatformScannerDefaults returns zeroed counters for macos", () => {
  const d = getPlatformScannerDefaults("macos");
  assert.equal(d.scanner_state, "healthy");
  assert.equal(d.capture_restricted_window_count, 0);
  assert.equal(d.monitor_only_window_count, 0);
  assert.equal(d.privacy_mode, "metadata_only");
  assert.equal(d.scanner_version, "2.5.0");
});

test("validateScannerSummary accepts a healthy macos summary", () => {
  const raw = {
    platform: "macos",
    capture_excluded_window_count: 0,
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 8,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 12,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, true);
  assert.equal(r.fields.scanner_state, "healthy");
});

test("validateScannerSummary rejects mismatched scanner_version for platform", () => {
  const raw = {
    platform: "windows",
    capture_excluded_window_count: 0,
    scanner_state: "healthy",
    scanner_version: "2.5.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_scanner_version");
});

test("validateScannerSummary returns defaults when no scanner fields present", () => {
  const raw = { platform: "macos", capture_excluded_window_count: 0 };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, true);
  assert.equal(r.fields.scanner_state, "healthy");
  assert.equal(r.fields.privacy_mode, "metadata_only");
});

test("validateScannerSummary rejects suspicious_window_count below capture_excluded+monitor_only", () => {
  const raw = {
    platform: "windows",
    capture_excluded_window_count: 1,
    scanner_state: "risk_detected",
    scanner_version: "2.6.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 4,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 1,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  };
  const r = validateScannerSummary(raw);
  assert.equal(r.ok, false);
  assert.equal(r.reason, "invalid_suspicious_window_count");
});
