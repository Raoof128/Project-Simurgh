// SPDX-License-Identifier: AGPL-3.0-or-later
// Invention-layer validators: signed novelty source map (§6.6), constitution
// projection (§6.8), reviewer note (§1.4). Pure, no I/O.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { domainDigest } from "./digest.mjs";
import { DOMAINS, SCHEMAS, ENUMS } from "../constants.mjs";

const ok = () => ({ ok: true });
const bad = (detail) => ({ ok: false, detail });

export function validateSourceMap(m) {
  if (!m || !Array.isArray(m.rows)) return bad("rows_missing");
  if (m.rows.length !== 7) return bad("row_count_not_seven");
  for (const r of m.rows) {
    if (
      typeof r.prior_art !== "string" ||
      typeof r.what_it_orders !== "string" ||
      typeof r.what_it_does_not !== "string"
    )
      return bad("row_shape_invalid");
  }
  if (typeof m.falsification_rule !== "string" || m.falsification_rule.length === 0)
    return bad("falsification_rule_missing");
  return ok();
}

export function validateConstitutionProjection(p) {
  if (!p || !Array.isArray(p.rows)) return bad("rows_missing");
  const kinds = p.rows.map((r) => r.boundary_kind).sort();
  const want = [...ENUMS.boundary_kind].sort();
  if (kinds.length !== want.length || !kinds.every((k, i) => k === want[i]))
    return bad("boundary_kind_coverage_incomplete");
  for (const r of p.rows) {
    if (typeof r.clause !== "string" || typeof r.machine_check !== "string")
      return bad("row_shape_invalid");
  }
  return ok();
}

export function validateReviewerNote(n) {
  if (!n || typeof n.status_sentence !== "string") return bad("status_sentence_missing");
  if (!n.status_sentence.includes("not itself a compliance claim"))
    return bad("status_sentence_wrong");
  if (typeof n.carries_non_claim !== "string") return bad("carries_non_claim_missing");
  return ok();
}

export const sourceMapDigest = (m) => domainDigest(DOMAINS.SOURCE_MAP, SCHEMAS.ATTESTATION, m);
export const constitutionProjectionDigest = (p) =>
  domainDigest(DOMAINS.CONSTITUTION_PROJECTION, SCHEMAS.ATTESTATION, p);
export const reviewerNoteDigest = (n) =>
  domainDigest(DOMAINS.REVIEWER_NOTE, SCHEMAS.ATTESTATION, n);
