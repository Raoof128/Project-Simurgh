// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { mapScannerSummaryToRisk } from "../../src/device/scannerRiskPolicy.js";

test("Linux healthy x11 counts → Safe (daemon_risk 0, no force)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 0,
    x11_override_redirect_window_count_max: 0,
  });
  assert.equal(r.daemon_risk, 0);
  assert.equal(r.forceCritical, false);
});

test("Linux x11_above_window_count_max > 0 → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 1,
    x11_override_redirect_window_count_max: 0,
  });
  assert.ok(r.daemon_risk >= 40, `expected ≥40 risk, got ${r.daemon_risk}`);
  assert.equal(r.forceCritical, false);
});

test("Linux x11_override_redirect_window_count_max > 0 → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "healthy",
    coverage: "x11_full",
    x11_above_window_count_max: 0,
    x11_override_redirect_window_count_max: 1,
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("Linux wayland_compositor_restricted → Warning context (not misconduct)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "wayland_compositor_restricted",
    coverage: "wayland_limited",
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("Linux xwayland_partial coverage → Warning context", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    platform: "linux",
    scanner_state: "xwayland_detected",
    coverage: "xwayland_partial",
  });
  assert.ok(r.daemon_risk >= 40);
  assert.equal(r.forceCritical, false);
});

test("macOS capture_excluded_window_count_max > 0 still forces Critical (no regression)", () => {
  const r = mapScannerSummaryToRisk({
    daemon_state: "healthy",
    capture_excluded_window_count_max: 1,
  });
  assert.equal(r.daemon_risk, 100);
  assert.equal(r.forceCritical, true);
});
