// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import {
  mapScannerSummaryToRisk,
  getManualReviewReason,
} from "../../src/device/scannerRiskPolicy.js";

test("capture_excluded > 0 yields Critical floor", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "risk_detected",
    capture_excluded_window_count_max: 1,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "risk_detected",
  });
  assert.equal(r.daemon_risk, 100);
  assert.equal(r.forceCritical, true);
});

test("monitor_only > 0 yields Warning (40, not Critical)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 1,
    scanner_state: "healthy",
  });
  assert.equal(r.daemon_risk, 40);
  assert.equal(r.forceCritical, false);
});

test("capture_restricted > 0 yields Warning", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 1,
    monitor_only_window_count_max: 0,
    scanner_state: "restricted_detected",
  });
  assert.equal(r.daemon_risk, 40);
});

test("scanner_unavailable / permission_denied / scan_error yield Warning", () => {
  for (const s of ["scanner_unavailable", "permission_denied", "scan_error"]) {
    const r = mapScannerSummaryToRisk({
      daemon_state: "healthy",
      capture_excluded_window_count_max: 0,
      capture_restricted_window_count_max: 0,
      monitor_only_window_count_max: 0,
      scanner_state: s,
    });
    assert.equal(r.daemon_risk, 40, `state ${s}`);
  }
});

test("daemon_state untrusted/unpaired/stale/missing map to documented partial risks", () => {
  const base = {
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "unknown",
  };
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "untrusted" }).daemon_risk, 50);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "unpaired" }).daemon_risk, 25);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "stale" }).daemon_risk, 20);
  assert.equal(mapScannerSummaryToRisk({ ...base, daemon_state: "missing" }).daemon_risk, 15);
});

test("healthy clean record yields zero risk", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "healthy",
  });
  assert.equal(r.daemon_risk, 0);
  assert.equal(r.forceCritical, false);
});

test("getManualReviewReason returns documented wording for Critical/Warning/Safe", () => {
  assert.equal(
    getManualReviewReason("Critical"),
    "Manual review required. No automatic misconduct finding."
  );
  assert.equal(
    getManualReviewReason("Warning"),
    "Manual review recommended. No automatic misconduct finding."
  );
  assert.equal(getManualReviewReason("Safe"), "No anomalies detected.");
});

test("getManualReviewReason device-integrity variant", () => {
  assert.equal(
    getManualReviewReason("Critical", { context: "device_integrity" }),
    "Manual review recommended. No automatic misconduct finding."
  );
  assert.equal(
    getManualReviewReason("Safe", { context: "device_integrity" }),
    "No device-integrity anomaly detected."
  );
});
