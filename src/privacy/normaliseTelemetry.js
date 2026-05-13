import { privacyConfig } from "./privacyConfig.js";

// Fields that must never appear in stored or processed telemetry.
const FORBIDDEN_FIELDS = new Set([
  "paste_content",
  "typed_content",
  "screen_data",
  "webcam_frame",
  "audio_data",
  "biometric_data",
  "student_name",
  "raw_identity",
]);

// Fields explicitly allowed by the privacy config.
const ALLOWED_FIELDS = new Set([
  "keystrokes",
  "chars_typed",
  "effective_wpm",
  "focus_losses",
  "time_off_window_ms",
  "pastes",
  "paste_payload_chars",
  "max_idle_gap_ms",
  "window_seconds",
  "key_intervals",
]);

export function normaliseTelemetry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const out = {};

  for (const [k, v] of Object.entries(raw)) {
    if (FORBIDDEN_FIELDS.has(k)) continue; // hard strip
    if (!ALLOWED_FIELDS.has(k)) continue; // strict allowlist
    out[k] = v;
  }

  // Cap key_intervals to prevent oversized payloads.
  if (Array.isArray(out.key_intervals)) {
    out.key_intervals = out.key_intervals.slice(0, privacyConfig.maxKeyIntervalsStored);
  }

  out._privacy_mode = "metadata_only";
  return out;
}
