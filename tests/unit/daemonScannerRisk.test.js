import assert from "node:assert/strict";
import test from "node:test";

import { createDaemonStateRegistry, scoreDaemonRisk } from "../../src/device/daemonState.js";
import { scoreAcademicRisk } from "../../src/academic/riskScoring.js";

test("scanner unavailable proof is accepted into state as warning-level daemon risk", () => {
  const registry = createDaemonStateRegistry({ staleAfterMs: 10_000 });
  registry.recordProofVerified("sess_scan", {
    sequence: 1,
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "scanner_unavailable",
    timestamp: "2026-05-16T00:00:00.000Z",
    now: 1000,
  });

  const state = registry.get("sess_scan", 2000);
  assert.equal(state.scanner_state, "scanner_unavailable");
  assert.deepEqual(scoreDaemonRisk(state), { daemon_risk: 40, forceCritical: false });
});

test("capture-excluded scanner result forces Critical manual review path", () => {
  const registry = createDaemonStateRegistry({ staleAfterMs: 10_000 });
  registry.recordProofVerified("sess_scan", {
    sequence: 1,
    capture_excluded_window_count: 2,
    helper_state: "healthy",
    scanner_state: "risk_detected",
    visible_window_count: 12,
    suspicious_window_count: 2,
    timestamp: "2026-05-16T00:00:00.000Z",
    now: 1000,
  });

  const state = registry.get("sess_scan", 2000);
  assert.equal(state.daemon_state, "risk_detected");
  assert.equal(state.scanner_state, "risk_detected");
  assert.equal(state.capture_excluded_window_count_max, 2);
  assert.deepEqual(scoreDaemonRisk(state), { daemon_risk: 100, forceCritical: true });
});

test("Windows monitor-only scanner result is warning-level manual review context", () => {
  const registry = createDaemonStateRegistry({ staleAfterMs: 10_000 });
  registry.recordProofVerified("sess_windows", {
    sequence: 1,
    platform: "windows",
    capture_excluded_window_count: 0,
    capture_restricted_window_count: 1,
    monitor_only_window_count: 1,
    helper_state: "healthy",
    scanner_state: "restricted_detected",
    scanner_version: "2.6.0",
    visible_window_count: 12,
    suspicious_window_count: 1,
    timestamp: "2026-05-16T00:00:00.000Z",
    now: 1000,
  });

  const state = registry.get("sess_windows", 2000);
  assert.equal(state.platform, "windows");
  assert.equal(state.daemon_state, "healthy");
  assert.equal(state.monitor_only_window_count_max, 1);
  assert.deepEqual(scoreDaemonRisk(state), { daemon_risk: 40, forceCritical: false });
  const scored = scoreAcademicRisk(
    { chars_typed: 12 },
    { connected: true, daemonRisk: 40, daemonForceCritical: false },
    { startedAt: Date.now() }
  );
  assert.equal(scored.risk_level, "Warning");
  assert.equal(
    scored.recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});
