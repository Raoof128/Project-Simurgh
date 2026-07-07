// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — match-granular span extractor over the FROZEN imported lexicons
// (spec §1, plan Task 4). Motto: AnthropicSafe First, then ReviewerSafe.
//
// WHY this exists: the 4W gate reports at REGION granularity (one hit per uncovered
// region, first rule wins) — it cannot colour a partition. VDR needs its own
// match-granular extractor. It carries the IDENTICAL v1 rule set as the gate, and is
// bound by the gate-agreement invariant (machine-checked): extractor-v1-nonempty IFF
// scanLeakage(body, [], []) fires. The real gate is imported ONLY as that oracle.
import {
  LEAKAGE_NUMBER_WORDS,
  LEAKAGE_QUANTIFIERS,
  LEAKAGE_MONTHS,
} from "../../stage4w/constants.mjs";
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";
import { V2_LEXICON } from "../../stage4x/core/gateV2.mjs";

const ENC = new TextEncoder();
const utf8Len = (cp) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4);

// code-unit index → original UTF-8 byte offset (Task 4's tricky sub-part).
function byteOffsetMap(str) {
  const map = new Int32Array(str.length + 1);
  let b = 0;
  let i = 0;
  while (i < str.length) {
    const cp = str.codePointAt(i);
    const units = cp > 0xffff ? 2 : 1;
    map[i] = b;
    if (units === 2) map[i + 1] = b; // low surrogate shares the code point's start byte
    b += utf8Len(cp);
    i += units;
  }
  map[str.length] = b;
  return map;
}

// Same construction as the 4W gate's wordRe, plus the global flag for match iteration.
const wordReG = (words) => new RegExp(`\\b(${words.join("|").replace(/ /g, "\\s")})\\b`, "giu");

// v1 rules — IDENTICAL set to leakageGate.mjs RULES (digit, number_word, percent,
// month, quantifier), match-granular and global.
const V1_RES = [
  /[0-9]+/g,
  wordReG(LEAKAGE_NUMBER_WORDS),
  /%|\bpercent\b/gi,
  wordReG(LEAKAGE_MONTHS),
  wordReG(LEAKAGE_QUANTIFIERS),
];
const V2_RE = wordReG(V2_LEXICON);

function matchRanges(str, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) re.lastIndex++; // guard against zero-width loops
  }
  return out;
}

// extractSpans(body) → sorted [{start_byte, end_byte, class}] over ORIGINAL byte offsets.
// class ∈ {caught_v1, caught_v2_only}. Overlap RESOLUTION (precedence) is Task 5's job;
// the extractor emits raw candidates so a v1 and a v2 hit can both surface.
export function extractSpans(body) {
  const map = byteOffsetMap(body);
  const spans = [];
  for (const re of V1_RES)
    for (const [s, e] of matchRanges(body, re))
      spans.push({ start_byte: map[s], end_byte: map[e], class: "caught_v1" });
  for (const [s, e] of matchRanges(body, V2_RE))
    spans.push({ start_byte: map[s], end_byte: map[e], class: "caught_v2_only" });
  spans.sort((a, b) => a.start_byte - b.start_byte || a.end_byte - b.end_byte);
  return spans;
}

// The oracle: does the unmodified 4W gate fire over this body? (empty spanMap → whole
// body is one region; empty capsuleValues → no collision path). Used by the agreement
// invariant in unit tests, audit-tier 188, and K7 — never the extractor's hot path.
export function gateAgrees(body) {
  return scanLeakage(body, [], []).length > 0;
}

export { ENC as SPAN_ENCODER };
