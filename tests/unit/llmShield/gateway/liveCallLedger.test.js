// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  liveLimits,
  createLiveLedger,
  checkLiveCall,
  recordLiveCall,
  __resetDailyForTest,
} from "../../../../src/llmShield/gateway/liveCallLedger.js";

describe("liveCallLedger", () => {
  beforeEach(() => __resetDailyForTest());

  test("liveLimits reads env with defaults", () => {
    const l = liveLimits({ SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "2" });
    assert.equal(l.maxCallsPerSession, 2);
    assert.equal(l.maxCallsPerMinute, 5);
    assert.equal(l.timeoutMs, 20000);
    assert.equal(l.maxContextChars, 8000);
    assert.equal(l.promptCacheEnabled, false);
  });

  test("session cap blocks after limit", () => {
    const limits = liveLimits({ SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "1" });
    const led = createLiveLedger();
    const now = 1_000_000;
    assert.equal(checkLiveCall(led, limits, now).ok, true);
    recordLiveCall(led, now);
    assert.deepEqual(checkLiveCall(led, limits, now), {
      ok: false,
      reason: "gateway_live_session_limit",
    });
  });

  test("zero session cap blocks the first call (no-network smoke)", () => {
    const limits = liveLimits({ SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "0" });
    assert.equal(limits.maxCallsPerSession, 0);
    assert.deepEqual(checkLiveCall(createLiveLedger(), limits, 0), {
      ok: false,
      reason: "gateway_live_session_limit",
    });
  });

  test("per-minute cap blocks within window, resets after 60s", () => {
    const limits = liveLimits({
      SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "100",
      SIMURGH_LIVE_MAX_CALLS_PER_MINUTE: "1",
    });
    const led = createLiveLedger();
    recordLiveCall(led, 0);
    assert.equal(checkLiveCall(led, limits, 1000).reason, "gateway_live_rate_limit");
    assert.equal(checkLiveCall(led, limits, 61_000).ok, true);
  });

  test("daily cap is process-wide", () => {
    const limits = liveLimits({
      SIMURGH_LIVE_MAX_CALLS_PER_SESSION: "100",
      SIMURGH_LIVE_MAX_CALLS_PER_MINUTE: "100",
      SIMURGH_LIVE_MAX_DAILY_CALLS: "1",
    });
    const a = createLiveLedger();
    const b = createLiveLedger();
    recordLiveCall(a, 0);
    assert.deepEqual(checkLiveCall(b, limits, 0), {
      ok: false,
      reason: "gateway_live_daily_limit",
    });
  });
});
