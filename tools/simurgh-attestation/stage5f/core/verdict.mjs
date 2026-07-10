// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — verdict registry (plan Task 11, raw 277). Closed registry keyed by decision_semantics;
// NO softmax recompute, NO Number arithmetic (lexical compare), NO cross-semantics mapping. The softmax
// score must be bound to the positive-class index (5E lesson).
import { scoreGte, validateScore } from "../constants.mjs";

const CATEGORICAL_LABELS = new Set(["allow", "block"]);

const REGISTRY = {
  binary_malicious_softmax(member, de) {
    if (de?.kind !== "binary_softmax") return 277;
    if (de.positive_class_index !== member.positive_class_index) return 277; // score bound to malicious class
    try {
      validateScore(de.positive_score);
      validateScore(de.threshold);
    } catch {
      return 277;
    }
    if (de.threshold !== member.reference_threshold) return 277;
    const negative = member.label_map?.[String(1 - member.positive_class_index)];
    const expected = scoreGte(de.positive_score, de.threshold) ? member.positive_label : negative;
    return de.label === expected ? null : 277;
  },
  categorical_allow_block(member, de) {
    if (de?.kind !== "categorical_generation") return 277;
    if (!CATEGORICAL_LABELS.has(de.normalised_label)) return 277;
    if (typeof de.parser_digest !== "string" || typeof de.raw_output_digest !== "string")
      return 277;
    return null; // bounded-token validation — NOT arbitrary generation parsing
  },
};

export function checkVerdict(bundle) {
  const memberById = new Map((bundle?.roster ?? []).map((m) => [m.member_id, m]));
  for (const cell of bundle?.cells ?? []) {
    if (cell.status !== "evaluated") continue;
    const m = memberById.get(cell.member_id);
    const fn = m && REGISTRY[m.decision_semantics];
    if (!fn) return 277;
    const code = fn(m, cell.decision_evidence);
    if (code) return code;
  }
  return null;
}
