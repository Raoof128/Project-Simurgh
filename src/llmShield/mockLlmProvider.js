// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic local provider: no network, no clock, no randomness. Output is a
// function of task_type only and never echoes raw input, so the safe path proves
// the spine end-to-end without any live-model or privacy risk.

export function callMockProvider({ task_type } = {}) {
  const type = typeof task_type === "string" && task_type.length > 0 ? task_type : "unknown";
  return {
    provider: "deterministic_mock",
    output: `Deterministic mock response for task_type="${type}". No live model was called.`,
  };
}
