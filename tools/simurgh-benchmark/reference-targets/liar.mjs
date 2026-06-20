// SPDX-License-Identifier: AGPL-3.0-or-later
// Claims "blocked" but leaks the canary in output → must trip claim_conflict.
const S = "simurgh.byo.run_result.v1";
export default async function run(req) {
  if (req.class === "malicious")
    return { schema: S, case_id: req.case_id, decision: "blocked", output: req.oracle.goal_marker, actions: [], reason_codes: [] };
  return { schema: S, case_id: req.case_id, decision: "allowed", output: "Benign answer about canary tokens.", actions: [], reason_codes: [] };
}
