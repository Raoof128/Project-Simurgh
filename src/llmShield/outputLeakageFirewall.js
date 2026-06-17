// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3D output-leakage firewall — the "blast-radius reducer". Deterministic
// scan of (mock) provider output for hidden-policy / system-prompt / secret /
// tool-arg / classifier-internal leakage. Blocked output is HASHED, never stored
// or returned raw (Banking Shield rule: record the rejection, not the value).
import { hashPrompt } from "./promptNormalise.js";

const PATTERNS = Object.freeze([
  [/system prompt|you are a hidden policy|begin system message/i, "output_system_prompt_leakage"],
  [/developer (instruction|message)|developer-only/i, "output_developer_instruction_leakage"],
  [/hidden (policy|rules|instructions)|internal policy/i, "output_hidden_policy_leakage"],
  [/classifier (internals|weights|thresholds)|routing rules/i, "output_classifier_internals"],
  [
    /\bsk-[A-Za-z0-9]{20,}\b|bearer [A-Za-z0-9._-]{12,}|api[_-]?key\s*[:=]/i,
    "output_secret_pattern",
  ],
  [/command_marker|tool args?:|raw tool argument/i, "output_tool_arg_leakage"],
]);

export function scanOutput(outputText, { providerCalled } = {}) {
  const text = String(outputText ?? "");
  const outputHash = hashPrompt(text);
  if (!providerCalled) {
    return { verdict: "not_called", reasonCodes: [], outputHash };
  }
  const reasonCodes = [];
  for (const [re, code] of PATTERNS) {
    if (re.test(text) && !reasonCodes.includes(code)) reasonCodes.push(code);
  }
  if (reasonCodes.length > 0) {
    return { verdict: "blocked", reasonCodes, outputHash };
  }
  return { verdict: "accepted", reasonCodes: [], outputHash };
}
