// SPDX-License-Identifier: AGPL-3.0-or-later
// Declarative Stage 3D tool policy. Mock tools only; everything dangerous and
// everything unknown is blocked (fail-closed). The gate evaluates against this
// table and NEVER executes a tool. mock_file_read is blocked by default: Stage 3D
// does not read files, it only evaluates whether the request crosses the boundary.

export const TOOL_VERDICTS = Object.freeze({
  mock_calculator: { verdict: "allow", reasonCode: "tool_allowed_mock_only" },
  mock_lookup: { verdict: "allow", reasonCode: "tool_allowed_mock_only" },
  mock_file_read: { verdict: "block", reasonCode: "tool_file_read_blocked" },
  network_request: { verdict: "block", reasonCode: "tool_network_blocked" },
  shell_command: { verdict: "block", reasonCode: "tool_shell_blocked" },
  secret_access: { verdict: "block", reasonCode: "tool_secret_access_blocked" },
  policy_export: { verdict: "block", reasonCode: "tool_policy_export_blocked" },
  prompt_export: { verdict: "block", reasonCode: "tool_prompt_export_blocked" },
  credential_request: { verdict: "block", reasonCode: "tool_secret_access_blocked" },
});

export function classifyTool(toolClass) {
  const entry = TOOL_VERDICTS[toolClass];
  if (!entry) return { verdict: "block", reasonCode: "tool_unknown" };
  return { verdict: entry.verdict, reasonCode: entry.reasonCode };
}
