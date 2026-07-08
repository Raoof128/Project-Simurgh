// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — per-mechanism flagged(text) reductions (plan Task 3, F3). Motto: AnthropicSafe
// First, then ReviewerSafe. The gates take STRUCTURED input; `flagged` is a defined reduction to
// a boolean, frozen here and sealed by the ruleset. All gates are IMPORTED read-only — zero edits.
//
// CRITICAL (F3): the 4W/4X leakage scanners take a span map; an EMPTY span map ([]) leaves the
// whole body as one uncovered region (verified against uncoveredRegions), so it is scanned. A
// span COVERING the body would leave zero regions → nothing scanned → every base not_applicable →
// a silently dead stage. Always pass [].
import { scanLeakage } from "../../stage4w/core/leakageGate.mjs";
import { scanLeakageV2 } from "../../stage4x/core/gateV2.mjs";
import { extractSpans } from "../../stage4y/core/spanExtractor.mjs";

// mechanism → reduction id (sealed into the bundle; an unknown id trips 231 at verify).
export const GATE_REDUCTIONS = Object.freeze({
  leakage: "leakage_scan_empty_spanmap_v1v2",
  doc_residue: "doc_residue_extract_spans_v1",
});

// doc_residue is a distinct 4Y export/code-path (byte-offset span extraction over documents);
// note it reuses the leakage lexicon, so it is not a semantically independent detector.
export function flagged(mechanism, version, text) {
  if (mechanism === "leakage") {
    if (version === "v1") return scanLeakage(text, [], []).length > 0;
    if (version === "v2") return scanLeakageV2(text, [], []).length > 0;
    throw new Error(`unknown leakage version: ${version}`);
  }
  if (mechanism === "doc_residue") {
    // doc_residue has a single frozen version ("v1"); version arg is ignored by design.
    return extractSpans(text).length > 0;
  }
  throw new Error(`unknown mechanism: ${mechanism}`);
}
