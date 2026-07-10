// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC audit census (raw 297). Pure recomputation, NO neural forward pass. Verifies the
// capture-census bijection + exact corpus coverage, and that the census digest is bound by the attestation.
import { CODES } from "../constants.mjs";
import { domainDigest } from "./digests.mjs";
import { DOMAIN } from "../constants.mjs";

export function checkCensus(bundle, ctx) {
  const census = ctx.auditCensus;
  if (!census) return CODES.VFC_AUDIT_CENSUS_MISMATCH;
  if (domainDigest(DOMAIN.capture_census, census) !== bundle.capture_census_digest) {
    return CODES.VFC_AUDIT_CENSUS_MISMATCH;
  }
  const cells = bundle.capture.cells.map((c) => c.case_id);
  const terminals = census.terminal_records ?? [];
  const termCases = terminals.map((t) => t.case_id);
  if (new Set(termCases).size !== termCases.length) return CODES.VFC_AUDIT_CENSUS_MISMATCH; // dup terminal
  if (new Set(termCases).size !== new Set(cells).size) return CODES.VFC_AUDIT_CENSUS_MISMATCH;
  for (const c of cells) if (!termCases.includes(c)) return CODES.VFC_AUDIT_CENSUS_MISMATCH; // omission
  const termIds = new Set(terminals.map((t) => t.record_id));
  for (const a of census.attempt_records ?? []) {
    if (!termIds.has(a.terminal_ref)) return CODES.VFC_AUDIT_CENSUS_MISMATCH; // dangling attempt
  }
  return null;
}
