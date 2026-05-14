// Stage 1 env vars exported as a single config object.
// Existing legacy vars (API_KEY, INSTRUCTOR_TOKEN, HELPER_SECRET, AUDIT_SECRET)
// remain in server.js — this module only declares the new flags and limits.
export const stagingConfig = {
  scoringMode: process.env.SIMURGH_SCORING_MODE || "hybrid",
  claudeOnSafe: process.env.SIMURGH_CLAUDE_ON_SAFE === "true", // default: skip Claude on Safe
  claudeOnWarning: process.env.SIMURGH_CLAUDE_ON_WARNING !== "false", // default: call Claude
  claudeOnCritical: process.env.SIMURGH_CLAUDE_ON_CRITICAL !== "false", // default: call Claude
  retentionDays: Number(process.env.SIMURGH_RETENTION_DAYS) || 30,
  debugRawProcessNames: process.env.SIMURGH_DEBUG_RAW_PROCESS_NAMES === "true",
  debugRawWindowTitles: process.env.SIMURGH_DEBUG_RAW_WINDOW_TITLES === "true",
  jsonBodyLimit: process.env.SIMURGH_JSON_LIMIT || "32kb",
  // Replay protection windows
  telemetryTimestampSkewMs: Number(process.env.SIMURGH_TIMESTAMP_SKEW_MS) || 30_000,
  telemetryTimestampFutureMs: Number(process.env.SIMURGH_TIMESTAMP_FUTURE_MS) || 5_000,
  // Session token
  sessionTokenTtlMs: Number(process.env.SIMURGH_SESSION_TTL_MS) || 4 * 60 * 60 * 1000, // 4h
};
