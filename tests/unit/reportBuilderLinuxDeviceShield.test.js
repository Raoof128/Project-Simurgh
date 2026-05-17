import assert from "node:assert/strict";
import test from "node:test";

import { buildReport } from "../../src/academic/reportBuilder.js";

function baseSession() {
  return {
    sessionRecord: {
      id: "sess_linux_report",
      examId: "exam_linux_report",
      studentIdHash: "sha256:" + "a".repeat(64),
      startedAt: 1_700_000_000_000,
      submittedAt: 1_700_000_600_000,
      createdAt: 1_700_000_000_000,
    },
    sessionData: {
      latest: null,
      affinity: null,
      daemon: {
        platform: "linux",
        daemon_state: "healthy",
        scanner_state: "healthy",
        scanner_version: "2.8.0",
        daemon_version: "2.8.0",
        proofs_verified: 5,
        proofs_rejected: 0,
        display_server: "x11",
        display_server_locked: true,
        coverage: "x11_full",
        portal_advertised: null,
        portal_active: null,
        x11_managed_window_count_max: 4,
        x11_override_redirect_window_count_max: 0,
        x11_above_window_count_max: 1,
        x11_fullscreen_window_count_max: 0,
        x11_skip_taskbar_window_count_max: 0,
        xwayland_window_count_max: 0,
      },
    },
    eventList: [],
    auditChainValid: true,
  };
}

test("Linux device_integrity emits display_server + coverage + portal fields", () => {
  const s = baseSession();
  const report = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  const d = report.device_integrity;
  assert.equal(d.daemon_platform, "linux");
  assert.equal(d.display_server, "x11");
  assert.equal(d.display_server_locked, true);
  assert.equal(d.coverage, "x11_full");
  assert.equal(d.portal_advertised, null);
  assert.equal(d.portal_active, null);
  assert.equal(d.x11_managed_window_count_max, 4);
  assert.equal(d.x11_above_window_count_max, 1);
  // baseSession() seeds x11_above_window_count_max=1, so Warning is the
  // correct outcome (the always-on-top overlay class is Warning context).
  assert.equal(
    d.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("Linux device_integrity rolls up Warning when coverage is wayland_limited", () => {
  const s = baseSession();
  s.sessionData.daemon.display_server = "wayland";
  s.sessionData.daemon.coverage = "wayland_limited";
  s.sessionData.daemon.scanner_state = "wayland_compositor_restricted";
  const d = buildReport(
    s.sessionRecord,
    s.sessionData,
    s.eventList,
    s.auditChainValid
  ).device_integrity;
  assert.equal(d.display_server, "wayland");
  assert.equal(d.coverage, "wayland_limited");
  assert.equal(
    d.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("Linux x11_above_window_count_max > 0 rolls up to Warning", () => {
  const s = baseSession();
  s.sessionData.daemon.x11_above_window_count_max = 1;
  const d = buildReport(
    s.sessionRecord,
    s.sessionData,
    s.eventList,
    s.auditChainValid
  ).device_integrity;
  assert.equal(
    d.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("Linux x11_override_redirect_window_count_max > 0 rolls up to Warning", () => {
  const s = baseSession();
  s.sessionData.daemon.x11_override_redirect_window_count_max = 2;
  const d = buildReport(
    s.sessionRecord,
    s.sessionData,
    s.eventList,
    s.auditChainValid
  ).device_integrity;
  assert.equal(
    d.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("Linux device_integrity does not include macOS/Windows-only count fields when platform=linux", () => {
  const s = baseSession();
  const d = buildReport(
    s.sessionRecord,
    s.sessionData,
    s.eventList,
    s.auditChainValid
  ).device_integrity;
  assert.ok(
    !("capture_excluded_window_count_max" in d),
    "Linux report leaked macOS/Windows capture_excluded_window_count_max"
  );
  assert.ok(
    !("capture_restricted_window_count_max" in d),
    "Linux report leaked macOS/Windows capture_restricted_window_count_max"
  );
  assert.ok(
    !("monitor_only_window_count_max" in d),
    "Linux report leaked macOS/Windows monitor_only_window_count_max"
  );
});
