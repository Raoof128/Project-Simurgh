import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { gateToolRequest } from "../../../src/llmShield/toolInvocationGate.js";

describe("toolInvocationGate", () => {
  test("no request -> not_requested, never called", () => {
    const r = gateToolRequest(null);
    assert.equal(r.verdict, "not_requested");
    assert.equal(r.toolCalled, false);
    assert.deepEqual(r.reasonCodes, ["tool_not_requested"]);
    assert.equal(r.toolNameHash, null);
  });
  test("allowed mock tool -> allowed, hashed name, not executed", () => {
    const r = gateToolRequest({ tool_name: "calc", tool_class: "mock_calculator", args: {} });
    assert.equal(r.verdict, "allowed");
    assert.equal(r.toolCalled, false);
    assert.match(r.toolNameHash, /^sha256:/);
  });
  test("dangerous tool -> blocked before execution", () => {
    const r = gateToolRequest({
      tool_name: "sh",
      tool_class: "shell_command",
      args: { command_marker: "x" },
    });
    assert.equal(r.verdict, "blocked");
    assert.equal(r.toolCalled, false);
    assert.ok(r.reasonCodes.includes("tool_shell_blocked"));
  });
  test("unknown tool -> blocked", () => {
    const r = gateToolRequest({ tool_name: "z", tool_class: "frobnicate", args: {} });
    assert.equal(r.verdict, "blocked");
    assert.ok(r.reasonCodes.includes("tool_unknown"));
  });
});
