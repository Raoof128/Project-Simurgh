// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import test from "node:test";

import { buildReport } from "../../src/academic/reportBuilder.js";

function baseSession() {
  return {
    sessionRecord: {
      id: "sess_1",
      examId: "exam_1",
      studentIdHash: "sha256:abc",
      startedAt: 1_700_000_000_000,
      submittedAt: 1_700_000_600_000,
      createdAt: 1_700_000_000_000,
    },
    sessionData: { latest: null, affinity: null, daemon: null },
    eventList: [],
    auditChainValid: true,
  };
}

test("device_integrity includes daemon_platform alongside back-compat platform key", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "windows",
    scanner_state: "healthy",
    scanner_version: "2.6.0",
    proofs_verified: 4,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(r.device_integrity.daemon_platform, "windows");
  assert.equal(r.device_integrity.platform, "windows");
});

test("device_integrity manual_review_recommendation uses scannerRiskPolicy wording", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "risk_detected",
    platform: "macos",
    scanner_state: "risk_detected",
    capture_excluded_window_count_max: 1,
    proofs_verified: 2,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(
    r.device_integrity.manual_review_recommendation,
    "Manual review recommended. No automatic misconduct finding."
  );
});

test("device_integrity safe wording when no anomaly", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "macos",
    scanner_state: "healthy",
    proofs_verified: 5,
  };
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(
    r.device_integrity.manual_review_recommendation,
    "No device-integrity anomaly detected."
  );
});

test("device_integrity daemon_platform defaults to unknown when daemon missing", () => {
  const s = baseSession();
  s.sessionData.daemon = null;
  const r = buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid);
  assert.equal(r.device_integrity.daemon_platform, "unknown");
});

test("device_integrity emits same top-level key set for macOS and Windows", () => {
  const s = baseSession();
  s.sessionData.daemon = {
    daemon_state: "healthy",
    platform: "macos",
    scanner_state: "healthy",
    proofs_verified: 3,
  };
  const macKeys = Object.keys(
    buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid).device_integrity
  ).sort();

  s.sessionData.daemon.platform = "windows";
  const winKeys = Object.keys(
    buildReport(s.sessionRecord, s.sessionData, s.eventList, s.auditChainValid).device_integrity
  ).sort();

  assert.deepEqual(macKeys, winKeys);
});
