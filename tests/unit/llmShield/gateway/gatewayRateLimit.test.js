import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  gatewayLimits,
  checkInputCaps,
} from "../../../../src/llmShield/gateway/gatewayRateLimit.js";

describe("gatewayRateLimit", () => {
  test("defaults present", () => {
    const l = gatewayLimits({});
    assert.equal(l.maxInputChars, 4000);
    assert.equal(l.maxContextChars, 16000);
    assert.equal(l.timeoutMs, 20000);
  });
  test("input over cap rejected", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 5000, contextChars: 0 }, l), {
      ok: false,
      reason: "gateway_input_too_large",
    });
  });
  test("context over cap rejected", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 10, contextChars: 20000 }, l), {
      ok: false,
      reason: "gateway_context_too_large",
    });
  });
  test("within caps ok", () => {
    const l = gatewayLimits({});
    assert.deepEqual(checkInputCaps({ inputChars: 10, contextChars: 10 }, l), { ok: true });
  });
});
