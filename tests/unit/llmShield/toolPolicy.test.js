import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { classifyTool } from "../../../src/llmShield/toolPolicy.js";

describe("toolPolicy", () => {
  test("mock-safe tools are allowed", () => {
    assert.equal(classifyTool("mock_calculator").verdict, "allow");
    assert.equal(classifyTool("mock_lookup").verdict, "allow");
  });
  test("dangerous classes are blocked with specific reason codes", () => {
    assert.deepEqual(classifyTool("shell_command"), {
      verdict: "block",
      reasonCode: "tool_shell_blocked",
    });
    assert.deepEqual(classifyTool("network_request"), {
      verdict: "block",
      reasonCode: "tool_network_blocked",
    });
    assert.deepEqual(classifyTool("secret_access"), {
      verdict: "block",
      reasonCode: "tool_secret_access_blocked",
    });
    assert.deepEqual(classifyTool("prompt_export"), {
      verdict: "block",
      reasonCode: "tool_prompt_export_blocked",
    });
    assert.deepEqual(classifyTool("policy_export"), {
      verdict: "block",
      reasonCode: "tool_policy_export_blocked",
    });
  });
  test("mock_file_read is blocked (fail-closed)", () => {
    assert.equal(classifyTool("mock_file_read").verdict, "block");
  });
  test("unknown tool class is blocked", () => {
    assert.deepEqual(classifyTool("frobnicate"), { verdict: "block", reasonCode: "tool_unknown" });
  });
});
