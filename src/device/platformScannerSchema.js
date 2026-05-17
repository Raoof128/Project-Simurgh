// Shared platform/scanner schema. Lifts validateScannerFields out of
// src/device/daemonProof.js so both the proof validator and any future
// scanner-only consumers share one truth.

export const SUPPORTED_DEVICE_PLATFORMS = Object.freeze(["macos", "windows", "linux"]);
export const PLANNED_DEVICE_PLATFORMS = Object.freeze([]);

export const SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "restricted_detected",
  "scanner_unavailable",
  "permission_denied",
  "scan_error",
  "unsupported_macos_version",
]);

export const LINUX_SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "restricted_detected",
  "wayland_portal_available",
  "wayland_compositor_restricted",
  "wayland_compositor_unsupported",
  "xwayland_detected",
  "permission_denied",
  "scanner_unavailable",
  "scan_error",
]);

export const LINUX_SCANNER_REASONS = new Set([
  "none",
  "no_display_server",
  "non_local_display",
  "portal_not_active",
  "portal_active_probe_unavailable",
  "sandboxed_browser_loopback_possible",
]);

export const LINUX_DISPLAY_SERVERS = new Set([
  "x11",
  "wayland",
  "xwayland",
  "headless",
  "unknown",
]);

export const LINUX_COVERAGES = new Set([
  "x11_full",
  "wayland_limited",
  "xwayland_partial",
  "headless_none",
  "unknown",
]);

const CLEAN_LINUX_SCANNER_STATES = new Set(["healthy", "risk_detected"]);

const SCANNER_VERSION_BY_PLATFORM = Object.freeze({
  macos: "2.5.0",
  windows: "2.6.0",
  linux: "2.8.0",
});

const FINGERPRINT_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function fail(reason) {
  return { ok: false, reason };
}

function isNonNegativeInt(value, max = 100_000) {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

export function isSupportedPlatform(platform) {
  return typeof platform === "string" && SUPPORTED_DEVICE_PLATFORMS.includes(platform);
}

export function getExpectedScannerVersion(platform) {
  return SCANNER_VERSION_BY_PLATFORM[platform] ?? null;
}

export function getPlatformScannerDefaults(platform) {
  return Object.freeze({
    platform,
    scanner_state: "healthy",
    scanner_version: SCANNER_VERSION_BY_PLATFORM[platform] ?? null,
    scan_timestamp: null,
    scan_duration_ms: null,
    scan_error_count: 0,
    suspicious_window_count: 0,
    visible_window_count: 0,
    capture_excluded_window_count: 0,
    capture_restricted_window_count: 0,
    monitor_only_window_count: 0,
    privacy_mode: "metadata_only",
    window_fingerprint_hashes: [],
  });
}

// Verbatim port of validateScannerFields(raw) from src/device/daemonProof.js.
// Behaviour MUST be identical; every fail() reason code preserved.
export function validateScannerSummary(raw) {
  const scannerKeys = [
    "scanner_state",
    "scanner_version",
    "scan_timestamp",
    "scan_duration_ms",
    "scan_error_count",
    "suspicious_window_count",
    "visible_window_count",
    "capture_restricted_window_count",
    "monitor_only_window_count",
    "privacy_mode",
    "window_fingerprint_hashes",
  ];
  const hasScannerFields = scannerKeys.some((key) => key in raw);
  if (!hasScannerFields) {
    return {
      ok: true,
      fields: {
        scanner_state: raw.capture_excluded_window_count > 0 ? "risk_detected" : "healthy",
        scanner_version: null,
        scan_timestamp: null,
        scan_duration_ms: null,
        scan_error_count: 0,
        suspicious_window_count: raw.capture_excluded_window_count,
        visible_window_count: null,
        capture_restricted_window_count: 0,
        monitor_only_window_count: 0,
        privacy_mode: "metadata_only",
        window_fingerprint_hashes: [],
      },
    };
  }
  if (typeof raw.scanner_state !== "string" || !SCANNER_STATES.has(raw.scanner_state)) {
    return fail("invalid_scanner_state");
  }
  const expectedScannerVersion = getExpectedScannerVersion(raw.platform);
  if (typeof raw.scanner_version !== "string" || raw.scanner_version !== expectedScannerVersion) {
    return fail("invalid_scanner_version");
  }
  const scanTs = Date.parse(raw.scan_timestamp);
  if (typeof raw.scan_timestamp !== "string" || !Number.isFinite(scanTs)) {
    return fail("invalid_scan_timestamp");
  }
  if (!isNonNegativeInt(raw.scan_duration_ms, 60_000)) {
    return fail("invalid_scan_duration_ms");
  }
  if (!isNonNegativeInt(raw.scan_error_count, 256)) return fail("invalid_scan_error_count");
  if (!isNonNegativeInt(raw.suspicious_window_count, 256)) {
    return fail("invalid_suspicious_window_count");
  }
  if (!isNonNegativeInt(raw.visible_window_count, 10_000)) {
    return fail("invalid_visible_window_count");
  }
  const captureRestrictedWindowCount = raw.capture_restricted_window_count ?? 0;
  const monitorOnlyWindowCount = raw.monitor_only_window_count ?? 0;
  if (!isNonNegativeInt(captureRestrictedWindowCount, 256)) {
    return fail("invalid_capture_restricted_window_count");
  }
  if (!isNonNegativeInt(monitorOnlyWindowCount, 256)) {
    return fail("invalid_monitor_only_window_count");
  }
  if (raw.privacy_mode !== "metadata_only") return fail("invalid_privacy_mode");
  if (!Array.isArray(raw.window_fingerprint_hashes) || raw.window_fingerprint_hashes.length > 256) {
    return fail("invalid_window_fingerprint_hashes");
  }
  for (const hash of raw.window_fingerprint_hashes) {
    if (typeof hash !== "string" || !FINGERPRINT_HASH_PATTERN.test(hash)) {
      return fail("invalid_window_fingerprint_hashes");
    }
  }
  if (raw.suspicious_window_count < raw.capture_excluded_window_count + monitorOnlyWindowCount) {
    return fail("invalid_suspicious_window_count");
  }
  return {
    ok: true,
    fields: {
      scanner_state: raw.scanner_state,
      scanner_version: raw.scanner_version,
      scan_timestamp: raw.scan_timestamp,
      scan_duration_ms: raw.scan_duration_ms,
      scan_error_count: raw.scan_error_count,
      suspicious_window_count: raw.suspicious_window_count,
      visible_window_count: raw.visible_window_count,
      capture_restricted_window_count: captureRestrictedWindowCount,
      monitor_only_window_count: monitorOnlyWindowCount,
      privacy_mode: raw.privacy_mode,
      window_fingerprint_hashes: [...raw.window_fingerprint_hashes],
    },
  };
}

export function validateLinuxScannerSummary(raw) {
  if (typeof raw.scanner_state !== "string" || !LINUX_SCANNER_STATES.has(raw.scanner_state)) {
    return fail("invalid_linux_scanner_state");
  }
  if (raw.scanner_version !== "2.8.0") return fail("invalid_linux_scanner_version");
  if (typeof raw.display_server !== "string" || !LINUX_DISPLAY_SERVERS.has(raw.display_server)) {
    return fail("invalid_linux_display_server");
  }
  if (typeof raw.coverage !== "string" || !LINUX_COVERAGES.has(raw.coverage)) {
    return fail("invalid_linux_coverage");
  }
  if (typeof raw.scanner_reason !== "string" || !LINUX_SCANNER_REASONS.has(raw.scanner_reason)) {
    return fail("invalid_linux_scanner_reason");
  }
  if (CLEAN_LINUX_SCANNER_STATES.has(raw.scanner_state) && raw.scanner_reason !== "none") {
    return fail("invalid_linux_scanner_reason");
  }
  if (typeof raw.portal_advertised !== "boolean" && raw.portal_advertised !== null) {
    return fail("invalid_linux_portal_state");
  }
  if (typeof raw.portal_active !== "boolean" && raw.portal_active !== null) {
    return fail("invalid_linux_portal_state");
  }
  if (raw.portal_active === true && raw.portal_advertised !== true) {
    return fail("invalid_linux_portal_state");
  }
  for (const key of [
    "x11_managed_window_count",
    "x11_override_redirect_window_count",
    "x11_above_window_count",
    "x11_fullscreen_window_count",
    "x11_skip_taskbar_window_count",
    "xwayland_window_count",
  ]) {
    const v = raw[key];
    if (!Number.isInteger(v) || v < 0 || v > 10_000) return fail("invalid_linux_x11_count");
  }
  if (raw.privacy_mode !== "metadata_only") return fail("invalid_privacy_mode");
  return {
    ok: true,
    fields: {
      scanner_state: raw.scanner_state,
      scanner_version: raw.scanner_version,
      display_server: raw.display_server,
      coverage: raw.coverage,
      scanner_reason: raw.scanner_reason,
      portal_advertised: raw.portal_advertised,
      portal_active: raw.portal_active,
      x11_managed_window_count: raw.x11_managed_window_count,
      x11_override_redirect_window_count: raw.x11_override_redirect_window_count,
      x11_above_window_count: raw.x11_above_window_count,
      x11_fullscreen_window_count: raw.x11_fullscreen_window_count,
      x11_skip_taskbar_window_count: raw.x11_skip_taskbar_window_count,
      xwayland_window_count: raw.xwayland_window_count,
      privacy_mode: raw.privacy_mode,
    },
  };
}

export function validateScannerSummaryForPlatform(platform, raw) {
  if (platform === "macos" || platform === "windows") return validateScannerSummary(raw);
  if (platform === "linux") return validateLinuxScannerSummary(raw);
  return fail("unsupported_platform");
}
