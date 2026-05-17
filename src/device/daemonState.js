import { mapScannerSummaryToRisk } from "./scannerRiskPolicy.js";

export const DAEMON_STATES = Object.freeze({
  NOT_REQUIRED: "not_required",
  MISSING: "missing",
  UNPAIRED: "unpaired",
  PAIRED: "paired",
  HEALTHY: "healthy",
  STALE: "stale",
  UNTRUSTED: "untrusted",
  RISK_DETECTED: "risk_detected",
  ENDED: "ended",
});

function baseRecord(now) {
  return {
    daemon_required: true,
    daemon_state: DAEMON_STATES.MISSING,
    helper_state: "unknown",
    node_id_hash: null,
    daemon_version: null,
    platform: "unknown",
    paired_at: null,
    last_proof_at: null,
    proof_timestamp: null,
    proof_age_ms: null,
    proofs_verified: 0,
    proofs_rejected: 0,
    stale_periods: 0,
    capture_excluded_window_count: 0,
    capture_excluded_window_count_max: 0,
    capture_restricted_window_count: 0,
    capture_restricted_window_count_max: 0,
    monitor_only_window_count: 0,
    monitor_only_window_count_max: 0,
    scanner_state: "unknown",
    scanner_version: null,
    scanner_scans_verified: 0,
    scanner_error_count: 0,
    permission_denied_count: 0,
    visible_window_count: 0,
    suspicious_window_count: 0,
    scan_duration_ms: null,
    last_scan_at: null,
    signature_valid: null,
    challenge_id_hash: null,
    updated_at: now,
  };
}

export function summariseDaemonState(record, now = Date.now(), { staleAfterMs = 10_000 } = {}) {
  const summary = { ...(record ?? baseRecord(now)) };
  if (
    summary.daemon_state === DAEMON_STATES.HEALTHY &&
    summary.last_proof_at !== null &&
    now - summary.last_proof_at > staleAfterMs
  ) {
    summary.daemon_state = DAEMON_STATES.STALE;
    summary.proof_age_ms = now - summary.last_proof_at;
  } else if (summary.last_proof_at !== null) {
    summary.proof_age_ms = now - summary.last_proof_at;
  }
  return summary;
}

export function scoreDaemonRisk(record) {
  return mapScannerSummaryToRisk(record);
}

export function createDaemonStateRegistry({ staleAfterMs = 10_000 } = {}) {
  const records = new Map();

  function ensure(sessionId, now = Date.now()) {
    if (!records.has(sessionId)) records.set(sessionId, baseRecord(now));
    return records.get(sessionId);
  }

  return {
    recordMissing(sessionId, { now = Date.now() } = {}) {
      const record = ensure(sessionId, now);
      record.daemon_state = DAEMON_STATES.MISSING;
      record.updated_at = now;
      return record;
    },

    recordPaired(
      sessionId,
      { node_id_hash, public_key, daemon_version, platform = "macos", now = Date.now() }
    ) {
      const record = ensure(sessionId, now);
      record.daemon_state = DAEMON_STATES.PAIRED;
      record.node_id_hash = node_id_hash;
      record.public_key = public_key;
      record.daemon_version = daemon_version;
      record.platform = platform;
      record.paired_at = now;
      record.updated_at = now;
      return record;
    },

    recordProofVerified(
      sessionId,
      {
        sequence,
        platform = "macos",
        capture_excluded_window_count,
        capture_restricted_window_count = 0,
        monitor_only_window_count = 0,
        helper_state,
        scanner_state = capture_excluded_window_count > 0 ? "risk_detected" : "healthy",
        scanner_version = null,
        scan_timestamp = null,
        scan_duration_ms = null,
        scan_error_count = 0,
        suspicious_window_count = capture_excluded_window_count,
        visible_window_count = 0,
        timestamp,
        challenge_id_hash = null,
        now = Date.now(),
      }
    ) {
      const record = ensure(sessionId, now);
      record.daemon_state =
        capture_excluded_window_count > 0 ? DAEMON_STATES.RISK_DETECTED : DAEMON_STATES.HEALTHY;
      record.platform = platform;
      record.helper_state = helper_state;
      record.scanner_state = scanner_state;
      record.scanner_version = scanner_version;
      record.scan_duration_ms = scan_duration_ms;
      record.scanner_error_count += scan_error_count;
      if (scanner_state === "permission_denied") record.permission_denied_count += 1;
      record.visible_window_count = visible_window_count;
      record.suspicious_window_count = suspicious_window_count;
      record.last_scan_at = scan_timestamp;
      record.scanner_scans_verified += 1;
      record.last_sequence = sequence;
      record.last_proof_at = now;
      record.proof_timestamp = timestamp;
      record.capture_excluded_window_count = capture_excluded_window_count;
      record.capture_excluded_window_count_max = Math.max(
        record.capture_excluded_window_count_max,
        capture_excluded_window_count
      );
      record.capture_restricted_window_count = capture_restricted_window_count;
      record.capture_restricted_window_count_max = Math.max(
        record.capture_restricted_window_count_max,
        capture_restricted_window_count
      );
      record.monitor_only_window_count = monitor_only_window_count;
      record.monitor_only_window_count_max = Math.max(
        record.monitor_only_window_count_max,
        monitor_only_window_count
      );
      record.signature_valid = true;
      record.challenge_id_hash = challenge_id_hash;
      record.proofs_verified += 1;
      record.updated_at = now;
      return record;
    },

    recordRejected(sessionId, { reason, now = Date.now() } = {}) {
      const record = ensure(sessionId, now);
      record.daemon_state = DAEMON_STATES.UNTRUSTED;
      record.signature_valid = false;
      record.last_reject_reason = reason;
      record.proofs_rejected += 1;
      record.updated_at = now;
      return record;
    },

    recordEnded(sessionId, { now = Date.now() } = {}) {
      const record = ensure(sessionId, now);
      record.daemon_state = DAEMON_STATES.ENDED;
      record.updated_at = now;
      return record;
    },

    get(sessionId, now = Date.now()) {
      return summariseDaemonState(records.get(sessionId), now, { staleAfterMs });
    },

    evict(sessionId) {
      records.delete(sessionId);
    },

    evictMissing(activeIds) {
      for (const sessionId of records.keys()) {
        if (!activeIds.has(sessionId)) records.delete(sessionId);
      }
    },
  };
}
