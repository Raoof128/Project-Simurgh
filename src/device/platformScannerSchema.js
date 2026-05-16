// Shared platform/scanner schema. Lifts validateScannerFields out of
// src/device/daemonProof.js so both the proof validator and any future
// scanner-only consumers share one truth.

export const SUPPORTED_DEVICE_PLATFORMS = Object.freeze(["macos", "windows"]);
export const PLANNED_DEVICE_PLATFORMS = Object.freeze(["linux"]);

export const SCANNER_STATES = new Set([
  "healthy",
  "risk_detected",
  "restricted_detected",
  "scanner_unavailable",
  "permission_denied",
  "scan_error",
  "unsupported_macos_version",
]);

const SCANNER_VERSION_BY_PLATFORM = Object.freeze({
  macos: "2.5.0",
  windows: "2.6.0",
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
