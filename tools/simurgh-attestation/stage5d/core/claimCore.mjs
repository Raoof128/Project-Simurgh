// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — claim-integrity + provenance + audit-log checks (plan Task 8). Motto: AnthropicSafe
// First, then ReviewerSafe. 250 BYO, 251 Lane-C provenance consistency, 252 PUBLIC anti-overclaim
// (denylist OR unreviewed exact-claim), 253 AUDIT-ONLY audit-private omission.
import { createHash } from "node:crypto";
import { applyRecipe } from "./recipes.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { VARL_OVERCLAIM_DENYLIST } from "../constants.mjs";

const sha = (s) => "sha256:" + createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");
const baseIndex = (bundle) =>
  Object.fromEntries((bundle.base_corpus ?? []).map((b) => [b.base_id, b]));

// 250 — byo_target binding shape (optional; null is fine).
export function checkByo(bundle) {
  const b = bundle.byo_target;
  if (b === null || b === undefined) return null;
  if (typeof b !== "object") return 250;
  if (b.schema !== "simurgh.varl.byo_target.v1") return 250;
  if (typeof b.adapter_digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(b.adapter_digest))
    return 250;
  return null;
}

// 251 — attester_provenance consistency: response_digest reproduces the recorded evasion. model_id/
// org_id/request_digest are recorded-not-verified (self-asserted) [G2-8].
export function checkProvenance(bundle) {
  const p = bundle.attester_provenance;
  if (p === null || p === undefined) return null;
  if (typeof p !== "object" || p.schema !== "simurgh.varl.attester_provenance.v1") return 251;
  if (typeof p.model_id !== "string" || typeof p.org_id !== "string") return 251;
  if (typeof p.response_digest !== "string") return 251;
  // The corroborated evasion must exist in the ledger and its recomputed digest must match.
  const idx = baseIndex(bundle);
  const all = (bundle.rungs ?? []).flatMap((r) => r.evasions);
  const target = all.find((e) => e.base_id === p.base_id);
  if (!target) return 251;
  const text = applyRecipe(idx[p.base_id].base_text, target.recipe);
  if (sha(text) !== p.response_digest) return 251;
  return null;
}

// 252 — PUBLIC anti-overclaim: analyst_note denylist OR an exact_quantity_preserving evasion whose
// human_reviewed is not true (an unbacked strong claim is an overclaim).
export function checkOverclaim(bundle) {
  const note = (bundle.analyst_note ?? "").toLowerCase();
  if (VARL_OVERCLAIM_DENYLIST.some((t) => note.includes(t))) return 252;
  for (const rung of bundle.rungs ?? [])
    for (const e of rung.evasions)
      if (e.equivalence_class === "exact_quantity_preserving" && e.human_reviewed !== true)
        return 252;
  return null;
}

// 253 — AUDIT-ONLY: the supplied audit-private log must hash to the signed audit_private_digest, and
// no losing round present in the log may be omitted from rungs. Binds the log; does NOT force a
// builder to have logged a round they never ran (spec §5 limitation 7 — watcher-reproduction is the
// real completeness check).
export function checkAuditPrivate(bundle, auditPrivate) {
  if (auditPrivate === undefined) return null; // audit tier only supplies it
  if (!auditPrivate || typeof auditPrivate !== "object") return 253;
  if (sha(canonicalJson(auditPrivate)) !== bundle.audit_private_digest) return 253;
  if (auditPrivate.schema !== bundle.audit_private_schema) return 253;
  const logRounds = new Set((auditPrivate.rounds ?? []).map((r) => r.round));
  const ledgerRounds = new Set((bundle.rungs ?? []).map((r) => r.round));
  for (const r of logRounds) if (!ledgerRounds.has(r)) return 253; // a logged round omitted from rungs
  return null;
}
