// SPDX-License-Identifier: AGPL-3.0-or-later
// Denial-of-wallet guards for live calls (OWASP LLM10). Owns its own SIMURGH_LIVE_*
// env names so the sealed gatewayRateLimit module is untouched. Per-session counters
// live on the gateway session record; the daily counter is process-wide.
// Call caps accept zero (a "0" cap means "never call" — used by the no-network
// rate-limit smoke); time/size caps must be strictly positive.
const nonneg = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
const positive = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

let dailyCount = 0;
let dailyWindowStart = 0;
const DAY_MS = 24 * 60 * 60 * 1000;

export function liveLimits(env = process.env) {
  return {
    maxCallsPerSession: nonneg(env.SIMURGH_LIVE_MAX_CALLS_PER_SESSION, 20),
    maxCallsPerMinute: nonneg(env.SIMURGH_LIVE_MAX_CALLS_PER_MINUTE, 5),
    maxDailyCalls: nonneg(env.SIMURGH_LIVE_MAX_DAILY_CALLS, 200),
    timeoutMs: positive(env.SIMURGH_LIVE_TIMEOUT_MS, 20000),
    maxInputChars: positive(env.SIMURGH_LIVE_MAX_INPUT_CHARS, 4000),
    maxOutputChars: positive(env.SIMURGH_LIVE_MAX_OUTPUT_CHARS, 4000),
    maxContextChars: positive(env.SIMURGH_LIVE_MAX_CONTEXT_CHARS, 8000),
    promptCacheEnabled: env.SIMURGH_LIVE_PROMPT_CACHE_ENABLED === "true",
  };
}

export function createLiveLedger() {
  return { perSession: 0, minuteWindowStart: 0, minuteCount: 0 };
}

export function checkLiveCall(ledger, limits, now) {
  if (now - dailyWindowStart >= DAY_MS) {
    dailyWindowStart = now;
    dailyCount = 0;
  }
  if (ledger.perSession >= limits.maxCallsPerSession)
    return { ok: false, reason: "gateway_live_session_limit" };
  const inWindow = now - ledger.minuteWindowStart < 60_000;
  const minuteCount = inWindow ? ledger.minuteCount : 0;
  if (minuteCount >= limits.maxCallsPerMinute)
    return { ok: false, reason: "gateway_live_rate_limit" };
  if (dailyCount >= limits.maxDailyCalls)
    return { ok: false, reason: "gateway_live_daily_limit" };
  return { ok: true };
}

export function recordLiveCall(ledger, now) {
  if (now - dailyWindowStart >= DAY_MS) {
    dailyWindowStart = now;
    dailyCount = 0;
  }
  ledger.perSession += 1;
  if (now - ledger.minuteWindowStart < 60_000) {
    ledger.minuteCount += 1;
  } else {
    ledger.minuteWindowStart = now;
    ledger.minuteCount = 1;
  }
  dailyCount += 1;
}

export function __resetDailyForTest() {
  dailyCount = 0;
  dailyWindowStart = 0;
}
