// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — composed MR ruleset (plan Task 2; F1/P0-1/P0-2). Motto: AnthropicSafe First,
// then ReviewerSafe. The mutation engine is 4X's, IMPORTED not reinvented. This module appends
// three 5C families to the frozen vlr.metamorphic.v1 table and stores each relation's
// equivalence_basis in a SEPARATE map, so the imported 4X objects stay byte-identical (P0-2).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  MR_TABLE,
  MR_IDS,
  applyMR,
  metamorphicTableDigest,
} from "../../stage4x/core/metamorphicTable.mjs";

// --- 5C-appended relations: pure (mr_id, base_text) -> mutated_text (P0-1). Same {id, family,
// pattern} shape as 4X (P0-2 — no basis field on the object). Deterministic string rewrites; any
// variation would derive from (mr_id, base_id, base_text), never ambient randomness. ---
const FULLWIDTH_ZERO = 0xff10; // '０'; ASCII '0' is 0x30 — a confusable that /[0-9]/ won't match.
const ZWSP = "\u200B"; // zero-width space (Hackett invisible-char injection).

const RELATIONS_5C = [
  {
    id: "voice_flip",
    family: "voice_flip",
    pattern: "recast '<n> <noun> were <verb>' to passive-bulk, dropping the digit",
    apply: (s) => s.replace(/\b\d[\d,]*\s+(\w+)\s+were\s+(\w+)/i, "$1 were $2 in large number"),
  },
  {
    id: "unicode_confusable",
    family: "unicode_confusable",
    pattern: "map the first ASCII digit to its fullwidth homoglyph (multi-byte)",
    apply: (s) =>
      s.replace(/[0-9]/, (d) => String.fromCharCode(d.charCodeAt(0) - 0x30 + FULLWIDTH_ZERO)),
  },
  {
    id: "guardrail_evasion",
    family: "guardrail_evasion",
    pattern: "inject a zero-width space into the first quantity trigger word (percent/number word)",
    apply: (s) => s.replace(/(percent|per cent)/i, (m) => m[0] + ZWSP + m.slice(1)),
  },
];

const RELATIONS_5C_BY_ID = new Map(RELATIONS_5C.map((r) => [r.id, r]));

// Composed table: imported 4X objects spread UNTOUCHED, then the 5C relation cards.
export const COMPOSED_MR_TABLE = Object.freeze([
  ...MR_TABLE,
  ...RELATIONS_5C.map((r) => Object.freeze({ id: r.id, family: r.family, pattern: r.pattern })),
]);

export const MR_IDS_5C = Object.freeze([...MR_IDS, ...RELATIONS_5C.map((r) => r.id)]);

// P0-2: basis is a SEPARATE map (never a field on the relation objects).
export const MR_EQUIVALENCE_BASIS_BY_ID = Object.freeze({
  // imported 4X relations (quantity/lexical paraphrases over vsn.leakage)
  digit_to_word_quantifier: "lexical_synonym",
  exact_to_hedged: "lexical_synonym",
  percent_to_fraction_phrase: "lexical_synonym",
  date_to_relative: "lexical_synonym",
  count_to_bulk_phrase: "lexical_synonym",
  true_semantic_paraphrase: "structural_reorder",
  // 5C-appended families
  voice_flip: "syntactic_voice",
  unicode_confusable: "unicode_confusable",
  guardrail_evasion: "whitespace_evasion",
});

// P0-1: 5C's dispatcher — base_text IS 4X's `seed` param (called positionally).
export function applyMR5C(mrId, baseText) {
  if (MR_IDS.includes(mrId)) return applyMR(mrId, baseText);
  const r = RELATIONS_5C_BY_ID.get(mrId);
  if (!r) throw new Error(`unknown metamorphic_relation: ${mrId}`);
  return r.apply(baseText);
}

export function composedRulesetDigest() {
  return "sha256:" + createHash("sha256").update(canonicalJson(COMPOSED_MR_TABLE)).digest("hex");
}

// 227 witness: the 4X slice of the composed table must reproduce 4X's own signed table digest.
export function fourXSliceMatches() {
  const slice = COMPOSED_MR_TABLE.slice(0, MR_TABLE.length);
  const sliceDigest =
    "sha256:" +
    createHash("sha256")
      .update(canonicalJson({ id: "vlr.metamorphic.v1", relations: [...slice] }))
      .digest("hex");
  return (
    canonicalJson(slice) === canonicalJson(MR_TABLE) && sliceDigest === metamorphicTableDigest()
  );
}
