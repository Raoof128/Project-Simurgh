import crypto from "node:crypto";

export function buildReport(sessionRecord, sessionData, eventList, auditChainValid) {
  const { id, examId, studentIdHash, startedAt, submittedAt, createdAt } = sessionRecord;
  const { latest, affinity, daemon } = sessionData;

  const durationMs = submittedAt
    ? submittedAt - (startedAt ?? createdAt)
    : Date.now() - (startedAt ?? createdAt);
  const duration_minutes = Math.round(durationMs / 60000);

  const riskLevel = latest?.risk_level ?? "Safe";
  const riskScore = latest?.risk_score ?? 0;

  const recommendation =
    riskLevel === "Critical"
      ? "Manual review required. No automatic misconduct finding."
      : riskLevel === "Warning"
        ? "Manual review recommended. No automatic misconduct finding."
        : "No anomalies detected. Standard record-keeping applies.";

  const helperConnected =
    affinity?.lastHeartbeat != null && Date.now() - affinity.lastHeartbeat < 8000;

  const timeline = (eventList ?? []).map((ev) => ({
    ts: new Date(ev.ts).toISOString(),
    event: ev.type,
    detail: ev.detail ?? {},
  }));

  const anomalyEvents = timeline.filter((e) =>
    [
      "BULK_PASTE",
      "FOCUS_LOSS",
      "ABNORMAL_WPM_SPIKE",
      "LONG_IDLE_GAP",
      "CAPTURE_EXCLUDED_WINDOW",
      "RISK_ESCALATED",
    ].includes(e.event)
  );
  const summary =
    anomalyEvents.length > 0
      ? `${anomalyEvents.length} anomalous event(s) detected: ${anomalyEvents.map((e) => e.event).join(", ")}.`
      : "No significant anomalies detected during the session.";

  return {
    report_id: `rep_${crypto.randomBytes(6).toString("hex")}`,
    session_id: id,
    exam_id: examId,
    student_id_hash: studentIdHash,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
    duration_minutes,
    final_risk_level: riskLevel,
    final_risk_score: riskScore,
    privacy_mode: "metadata_only",
    audit_chain_valid: !!auditChainValid,
    helper_connected: helperConnected,
    device_integrity: buildDeviceIntegritySection(daemon),
    summary,
    recommendation,
    timeline,
  };
}

function buildDeviceIntegritySection(daemon) {
  const state = daemon ?? {};
  const anomaly =
    state.daemon_state === "untrusted" ||
    state.daemon_state === "risk_detected" ||
    state.scanner_state === "scanner_unavailable" ||
    state.scanner_state === "permission_denied" ||
    state.scanner_state === "scan_error" ||
    (state.proofs_rejected ?? 0) > 0 ||
    (state.capture_excluded_window_count_max ?? 0) > 0 ||
    (state.capture_restricted_window_count_max ?? 0) > 0 ||
    (state.monitor_only_window_count_max ?? 0) > 0;
  return {
    daemon_required: state.daemon_required ?? true,
    daemon_final_state: state.daemon_state ?? "missing",
    platform: state.platform ?? "unknown",
    node_id_hash: state.node_id_hash ?? null,
    daemon_version: state.daemon_version ?? null,
    scanner_final_state: state.scanner_state ?? "unknown",
    scanner_version: state.scanner_version ?? null,
    proofs_verified: state.proofs_verified ?? 0,
    scanner_scans_verified: state.scanner_scans_verified ?? 0,
    proofs_rejected: state.proofs_rejected ?? 0,
    stale_periods: state.stale_periods ?? 0,
    capture_excluded_window_count_max: state.capture_excluded_window_count_max ?? 0,
    capture_restricted_window_count_max: state.capture_restricted_window_count_max ?? 0,
    monitor_only_window_count_max: state.monitor_only_window_count_max ?? 0,
    scanner_error_count: state.scanner_error_count ?? 0,
    permission_denied_count: state.permission_denied_count ?? 0,
    manual_review_recommendation: anomaly
      ? "Manual review recommended. No automatic misconduct finding."
      : "No device-integrity anomaly detected.",
  };
}
