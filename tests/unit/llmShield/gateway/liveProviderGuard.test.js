// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateLiveProvider } from "../../../../src/llmShield/gateway/liveProviderGuard.js";

const base = {
  SIMURGH_LIVE_PROVIDER_ENABLED: "true",
  SIMURGH_LLM_PROVIDER: "anthropic",
  SIMURGH_LIVE_PROVIDER_MODEL: "claude-x",
  ANTHROPIC_API_KEY: "sk-test",
};

describe("evaluateLiveProvider", () => {
  test("fully configured passes; config carries no secret", () => {
    const r = evaluateLiveProvider(base);
    assert.equal(r.ok, true);
    assert.deepEqual(r.config, {
      provider: "anthropic",
      model: "claude-x",
      contextMode: "minimal_summary",
      apiKeyPresent: true,
    });
    assert.ok(!("apiKey" in r.config));
  });
  test("disabled fails closed", () => {
    const r = evaluateLiveProvider({ ...base, SIMURGH_LIVE_PROVIDER_ENABLED: "false" });
    assert.deepEqual(r, { ok: false, reason: "gateway_live_provider_disabled" });
  });
  test("non-anthropic provider fails closed", () => {
    const r = evaluateLiveProvider({ ...base, SIMURGH_LLM_PROVIDER: "openai" });
    assert.deepEqual(r, { ok: false, reason: "gateway_provider_not_allowed" });
  });
  test("missing model fails closed", () => {
    const r = evaluateLiveProvider({ ...base, SIMURGH_LIVE_PROVIDER_MODEL: "" });
    assert.deepEqual(r, { ok: false, reason: "gateway_provider_model_missing" });
  });
  test("missing key fails closed", () => {
    const r = evaluateLiveProvider({ ...base, ANTHROPIC_API_KEY: "" });
    assert.deepEqual(r, { ok: false, reason: "gateway_provider_key_missing" });
  });
  test("invalid context mode rejected", () => {
    const r = evaluateLiveProvider({ ...base, SIMURGH_LIVE_CONTEXT_MODE: "raw" });
    assert.deepEqual(r, { ok: false, reason: "gateway_live_context_mode_invalid" });
  });
});
