// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — durability classifier (plan Task 5). Motto: AnthropicSafe First, then ReviewerSafe.
// A rung's hardening is `durable` iff EVERY rule that closed that round's class is a fixed
// Unicode-property predicate; `brittle` iff any rule is an enumeration (hand blocklist / table /
// single hardcoded rewrite). This is the signed teeth of "property-class holds, enumeration loses"
// [Lean durabilitySound]. Honest finding (surfaced in build): rung 1's closure leans on the homoglyph
// TABLE + the per-cent rewrite → brittle; rung 2's closure is a pure \p{M}+\p{DI} strip → durable —
// which is exactly why round 3 later beat the still-enumerated homoglyph table (the Trilemma).

// The fixed-property vocabulary a durable closure may use.
export const DURABLE_PREDICATES = Object.freeze([
  "nfkc",
  "combining_marks", // \p{M}
  "default_ignorable", // \p{Default_Ignorable_Code_Point}
  "script_restriction", // \p{Script=Latin}/\p{Script=Common}
]);

// A hardening declares { rule_kinds: [...] } = the rules that CLOSED this round's class. Each is
// either a DURABLE_PREDICATE or an enumeration tag (homoglyph_table, hand_blocklist, per_cent_rule,
// codepoint_list, word_list).
export function classifyDurability(hardening) {
  const kinds = hardening?.rule_kinds ?? [];
  if (!Array.isArray(kinds) || kinds.length === 0) return "brittle";
  return kinds.every((k) => DURABLE_PREDICATES.includes(k)) ? "durable" : "brittle";
}

// The closing-rule kinds per shipped rung (from→to normalizer level).
export const CLOSURE_RULE_KINDS = Object.freeze({
  "v1->v3": ["nfkc", "per_cent_rule", "homoglyph_table"], // brittle: table + hardcoded rewrite
  "v3->v4": ["combining_marks", "default_ignorable"], // durable: pure property strip
});
