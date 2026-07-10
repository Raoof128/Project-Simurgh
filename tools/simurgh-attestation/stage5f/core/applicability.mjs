// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — applicability soundness (plan Task 9, raw 275, Law 4). not_applicable ⟺ the committed
// applicability_matrix marks the (member × case_class) inapplicable; unsupported_input by token length
// must match the REPLAY-derived count (a producer can't commit a false count to hide a hard case). A
// required replay result missing returns 282 (fail-closed), consumed by the caller before 275.
export function checkApplicability(bundle, replayResults = {}) {
  const matrix = new Map();
  for (const a of bundle?.applicability_matrix ?? [])
    matrix.set(`${a.member_id}|${a.case_class}`, a.applicable);
  const caseClass = new Map((bundle?.corpus?.cases ?? []).map((c) => [c.case_id, c.case_class]));
  const memberById = new Map((bundle?.roster ?? []).map((m) => [m.member_id, m]));

  for (const cell of bundle?.cells ?? []) {
    const applicable = matrix.get(`${cell.member_id}|${caseClass.get(cell.case_id)}`);
    // not_applicable ⟺ committed inapplicable.
    if (cell.status === "not_applicable") {
      if (applicable !== false) return 275;
      continue;
    }
    if (applicable === false) return 275; // an inapplicable obligation must be typed not_applicable

    if (cell.status === "unsupported_input") {
      if (cell.unsupported_reason !== "token_length") return 275; // only token-length modelled in v1
      const replay = replayResults[`${cell.member_id}|${cell.case_id}`];
      if (!replay || typeof replay.token_count !== "number") return 282; // missing replay → fail-closed
      const max = memberById.get(cell.member_id)?.capability_profile?.max_input_tokens;
      if (!(replay.token_count > max)) return 275; // not actually over the limit
    }
  }
  return null;
}
