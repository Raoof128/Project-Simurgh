// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normaliseAnthropicResponse } from "../../../../src/llmShield/gateway/anthropicResponseNormalise.js";

describe("normaliseAnthropicResponse", () => {
  test("text blocks joined; kind text", () => {
    const r = normaliseAnthropicResponse({
      content: [
        { type: "text", text: "Hello" },
        { type: "text", text: "world" },
      ],
      stop_reason: "end_turn",
    });
    assert.equal(r.provider_response_kind, "text");
    assert.equal(r.output_text, "Hello\nworld");
    assert.equal(r.provider, "anthropic");
    assert.equal(r.network_egress_used, true);
    assert.equal(r.tool_request, null);
  });
  test("tool_use block -> sanitized tool_request, args hashed not stored", () => {
    const r = normaliseAnthropicResponse({
      content: [{ type: "tool_use", name: "run_shell", input: { cmd: "rm -rf /" } }],
      stop_reason: "tool_use",
    });
    assert.equal(r.provider_response_kind, "tool_request");
    assert.equal(r.tool_request.tool_name, "run_shell");
    assert.match(r.tool_request.args_hash, /^sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(r).includes("rm -rf"), false);
  });
  test("empty content -> error", () => {
    const r = normaliseAnthropicResponse({ content: [] });
    assert.equal(r.provider_response_kind, "error");
    assert.equal(r.error_code, "gateway_provider_empty_response");
  });
  test("refusal stop_reason -> refusal kind, text preserved for firewall", () => {
    const r = normaliseAnthropicResponse({
      content: [{ type: "text", text: "I can't help with that." }],
      stop_reason: "refusal",
    });
    assert.equal(r.provider_response_kind, "refusal");
    assert.equal(r.output_text, "I can't help with that.");
  });
});
