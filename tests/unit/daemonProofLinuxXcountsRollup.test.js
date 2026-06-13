// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { createDaemonStateRegistry } from "../../src/device/daemonState.js";

function linuxProofFields(seq, x11_managed) {
  return {
    sequence: seq,
    platform: "linux",
    capture_excluded_window_count: 0,
    helper_state: "healthy",
    scanner_state: "healthy",
    scanner_version: "2.8.0",
    scan_timestamp: new Date().toISOString(),
    scan_duration_ms: 5,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: x11_managed,
    timestamp: new Date().toISOString(),
    x11_managed_window_count: x11_managed,
    x11_above_window_count: 0,
    x11_override_redirect_window_count: 0,
    x11_fullscreen_window_count: 0,
    x11_skip_taskbar_window_count: 0,
    xwayland_window_count: 0,
    display_server: "x11",
    coverage: "x11_full",
  };
}

test("Linux x11_managed rolls up to max across proofs in a session", () => {
  const reg = createDaemonStateRegistry();
  reg.recordProofVerified("sess_a", linuxProofFields(1, 2));
  reg.recordProofVerified("sess_a", linuxProofFields(2, 5));
  reg.recordProofVerified("sess_a", linuxProofFields(3, 4));
  const r = reg.get("sess_a");
  assert.equal(r.x11_managed_window_count_max, 5);
  assert.equal(r.x11_managed_window_count, 4); // last-seen value
  assert.equal(r.display_server, "x11");
  assert.equal(r.coverage, "x11_full");
});

test("Linux x11_above rolls up to max across proofs", () => {
  const reg = createDaemonStateRegistry();
  reg.recordProofVerified("sess_b", { ...linuxProofFields(1, 1), x11_above_window_count: 0 });
  reg.recordProofVerified("sess_b", { ...linuxProofFields(2, 1), x11_above_window_count: 2 });
  reg.recordProofVerified("sess_b", { ...linuxProofFields(3, 1), x11_above_window_count: 1 });
  const r = reg.get("sess_b");
  assert.equal(r.x11_above_window_count_max, 2);
});
