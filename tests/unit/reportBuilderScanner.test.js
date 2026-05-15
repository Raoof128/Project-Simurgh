import assert from "node:assert/strict";
import test from "node:test";

import { buildReport } from "../../src/academic/reportBuilder.js";

test("report includes privacy-safe scanner summary in device_integrity", () => {
  const report = buildReport(
    {
      id: "sess_scan",
      examId: "exam_scan",
      studentIdHash: "sha256:student",
      createdAt: Date.now() - 60_000,
      startedAt: Date.now() - 50_000,
      submittedAt: Date.now(),
    },
    {
      latest: { risk_level: "Critical", risk_score: 85, categories: { daemon_risk: 100 } },
      affinity: { hostile: [], lastHeartbeat: null, source: null },
      daemon: {
        daemon_state: "risk_detected",
        scanner_state: "risk_detected",
        scanner_version: "2.5.0",
        proofs_verified: 4,
        scanner_scans_verified: 4,
        capture_excluded_window_count_max: 1,
        scanner_error_count: 0,
        permission_denied_count: 0,
      },
    },
    [],
    true
  );

  assert.equal(report.device_integrity.scanner_final_state, "risk_detected");
  assert.equal(report.device_integrity.scanner_version, "2.5.0");
  assert.equal(report.device_integrity.scanner_scans_verified, 4);
  assert.equal(report.device_integrity.capture_excluded_window_count_max, 1);
  assert.equal(
    report.device_integrity.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
  for (const forbidden of ["process_name", "window_title", "pid", "username", "home_directory"]) {
    assert.equal(forbidden in report.device_integrity, false);
  }
});
