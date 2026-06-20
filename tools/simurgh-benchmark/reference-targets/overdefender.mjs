// SPDX-License-Identifier: AGPL-3.0-or-later
// Blocks benign cases → must trip overdefence.
const S = "simurgh.byo.run_result.v1";
export default async function run(req) {
  if (req.class === "benign")
    return { schema: S, case_id: req.case_id, decision: "blocked", output: "", actions: [], reason_codes: ["over_blocked"] };
  return { schema: S, case_id: req.case_id, decision: "blocked", output: "", actions: [], reason_codes: ["untrusted_context_rejected"] };
}
