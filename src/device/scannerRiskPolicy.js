// Shared risk policy mapping daemon/scanner state → risk numeric + manual-
// review wording. Verbatim port of the current behaviour in
//   src/device/daemonState.js:scoreDaemonRisk
//   src/academic/riskScoring.js (recommendation wording)
//   src/academic/reportBuilder.js (device_integrity wording)

const DAEMON_STATES = Object.freeze({
  RISK_DETECTED: "risk_detected",
  UNTRUSTED: "untrusted",
  UNPAIRED: "unpaired",
  STALE: "stale",
  MISSING: "missing",
});

export function mapScannerSummaryToRisk(record) {
  const state = record?.daemon_state ?? DAEMON_STATES.MISSING;
  const maxExcluded = record?.capture_excluded_window_count_max ?? 0;
  const maxRestricted = record?.capture_restricted_window_count_max ?? 0;
  const maxMonitorOnly = record?.monitor_only_window_count_max ?? 0;
  if (maxExcluded > 0 || state === DAEMON_STATES.RISK_DETECTED) {
    return { daemon_risk: 100, forceCritical: true };
  }
  if (maxRestricted > 0 || maxMonitorOnly > 0 || record?.scanner_state === "restricted_detected") {
    return { daemon_risk: 40, forceCritical: false };
  }
  if (
    record?.scanner_state === "scanner_unavailable" ||
    record?.scanner_state === "permission_denied" ||
    record?.scanner_state === "scan_error"
  ) {
    return { daemon_risk: 40, forceCritical: false };
  }
  const x11Above = record?.x11_above_window_count_max ?? 0;
  const x11Override = record?.x11_override_redirect_window_count_max ?? 0;
  if (x11Above > 0 || x11Override > 0) {
    return { daemon_risk: 40, forceCritical: false };
  }
  if (
    record?.scanner_state === "wayland_compositor_restricted" ||
    record?.scanner_state === "wayland_compositor_unsupported" ||
    record?.scanner_state === "xwayland_detected" ||
    record?.coverage === "wayland_limited" ||
    record?.coverage === "xwayland_partial"
  ) {
    return { daemon_risk: 40, forceCritical: false };
  }
  if (state === DAEMON_STATES.UNTRUSTED) return { daemon_risk: 50, forceCritical: false };
  if (state === DAEMON_STATES.UNPAIRED) return { daemon_risk: 25, forceCritical: false };
  if (state === DAEMON_STATES.STALE) return { daemon_risk: 20, forceCritical: false };
  if (state === DAEMON_STATES.MISSING) return { daemon_risk: 15, forceCritical: false };
  return { daemon_risk: 0, forceCritical: false };
}

export function getManualReviewReason(riskLevel, { context = "session" } = {}) {
  if (context === "device_integrity") {
    return riskLevel === "Safe"
      ? "No device-integrity anomaly detected."
      : "Manual review recommended. No automatic misconduct finding.";
  }
  if (riskLevel === "Critical") {
    return "Manual review required. No automatic misconduct finding.";
  }
  if (riskLevel === "Warning") {
    return "Manual review recommended. No automatic misconduct finding.";
  }
  return "No anomalies detected.";
}
