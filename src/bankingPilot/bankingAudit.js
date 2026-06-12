export const BANKING_PILOT_EVENTS = Object.freeze({
  CONSENT_ACCEPTED: "BANKING_CONSENT_ACCEPTED",
  STARTED: "BANKING_SESSION_STARTED",
  SCENARIO_SUBMITTED: "BANKING_SCENARIO_SUBMITTED",
  FORBIDDEN_FIELD_REJECTED: "BANKING_FORBIDDEN_FIELD_REJECTED",
  UNKNOWN_FIELD_REJECTED: "BANKING_UNKNOWN_FIELD_REJECTED",
  WITHDRAWN: "BANKING_SESSION_WITHDRAWN",
  REPORT_EXPORTED: "BANKING_REPORT_EXPORTED",
  AUDIT_EXPORTED: "BANKING_AUDIT_EXPORTED",
  VERIFY_EXPORTED: "BANKING_VERIFY_EXPORTED",
  AI_EXPLANATION_EXPORTED: "BANKING_AI_EXPLANATION_EXPORTED",
});

export function buildRejectedAttemptAuditPayload({ route, reason, fieldName }) {
  return {
    route,
    reason,
    field_name: fieldName,
  };
}

export function sanitiseAuditEntry(entry) {
  return {
    seq: entry.seq,
    ts: entry.ts,
    type: entry.type,
    payload: entry.payload,
    prev: entry.prev,
    sig: entry.sig,
  };
}
