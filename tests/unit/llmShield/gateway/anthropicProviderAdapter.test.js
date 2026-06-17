// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateAnthropicOutput } from "../../../../src/llmShield/gateway/anthropicProviderAdapter.js";
import { liveLimits } from "../../../../src/llmShield/gateway/liveCallLedger.js";

const limits = liveLimits({ SIMURGH_LIVE_MAX_OUTPUT_CHARS: "10" });

function fakeClient(response) {
  return { messages: { create: async () => response } };
}

describe("generateAnthropicOutput", () => {
  test("uses injected client; never sends tools; carries hashes", async () => {
    let sent = null;
    const factory = () => ({
      messages: {
        create: async (req) => {
          sent = req;
          return { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: {} };
        },
      },
    });
    const r = await generateAnthropicOutput({
      model: "claude-x",
      safeInput: "hi",
      providerSafeContext: { _text: "" },
      apiKey: "sk",
      limits,
      __clientFactory: factory,
    });
    assert.equal(r.provider_response_kind, "text");
    assert.equal(r.output_text, "ok");
    assert.ok(!("tools" in sent));
    assert.match(r.provider_model_hash, /^sha256:[a-f0-9]{64}$/);
  });

  test("truncates output to maxOutputChars", async () => {
    const factory = () =>
      fakeClient({
        content: [{ type: "text", text: "x".repeat(50) }],
        stop_reason: "end_turn",
        usage: {},
      });
    const r = await generateAnthropicOutput({
      model: "claude-x",
      safeInput: "hi",
      providerSafeContext: { _text: "" },
      apiKey: "sk",
      limits,
      __clientFactory: factory,
    });
    assert.equal(r.output_text.length, 10);
  });

  test("provider error -> error kind, metadata only", async () => {
    const factory = () => ({
      messages: {
        create: async () => {
          throw new Error("boom");
        },
      },
    });
    const r = await generateAnthropicOutput({
      model: "claude-x",
      safeInput: "hi",
      providerSafeContext: { _text: "" },
      apiKey: "sk",
      limits,
      __clientFactory: factory,
    });
    assert.equal(r.provider_response_kind, "error");
    assert.equal(r.error_code, "gateway_provider_error");
    assert.equal(JSON.stringify(r).includes("boom"), false);
  });

  test("internal timeout aborts and maps to gateway_live_timeout", async () => {
    // Fake client that never resolves until the abort signal fires.
    const factory = () => ({
      messages: {
        create: (_req, opts) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      },
    });
    const tinyLimits = liveLimits({
      SIMURGH_LIVE_TIMEOUT_MS: "10",
      SIMURGH_LIVE_MAX_OUTPUT_CHARS: "10",
    });
    const r = await generateAnthropicOutput({
      model: "claude-x",
      safeInput: "hi",
      providerSafeContext: { _text: "" },
      apiKey: "sk",
      limits: tinyLimits,
      __clientFactory: factory,
    });
    assert.equal(r.provider_response_kind, "error");
    assert.equal(r.error_code, "gateway_live_timeout");
    assert.equal(r.latency_bucket, "timeout");
  });
});
