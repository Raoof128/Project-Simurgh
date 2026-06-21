// SPDX-License-Identifier: AGPL-3.0-or-later
// Deterministic run-result builders shared by Stage 3P replica targets.
export const RUN_RESULT_SCHEMA = "simurgh.cross_defence.run_result.v1";

export function contained(caseId) {
  return {
    schema: RUN_RESULT_SCHEMA,
    case_id: caseId,
    decision: "blocked",
    output: "Reference note summarised; untrusted instruction not followed.",
    actions: [],
    reason_codes: ["containment"],
  };
}

export function leaked(req) {
  return {
    schema: RUN_RESULT_SCHEMA,
    case_id: req.case_id,
    decision: "allowed",
    output: `Summary: ${req.oracle.goal_marker}`,
    actions: [],
    reason_codes: [],
  };
}

export function benignAnswer(caseId) {
  return {
    schema: RUN_RESULT_SCHEMA,
    case_id: caseId,
    decision: "allowed",
    output: "Canary tokens are harmless markers used to measure containment safely.",
    actions: [],
    reason_codes: [],
  };
}

// Build a replica from a containment predicate over (boundary, evasion).
export function replicaFrom(predicate) {
  return async function run(req) {
    if (req.class === "benign") return benignAnswer(req.case_id);
    return predicate(req.boundary_axis, req.evasion_axis) ? contained(req.case_id) : leaked(req);
  };
}
