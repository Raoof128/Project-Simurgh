// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4W leakage gate — frozen lexical ruleset vsn.leakage.v1 (spec §2).
// Motto: AnthropicSafe First, then ReviewerSafe.
// Deterministic, case-folded, NO NLP. Undeclared claim-looking text fails closed (170).
// Signed bound: lexical only — paraphrase smuggling is the 4X surface.
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import { LEAKAGE_NUMBER_WORDS, LEAKAGE_QUANTIFIERS, LEAKAGE_MONTHS } from "../constants.mjs";
import { bodyBytes } from "./textCore.mjs";

const DEC = new TextDecoder();

export function uncoveredRegions(body, spanMap) {
  const bytes = bodyBytes(body);
  const sorted = [...(spanMap ?? [])].sort((a, b) => a.start_byte - b.start_byte);
  const regions = [];
  let cursor = 0;
  for (const s of sorted) {
    if (s.start_byte > cursor) regions.push({ start_byte: cursor, end_byte: s.start_byte });
    cursor = Math.max(cursor, s.end_byte);
  }
  if (cursor < bytes.length) regions.push({ start_byte: cursor, end_byte: bytes.length });
  return regions.map((r) => ({
    ...r,
    text: DEC.decode(bytes.subarray(r.start_byte, r.end_byte)),
  }));
}

// Canonical string forms of the capsule's own projected values (collision rule).
export const capsuleValueStrings = (capsule) =>
  (capsule?.projected_sections ?? [])
    .filter((p) => p.value !== undefined)
    .map((p) => (typeof p.value === "string" ? p.value : canonicalJson(p.value)));

const wordRe = (words) => new RegExp(`\\b(${words.join("|").replace(/ /g, "\\s")})\\b`, "u");
const RULES = [
  { rule: "digit", test: (t) => /[0-9]/u.test(t) },
  { rule: "number_word", test: (t) => wordRe(LEAKAGE_NUMBER_WORDS).test(t) },
  { rule: "percent", test: (t) => /%|\bpercent\b/u.test(t) },
  { rule: "month", test: (t) => wordRe(LEAKAGE_MONTHS).test(t) },
  { rule: "quantifier", test: (t) => wordRe(LEAKAGE_QUANTIFIERS).test(t) },
];

export function scanLeakage(body, spanMap, capsuleValues) {
  const hits = [];
  for (const region of uncoveredRegions(body, spanMap)) {
    const folded = region.text.toLowerCase();
    let fired = false;
    for (const { rule, test: fn } of RULES)
      if (fn(folded)) {
        hits.push({ rule, region_start_byte: region.start_byte, sample: region.text.slice(0, 40) });
        fired = true;
        break; // first hit per region wins; keep the report small and deterministic
      }
    if (fired) continue;
    for (const v of capsuleValues ?? [])
      if (v.length >= 2 && folded.includes(v.toLowerCase())) {
        hits.push({
          rule: "capsule_value_collision",
          region_start_byte: region.start_byte,
          sample: v.slice(0, 40),
        });
        break;
      }
  }
  return hits;
}

export function checkLeakage(body, spanMap, capsuleValues) {
  const hits = scanLeakage(body, spanMap, capsuleValues);
  return hits.length === 0 ? null : { raw: 170, reason: "vsn_leakage_detected", detail: { hits } };
}
