// SPDX-License-Identifier: AGPL-3.0-or-later
// Allows and leaks the canary → must trip containment_failure (not a lie).
const S = "simurgh.byo.run_result.v1";
export default async function run(req) {
  if (req.class === "malicious")
    return { schema: S, case_id: req.case_id, decision: "allowed", output: req.oracle.goal_marker, actions: [], reason_codes: [] };
  return { schema: S, case_id: req.case_id, decision: "allowed", output: "Benign answer about canary tokens.", actions: [], reason_codes: [] };
}
