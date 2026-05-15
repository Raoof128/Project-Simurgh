import assert from "node:assert/strict";
import test from "node:test";

import { createDaemonStateRegistry, scoreDaemonRisk } from "../../src/device/daemonState.js";

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
