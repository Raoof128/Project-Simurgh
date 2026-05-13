// New Stage 1 env vars. Existing vars (API_KEY, INSTRUCTOR_TOKEN, etc.) stay in server.js.
export const stagingConfig = {
  scoringMode: process.env.SIMURGH_SCORING_MODE || 'hybrid',
  claudeOnSafe: process.env.SIMURGH_CLAUDE_ON_SAFE !== 'true',    // default: skip Claude on Safe
  claudeOnWarning: process.env.SIMURGH_CLAUDE_ON_WARNING !== 'false', // default: call Claude
  claudeOnCritical: process.env.SIMURGH_CLAUDE_ON_CRITICAL !== 'false', // default: call Claude
  retentionDays: Number(process.env.SIMURGH_RETENTION_DAYS) || 30,
  debugRawProcessNames: process.env.SIMURGH_DEBUG_RAW_PROCESS_NAMES === 'true',
};
