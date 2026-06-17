// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3D tool-invocation gate. Evaluates a scenario's tool request against the
// declarative tool policy and decides allow/block. It NEVER executes a tool
// (toolCalled is always false). Tool name is hashed; raw args never leave here.
import { hashPrompt } from "./promptNormalise.js";
import { classifyTool } from "./toolPolicy.js";

export function gateToolRequest(toolRequest) {
  if (!toolRequest || typeof toolRequest !== "object") {
    return {
      verdict: "not_requested",
      reasonCodes: ["tool_not_requested"],
      toolNameHash: null,
      toolCalled: false,
    };
  }
  const toolNameHash = hashPrompt(String(toolRequest.tool_name ?? ""));
  const { verdict, reasonCode } = classifyTool(toolRequest.tool_class);
  if (verdict === "allow") {
    return { verdict: "allowed", reasonCodes: [reasonCode], toolNameHash, toolCalled: false };
  }
  return { verdict: "blocked", reasonCodes: [reasonCode], toolNameHash, toolCalled: false };
}
