// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR — vsn.leakage.v2 (spec §2). Motto: AnthropicSafe First, then ReviewerSafe.
// v2 = the frozen 4W v1 gate ∪ a DISJOINT hedge/fraction/bulk lexicon. It COMPOSES v1
// (imported unmodified), never mutates it, so R′ ⊆ R holds by construction.
// v2 is a MEASUREMENT ruleset for shrinking the residue bound — NOT a deployed policy.
import { createHash } from "node:crypto";
import { scanLeakage, uncoveredRegions } from "../../stage4w/core/leakageGate.mjs";
import { canonicalJson } from "../../stage4m/core/canonical.mjs";
import {
  LEAKAGE_NUMBER_WORDS,
  LEAKAGE_QUANTIFIERS,
  LEAKAGE_MONTHS,
} from "../../stage4w/constants.mjs";

// Every word here is asserted DISJOINT from all v1 lists by gateV2.test.js — the machine
// guard that Finding 1 (a residue example already caught by v1) can never recur.
export const V2_LEXICON = Object.freeze([
  "roughly",
  "approximately",
  "about",
  "around",
  "effectively",
  "essentially",
  "largely",
  "quarter",
  "third",
  "fifth",
  "fraction",
  "portion",
  "handful",
  "several",
  "swath",
  "chunk",
]);

const wordRe = (words) => new RegExp(`\\b(${words.join("|").replace(/ /g, "\\s")})\\b`, "u");
const V2_RE = wordRe(V2_LEXICON);

export function scanLeakageV2(body, spanMap, capsuleValues) {
  const v1hits = scanLeakage(body, spanMap, capsuleValues);
  const v2hits = [];
  for (const region of uncoveredRegions(body, spanMap)) {
    if (V2_RE.test(region.text.toLowerCase()))
      v2hits.push({
        rule: "v2_hedge_lexicon",
        region_start_byte: region.start_byte,
        sample: region.text.slice(0, 40),
      });
  }
  return [...v1hits, ...v2hits];
}

export function checkLeakageV2(body, spanMap, capsuleValues) {
  const hits = scanLeakageV2(body, spanMap, capsuleValues);
  return hits.length === 0 ? null : { raw: 170, reason: "vsn_leakage_detected", detail: { hits } };
}

export function v2Digest() {
  const payload = canonicalJson({
    id: "vsn.leakage.v2",
    v1: {
      numberWords: LEAKAGE_NUMBER_WORDS,
      quantifiers: LEAKAGE_QUANTIFIERS,
      months: LEAKAGE_MONTHS,
    },
    v2Lexicon: V2_LEXICON,
  });
  return "sha256:" + createHash("sha256").update(payload).digest("hex");
}
