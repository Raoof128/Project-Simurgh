import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { callMockProvider } from "../../../src/llmShield/mockLlmProvider.js";

describe("mockLlmProvider", () => {
  test("returns deterministic output for the same task_type", () => {
    const a = callMockProvider({ task_type: "summarise" });
    const b = callMockProvider({ task_type: "summarise" });
    assert.deepEqual(a, b);
  });

  test("labels the provider as deterministic_mock", () => {
    assert.equal(callMockProvider({ task_type: "summarise" }).provider, "deterministic_mock");
  });

  test("output does not echo raw input", () => {
    const out = callMockProvider({ task_type: "summarise", input: "SECRET_TOKEN_XYZ" });
    assert.ok(!JSON.stringify(out).includes("SECRET_TOKEN_XYZ"));
  });

  test("output varies by task_type", () => {
    assert.notEqual(
      callMockProvider({ task_type: "summarise" }).output,
      callMockProvider({ task_type: "translate" }).output
    );
  });
});
