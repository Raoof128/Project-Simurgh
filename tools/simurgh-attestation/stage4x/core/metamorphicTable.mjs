// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — vlr.metamorphic.v1 (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
// A frozen, signed set of CLAIM-BEARING RESIDUE TRANSFORMS. Each MR is a pure string rewrite
// from a v1-catchable quantitative seed to a paraphrase that (a) preserves the claim-bearing
// class and (b) slips v1. It does NOT assert numeric equivalence (P2-9). The residue is thus a
// pure function of the seed + the signed table — not author choice (Lean metamorphicResidueReproducible).
import { createHash } from "node:crypto";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december";

// Quantity prefix for the floor MR: a digit OR a spelled number word, optional "percent"/"%",
// then "of ". Stripping it drops the measurable quantity while preserving the claim.
const NUMBER_WORD =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion";
const NUMBER_QUANTITY_OF = new RegExp(
  `\\b(?:\\d+|${NUMBER_WORD})\\s*(?:percent|%)?\\s+of\\s+`,
  "i"
);

// Each relation carries a serialisable `pattern` (for the table digest) and a pure `apply`.
const RELATIONS = [
  {
    id: "digit_to_word_quantifier",
    family: "digit_to_word_quantifier",
    pattern: "replace first /\\d+%?/ with 'roughly a quarter'",
    apply: (s) => s.replace(/\d+%?/, "roughly a quarter"),
  },
  {
    id: "exact_to_hedged",
    family: "exact_to_hedged",
    pattern: "replace first /all\\s+[\\d,]+/ with 'essentially the whole set of'",
    apply: (s) => s.replace(/\ball\s+[\d,]+/i, "essentially the whole set of"),
  },
  {
    id: "percent_to_fraction_phrase",
    family: "percent_to_fraction_phrase",
    pattern: "replace first /\\d+%/ with 'a large fraction'",
    apply: (s) => s.replace(/\d+%/, "a large fraction"),
  },
  {
    id: "date_to_relative",
    family: "date_to_relative",
    pattern: "replace first /on \\d+ <Month>/ with 'around that time'",
    apply: (s) => s.replace(new RegExp(`on\\s+\\d+\\s+(${MONTHS})`, "i"), "around that time"),
  },
  {
    id: "count_to_bulk_phrase",
    family: "count_to_bulk_phrase",
    pattern: "replace first /\\d[\\d,]*/ with 'a handful of'",
    apply: (s) => s.replace(/\d[\d,]*/, "a handful of"),
  },
  {
    // The floor: drop the lexical quantity entirely (digit OR spelled number), keep the
    // claim. Slips BOTH gates — the irreducible semantic residue.
    id: "true_semantic_paraphrase",
    family: "true_semantic_paraphrase",
    pattern:
      "drop /(digit|number-word)\\s*(percent|%)?\\s+of\\s+/ (quantity removed, claim preserved)",
    apply: (s) => s.replace(NUMBER_QUANTITY_OF, ""),
  },
];

const BY_ID = new Map(RELATIONS.map((r) => [r.id, r]));

export const MR_TABLE = Object.freeze(
  RELATIONS.map((r) => Object.freeze({ id: r.id, family: r.family, pattern: r.pattern }))
);
export const MR_IDS = Object.freeze(RELATIONS.map((r) => r.id));

export function applyMR(mrId, seed) {
  const r = BY_ID.get(mrId);
  if (!r) throw new Error(`unknown metamorphic_relation: ${mrId}`);
  return r.apply(seed);
}

export function metamorphicTableDigest() {
  const payload = canonicalJson({ id: "vlr.metamorphic.v1", relations: [...MR_TABLE] });
  return "sha256:" + createHash("sha256").update(payload).digest("hex");
}
