// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — base corpus (plan Task 7/10). Motto: AnthropicSafe First, then ReviewerSafe.
// The 6 flagged bases are the SAME public 5C fixtures (not secret) → base_text is public, so
// recipe/verdict/closure recompute at BOTH tiers; only the ceremony log (253) is audit-private.
export const FLAGGED_BASES = Object.freeze([
  {
    base_id: "synonym_veil_pct",
    mechanism: "leakage",
    base_text: "40 percent of accounts were leaked",
  },
  { base_id: "confusable_digit", mechanism: "leakage", base_text: "5000 records were exposed" },
  {
    base_id: "distshift_datepct",
    mechanism: "leakage",
    base_text: "on 5 March 90 percent of the data leaked",
  },
  { base_id: "voiceflip_were", mechanism: "leakage", base_text: "3000 accounts were compromised" },
  {
    base_id: "guardrail_pct",
    mechanism: "leakage",
    base_text: "exposed 50 percent of the records",
  },
  {
    base_id: "docres_count",
    mechanism: "doc_residue",
    base_text: "50 accounts were exposed in the breach",
  },
]);
