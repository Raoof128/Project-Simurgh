// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — claimCore: claim-table digest, span resolution, and INTERNAL precommit
// validity (raw 202, "No Post-Hoc Claim Table"). Plan Task 3. Motto: AnthropicSafe First,
// then ReviewerSafe.
//
// Scope discipline (re-gauntlet fix): this module owns 202 = SEMANTIC precommit validity
// only. Cross-artifact digest BINDING (narrative_digest / declaration_digest recompute)
// lives in bindingCore (201, runs BEFORE 202). Structural key allowlisting (a forbidden
// `map_digest` field) lives in vncCore.checkSchema (199). By the time this runs, 201 has
// confirmed narrative identity, so span resolution is against the verified narrative.
import { recordDigest } from "../../stage4m/core/canonical.mjs";
import { bodyBytes, isCodePointBoundary } from "../../stage4w/core/textCore.mjs";
import { VNC_SCOPE_RULE, VNC_ELIGIBLE_SPAN_TYPE } from "../constants.mjs";

const fail = (reason, detail = {}) => ({ raw: 202, reason, detail });

// Digest of record: over the WHOLE outer table object (content + signature +
// author_pub_key_pem), so a re-sign or key-swap changes it — 201 catches that.
export const claimTableDigest = (table) => recordDigest(table);

// Resolve a claim's span_ref against the narrative's span_map. Returns the matched span
// (carrying `type`) or null. A match requires the same span_id AND the same byte
// coordinates AND valid code-point boundaries within the body — anything else is
// "unresolvable" (a malformed claim table, → 202; NOT an `unreadable` verdict, reviewer MF3).
export function resolveSpan(narrative, spanRef) {
  const content = narrative && narrative.content;
  if (!content || typeof content.narrative_body !== "string") return null;
  if (!spanRef || typeof spanRef.span_id !== "string") return null;
  const span = (content.span_map ?? []).find((s) => s.span_id === spanRef.span_id);
  if (!span) return null;
  if (span.start_byte !== spanRef.start_byte || span.end_byte !== spanRef.end_byte) return null;
  const bytes = bodyBytes(content.narrative_body);
  if (!Number.isInteger(spanRef.start_byte) || !Number.isInteger(spanRef.end_byte)) return null;
  if (spanRef.end_byte <= spanRef.start_byte || spanRef.end_byte > bytes.length) return null;
  if (
    !isCodePointBoundary(bytes, spanRef.start_byte) ||
    !isCodePointBoundary(bytes, spanRef.end_byte)
  )
    return null;
  return span;
}

// checkClaimTable(table, narrative) → {raw:202} | null. INTERNAL precommit validity only.
export function checkClaimTable(table, narrative) {
  const content = table && table.content;
  if (!content) return fail("scope_rule_not_all_cells"); // shape guard; schema (199) is authoritative
  if (content.scope_rule_id !== VNC_SCOPE_RULE) return fail("scope_rule_not_all_cells");
  const seen = new Set();
  for (const claim of content.claims ?? []) {
    if (!Array.isArray(claim.token_ids) || claim.token_ids.length === 0)
      return fail("token_ids_empty", { claim_id: claim.claim_id });
    if (seen.has(claim.claim_id)) return fail("claim_id_duplicate", { claim_id: claim.claim_id });
    seen.add(claim.claim_id);
    const span = resolveSpan(narrative, claim.span_ref);
    if (!span) return fail("span_unresolvable", { claim_id: claim.claim_id });
    if (span.type !== VNC_ELIGIBLE_SPAN_TYPE)
      return fail("span_type_not_unverified_prose", { claim_id: claim.claim_id, type: span.type });
  }
  return null;
}
