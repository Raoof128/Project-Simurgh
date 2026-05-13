import crypto from 'node:crypto';

export function buildReport(sessionRecord, sessionData, eventList, auditChainValid) {
  const { id, examId, studentIdHash, startedAt, submittedAt, createdAt } = sessionRecord;
  const { latest, affinity } = sessionData;

  const durationMs = submittedAt
    ? submittedAt - (startedAt ?? createdAt)
    : Date.now() - (startedAt ?? createdAt);
  const duration_minutes = Math.round(durationMs / 60000);

  const riskLevel = latest?.risk_level ?? 'Safe';
  const riskScore = latest?.risk_score ?? 0;

  const recommendation =
    riskLevel === 'Critical' ? 'Manual review required. No automatic misconduct finding.' :
    riskLevel === 'Warning'  ? 'Manual review recommended. No automatic misconduct finding.' :
    'No anomalies detected. Standard record-keeping applies.';

  const helperConnected = affinity?.lastHeartbeat != null &&
    (Date.now() - affinity.lastHeartbeat) < 8000;

  const timeline = (eventList ?? []).map(ev => ({
    ts: new Date(ev.ts).toISOString(),
    event: ev.type,
    detail: ev.detail ?? {},
  }));

  const anomalyEvents = timeline.filter(e =>
    ['BULK_PASTE', 'FOCUS_LOSS', 'ABNORMAL_WPM_SPIKE', 'LONG_IDLE_GAP',
     'CAPTURE_EXCLUDED_WINDOW', 'RISK_ESCALATED'].includes(e.event)
  );
  const summary = anomalyEvents.length > 0
    ? `${anomalyEvents.length} anomalous event(s) detected: ${anomalyEvents.map(e => e.event).join(', ')}.`
    : 'No significant anomalies detected during the session.';

  return {
    report_id: `rep_${crypto.randomBytes(6).toString('hex')}`,
    session_id: id,
    exam_id: examId,
    student_id_hash: studentIdHash,
    started_at: startedAt ? new Date(startedAt).toISOString() : null,
    submitted_at: submittedAt ? new Date(submittedAt).toISOString() : null,
    duration_minutes,
    final_risk_level: riskLevel,
    final_risk_score: riskScore,
    privacy_mode: 'metadata_only',
    audit_chain_valid: !!auditChainValid,
    helper_connected: helperConnected,
    summary,
    recommendation,
    timeline,
  };
}
