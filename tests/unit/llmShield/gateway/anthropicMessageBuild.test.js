// SPDX-License-Identifier: AGPL-3.0-or-later
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildProviderSafeContext,
  buildAnthropicMessageRequest,
} from "../../../../src/llmShield/gateway/anthropicMessageBuild.js";

describe("buildProviderSafeContext", () => {
  test("none mode produces empty block", () => {
    const r = buildProviderSafeContext([{ content: "x" }], { contextMode: "none" });
    assert.equal(r.context_count, 0);
    assert.equal(r._text, "");
  });
  test("minimal_summary caps each summary to 500 chars", () => {
    const long = "a".repeat(2000);
    const r = buildProviderSafeContext([{ content: long, source_type: "retrieval" }], {
      contextMode: "minimal_summary",
    });
    assert.equal(r.context_count, 1);
    assert.equal(r.context_summaries[0].summary.length, 500);
    assert.equal(r.context_hashes.length, 1);
  });
  test("total provider context text capped to 2KB", () => {
    const ctxs = Array.from({ length: 10 }, () => ({ content: "b".repeat(500) }));
    const r = buildProviderSafeContext(ctxs, { contextMode: "minimal_summary" });
    assert.ok(r._text.length <= 2048);
  });
});

describe("buildAnthropicMessageRequest", () => {
  test("no tools, no tool_choice, no cache_control by default", () => {
    const { request } = buildAnthropicMessageRequest({
      model: "claude-x",
      safeInput: "hello",
      providerSafeContext: { _text: "" },
    });
    assert.ok(!("tools" in request));
    assert.ok(!("tool_choice" in request));
    assert.equal(JSON.stringify(request).includes("cache_control"), false);
    assert.equal(request.model, "claude-x");
    assert.equal(request.max_tokens, 1024);
    assert.equal(request.temperature, 0);
    assert.equal(request.messages[0].role, "user");
  });
  test("returns shape + model hashes (no raw)", () => {
    const r = buildAnthropicMessageRequest({
      model: "claude-x",
      safeInput: "hi",
      providerSafeContext: { _text: "" },
    });
    assert.match(r.modelHash, /^sha256:[a-f0-9]{64}$/);
    assert.match(r.requestShapeHash, /^sha256:[a-f0-9]{64}$/);
  });
});
