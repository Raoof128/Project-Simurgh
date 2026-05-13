import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildReport } from "../../src/academic/reportBuilder.js";

describe("buildReport", () => {
  const sessionRecord = {
    id: "sess_abc",
    examId: "exam_1",
    studentIdHash: "sha256abc",
    state: "submitted",
    createdAt: Date.now() - 3600000,
    startedAt: Date.now() - 3500000,
    submittedAt: Date.now(),
    reconnects: 0,
  };

  const sessionData = {
    latest: { risk_level: "Warning", risk_score: 55, categories: { paste_risk: 60 } },
    affinity: { hostile: [], lastHeartbeat: null, source: null },
  };

  const eventList = [
    { type: "EXAM_STARTED", ts: Date.now() - 3500000, detail: {} },
    { type: "BULK_PASTE", ts: Date.now() - 1000000, detail: { chars: 220 } },
  ];

  test("returns a report with all required top-level fields", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.ok(report.report_id.startsWith("rep_"));
    assert.equal(report.session_id, "sess_abc");
    assert.equal(report.exam_id, "exam_1");
    assert.equal(report.student_id_hash, "sha256abc");
    assert.equal(report.privacy_mode, "metadata_only");
    assert.ok(typeof report.duration_minutes === "number");
    assert.ok(report.audit_chain_valid === true || report.audit_chain_valid === false);
    assert.ok(Array.isArray(report.timeline));
    assert.ok(typeof report.recommendation === "string");
  });

  test("recommendation always contains manual review language", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.match(report.recommendation, /[Mm]anual review/);
  });

  test("timeline includes passed events", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.equal(report.timeline.length, 2);
    assert.equal(report.timeline[0].event, "EXAM_STARTED");
  });

  test("duration_minutes is calculated correctly", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.ok(
      report.duration_minutes > 55 && report.duration_minutes < 65,
      `Expected ~60, got ${report.duration_minutes}`
    );
  });

  test("helper_connected reflects affinity state", () => {
    const report = buildReport(sessionRecord, sessionData, eventList, true);
    assert.equal(report.helper_connected, false); // no lastHeartbeat
  });
});
