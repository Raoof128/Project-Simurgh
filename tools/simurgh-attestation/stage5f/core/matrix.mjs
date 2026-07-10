// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — cell matrix (273, Law 1) + status tagged-union (274). Exactly one cell per
// (member × case); each status carries exactly its required fields and none of its forbidden ones.
const ERROR_REASONS = new Set(["unexpected_categorical_output", "runtime_error", "input_rejected"]);

// 273: bijection cells ≃ roster × corpus (exactly one typed cell per obligation).
export function checkMatrix(bundle) {
  const roster = bundle?.roster ?? [];
  const cases = bundle?.corpus?.cases ?? [];
  const cells = bundle?.cells ?? [];
  if (cells.length !== roster.length * cases.length) return 273;
  const seen = new Set();
  const members = new Set(roster.map((m) => m.member_id));
  const caseIds = new Set(cases.map((c) => c.case_id));
  for (const cell of cells) {
    if (!members.has(cell.member_id) || !caseIds.has(cell.case_id)) return 273;
    const key = `${cell.member_id}|${cell.case_id}`;
    if (seen.has(key)) return 273;
    seen.add(key);
  }
  return null;
}

const has = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);

// 274: only `evaluated` carries a verdict; `capture_failed` carries a bounded error + input binding and
// no verdict; every attempted-capture status binds the detector input; no free-text errors.
export function checkStatusUnion(bundle) {
  for (const cell of bundle?.cells ?? []) {
    const s = cell.status;
    const inputBound =
      typeof cell.detector_input_digest === "string" &&
      typeof cell.shared_input_digest === "string";
    switch (s) {
      case "evaluated":
        if (!cell.decision_evidence || !inputBound || typeof cell.record_id !== "string")
          return 274;
        if (has(cell, "error_reason")) return 274;
        break;
      case "capture_failed":
        if (has(cell, "decision_evidence")) return 274;
        if (
          !ERROR_REASONS.has(cell.error_reason) ||
          !inputBound ||
          typeof cell.record_id !== "string"
        )
          return 274;
        break;
      case "unsupported_input":
        if (has(cell, "decision_evidence")) return 274;
        if (typeof cell.capability_ref !== "string") return 274;
        break;
      case "not_applicable":
        if (has(cell, "decision_evidence")) return 274;
        if (typeof cell.applicability_ref !== "string") return 274;
        break;
      case "missing_capture":
        if (has(cell, "decision_evidence")) return 274;
        if (typeof cell.missing_reason !== "string") return 274;
        break;
      default:
        return 274;
    }
  }
  return null;
}
