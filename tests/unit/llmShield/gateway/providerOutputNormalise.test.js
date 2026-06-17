import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normaliseProviderOutput } from "../../../../src/llmShield/gateway/providerOutputNormalise.js";

describe("providerOutputNormalise", () => {
  test("text output normalises to kind text", () => {
    const r = normaliseProviderOutput({
      provider_response_kind: "text",
      output_text: "hi",
      tool_request: null,
    });
    assert.deepEqual(r, { kind: "text", text: "hi", toolRequest: null });
  });
  test("tool_request preserved; text coerced to string", () => {
    const r = normaliseProviderOutput({
      provider_response_kind: "tool_request",
      output_text: 5,
      tool_request: { tool_class: "shell_command" },
    });
    assert.equal(r.kind, "tool_request");
    assert.equal(r.text, "5");
    assert.deepEqual(r.toolRequest, { tool_class: "shell_command" });
  });
  test("unknown kind falls back to text (fail-safe, never throws)", () => {
    const r = normaliseProviderOutput({
      provider_response_kind: "weird",
      output_text: "x",
      tool_request: null,
    });
    assert.equal(r.kind, "text");
  });
  test("missing fields normalise to empty text, null tool", () => {
    const r = normaliseProviderOutput({});
    assert.deepEqual(r, { kind: "text", text: "", toolRequest: null });
  });
});
