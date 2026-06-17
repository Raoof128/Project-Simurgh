// SPDX-License-Identifier: AGPL-3.0-or-later
// Denial-of-wallet guards (OWASP LLM10). Char/timeout caps are active in core;
// live-call limits are parsed for forward-compat but inert (no live calls in core).
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export function gatewayLimits(env = process.env) {
  return {
    maxInputChars: num(env.SIMURGH_GATEWAY_MAX_INPUT_CHARS, 4000),
    maxContextChars: num(env.SIMURGH_GATEWAY_MAX_CONTEXT_CHARS, 16000),
    maxOutputChars: num(env.SIMURGH_GATEWAY_MAX_OUTPUT_CHARS, 8000),
    timeoutMs: num(env.SIMURGH_GATEWAY_TIMEOUT_MS, 20000),
    maxLiveCallsPerSession: num(env.SIMURGH_GATEWAY_MAX_LIVE_CALLS_PER_SESSION, 20),
    maxLiveCallsPerMinute: num(env.SIMURGH_GATEWAY_MAX_LIVE_CALLS_PER_MINUTE, 5),
    maxDailyLiveCalls: num(env.SIMURGH_GATEWAY_MAX_DAILY_LIVE_CALLS, 200),
  };
}

export function checkInputCaps({ inputChars, contextChars }, limits) {
  if (inputChars > limits.maxInputChars) return { ok: false, reason: "gateway_input_too_large" };
  if (contextChars > limits.maxContextChars)
    return { ok: false, reason: "gateway_context_too_large" };
  return { ok: true };
}
