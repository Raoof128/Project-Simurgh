// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — adapter binding (plan Task 10, raw 276, Law 2). For every ATTEMPTED-capture cell
// (evaluated AND capture_failed) the detector_input_digest must equal the offline replay result, and
// the cell's adapter/tokenizer/truncation digests must equal the roster member's. Pure — consumes the
// replay result; a missing required replay returns 282 (fail-closed, consumed by the caller).
const ATTEMPTED = new Set(["evaluated", "capture_failed"]);

export function checkAdapter(bundle, replayResults = {}) {
  const memberById = new Map((bundle?.roster ?? []).map((m) => [m.member_id, m]));
  for (const cell of bundle?.cells ?? []) {
    if (!ATTEMPTED.has(cell.status)) continue;
    const replay = replayResults[`${cell.member_id}|${cell.case_id}`];
    if (!replay || typeof replay.detector_input_digest !== "string") return 282;
    if (cell.detector_input_digest !== replay.detector_input_digest) return 276;
    const m = memberById.get(cell.member_id);
    if (
      !m ||
      cell.adapter_digest !== m.adapter_digest ||
      cell.tokenizer_manifest_digest !== m.tokenizer_manifest_digest ||
      cell.truncation_policy_digest !== m.truncation_policy_digest
    ) {
      return 276;
    }
  }
  return null;
}
