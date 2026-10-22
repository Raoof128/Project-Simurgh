// SPDX-License-Identifier: AGPL-3.0-or-later
import { gateToolRequest } from "../../src/llmShield/toolInvocationGate.js";
import { digest } from "./corpus.mjs";
// Never derive tool_class or permissions from model-generated content.
const REGISTRY = new Map([
  ["lookup_record", { toolClass: "mock_lookup", keys: ["resource"] }],
  ["send_report", { toolClass: "network_request", keys: ["resource", "destination"] }],
]);
function record(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const own = Reflect.ownKeys(value);
  return (
    own.length === keys.length &&
    own.every(
      (k) =>
        typeof k === "string" &&
        keys.includes(k) &&
        Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), "value")
    )
  );
}
export function createSandbox() {
  return { effects: { reads: [], outbox: [] }, seen: new Set() };
}
// The bypass control intentionally omits authorization but still uses local tools.
// It cannot perform network, filesystem, subprocess, or credential operations.
export function executeProposal(proposal, { scenario, sandbox, mode = "enforced" }) {
  const blocked = (reason) => ({ status: "blocked", reason });
  if (!["enforced", "bypass", "deny_all"].includes(mode)) throw new Error("Unknown boundary mode");
  if (mode === "deny_all") return blocked("deny_all_control");
  if (!record(proposal, ["name", "arguments"]) || typeof proposal.name !== "string")
    return blocked("invalid_proposal");
  const tool = REGISTRY.get(proposal.name);
  if (!tool) return blocked("unknown_tool");
  if (
    !record(proposal.arguments, tool.keys) ||
    tool.keys.some(
      (k) =>
        typeof proposal.arguments[k] !== "string" ||
        proposal.arguments[k].length === 0 ||
        proposal.arguments[k].length > 128
    )
  )
    return blocked("invalid_arguments");
  const replayKey = digest({ runId: scenario.policy.runId, proposal });
  if (sandbox.seen.has(replayKey)) return blocked("replay");
  sandbox.seen.add(replayKey);
  if (mode === "enforced") {
    const policy = scenario.policy;
    if (!policy.allowedTools.includes(proposal.name)) return blocked("tool_not_authorized");
    if (proposal.arguments.resource !== policy.resource) return blocked("resource_not_authorized");
    if (proposal.name === "send_report" && proposal.arguments.destination !== policy.destination)
      return blocked("destination_not_authorized");
    if (policy.approvalRequired) {
      const approval = scenario.approval;
      if (
        !approval ||
        approval.runId !== policy.runId ||
        approval.name !== proposal.name ||
        approval.argumentsHash !== digest(proposal.arguments)
      )
        return blocked("approval_not_bound");
    }
    const gate = gateToolRequest({ tool_name: proposal.name, tool_class: tool.toolClass });
    if (gate.verdict !== "allowed") return blocked("legacy_gate_blocked");
  }
  if (proposal.arguments.resource === "unavailable")
    return { status: "execution_error", reason: "synthetic_service_unavailable" };
  if (!["public", "private"].includes(proposal.arguments.resource))
    return { status: "execution_error", reason: "record_not_found" };
  if (proposal.name === "lookup_record") sandbox.effects.reads.push(proposal.arguments.resource);
  else sandbox.effects.outbox.push({ ...proposal.arguments });
  return { status: "executed", reason: mode === "bypass" ? "bypass_control" : "authorized" };
}
