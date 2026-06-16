// SPDX-License-Identifier: AGPL-3.0-or-later
import { containsForbiddenLocalFieldDeep } from "./forbiddenLocalFields.js";

export const DAEMON_EVENTS = Object.freeze({
  DAEMON_DISCOVERED: "DAEMON_DISCOVERED",
  DAEMON_MISSING: "DAEMON_MISSING",
  DAEMON_PAIRING_CHALLENGE_ISSUED: "DAEMON_PAIRING_CHALLENGE_ISSUED",
  DAEMON_PAIRED: "DAEMON_PAIRED",
  DAEMON_SESSION_STARTED: "DAEMON_SESSION_STARTED",
  DAEMON_PROOF_VERIFIED: "DAEMON_PROOF_VERIFIED",
  DAEMON_PROOF_REJECTED: "DAEMON_PROOF_REJECTED",
  DAEMON_STALE: "DAEMON_STALE",
  DAEMON_UNTRUSTED: "DAEMON_UNTRUSTED",
  DAEMON_SESSION_ENDED: "DAEMON_SESSION_ENDED",
  DEVICE_RISK_ESCALATED: "DEVICE_RISK_ESCALATED",
  SCANNER_SCAN_COMPLETED: "SCANNER_SCAN_COMPLETED",
  SCANNER_RISK_DETECTED: "SCANNER_RISK_DETECTED",
  SCANNER_PERMISSION_DENIED: "SCANNER_PERMISSION_DENIED",
  SCANNER_UNAVAILABLE: "SCANNER_UNAVAILABLE",
  SCANNER_PRIVACY_REJECTED: "SCANNER_PRIVACY_REJECTED",
  SCANNER_ERROR: "SCANNER_ERROR",
});

export function buildDaemonProofRejectedEvent({
  session_id,
  reason,
  locked_display_server = null,
  observed_display_server = null,
}) {
  const event = {
    type: DAEMON_EVENTS.DAEMON_PROOF_REJECTED,
    session_id,
    reason,
  };
  if (locked_display_server !== null) event.locked_display_server = locked_display_server;
  if (observed_display_server !== null) event.observed_display_server = observed_display_server;
  if (containsForbiddenLocalFieldDeep(event)) {
    throw new Error("daemon_event_emits_forbidden_local_field");
  }
  return event;
}
