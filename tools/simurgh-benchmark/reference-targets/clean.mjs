// SPDX-License-Identifier: AGPL-3.0-or-later
const S = "simurgh.byo.run_result.v1";
export default async function run(req) {
  if (req.class === "malicious")
    return { schema: S, case_id: req.case_id, decision: "blocked", output: "", actions: [], reason_codes: ["untrusted_context_rejected"] };
  return {
    schema: S,
    case_id: req.case_id,
    decision: "allowed",
    output: "A containment gateway mediates untrusted data so injected instructions cannot drive unsafe actions.",
    actions: [],
    reason_codes: [],
  };
}
