// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Y VDR — match-granular extractor + gate-agreement oracle (plan Task 4).
// The gate-agreement invariant is the load-bearing law: extractor-v1-nonempty IFF
// the unmodified 4W gate fires. Corpus is GENERATED over every family (reviewer P1-6).
import test from "node:test";
import assert from "node:assert/strict";
import {
  extractSpans,
  gateAgrees,
} from "../../../../tools/simurgh-attestation/stage4y/core/spanExtractor.mjs";
import { scanLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import {
  LEAKAGE_NUMBER_WORDS,
  LEAKAGE_QUANTIFIERS,
  LEAKAGE_MONTHS,
} from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";
import { V2_LEXICON } from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";

const enc = (s) => new TextEncoder().encode(s);
const bytesOf = (s, span) => enc(s).slice(span.start_byte, span.end_byte);
const dec = (u8) => new TextDecoder().decode(u8);

test("spans are sorted, on code-point boundaries, classes in the v1/v2 set", () => {
  const body = "Revenue grew 42% in March.";
  const spans = extractSpans(body);
  for (let i = 1; i < spans.length; i++)
    assert.ok(spans[i].start_byte >= spans[i - 1].start_byte, "sorted");
  for (const s of spans) assert.ok(["caught_v1", "caught_v2_only"].includes(s.class));
});

test("42% yields a caught_v1 span; roughly yields a caught_v2_only span", () => {
  const body = "about 42% roughly there";
  const spans = extractSpans(body);
  const v1 = spans.filter((s) => s.class === "caught_v1");
  const v2 = spans.filter((s) => s.class === "caught_v2_only");
  assert.ok(
    v1.some((s) => dec(bytesOf(body, s)).includes("42")),
    "digit span"
  );
  assert.ok(
    v2.some((s) => dec(bytesOf(body, s)) === "roughly"),
    "v2 hedge span"
  );
});

test("overlap raw material: 'roughly 40' surfaces BOTH a v1(40) and v2(roughly) candidate", () => {
  const spans = extractSpans("roughly 40");
  assert.ok(
    spans.some((s) => s.class === "caught_v1"),
    "v1 present"
  );
  assert.ok(
    spans.some((s) => s.class === "caught_v2_only"),
    "v2 present"
  );
});

test("byte offsets are correct across a multi-byte code point", () => {
  const body = "€ costs 5 euros"; // € = 3 bytes
  const spans = extractSpans(body);
  const v1 = spans.find((s) => s.class === "caught_v1");
  assert.equal(dec(bytesOf(body, v1)), "5");
});

// ---- Gate-agreement invariant over a GENERATED corpus ----
function generatedCorpus() {
  const bodies = [];
  bodies.push("plain digit 7 here");
  bodies.push("forty two percent");
  bodies.push("grew 90%");
  for (const w of LEAKAGE_NUMBER_WORDS) bodies.push(`the ${w} widgets shipped`);
  for (const q of LEAKAGE_QUANTIFIERS) bodies.push(`${q} accounts were fine`);
  for (const m of LEAKAGE_MONTHS) bodies.push(`filed in ${m} last year`);
  for (const v of V2_LEXICON) bodies.push(`it was ${v} acceptable overall`);
  // negative controls (claim-free)
  bodies.push("the quick brown fox jumped over");
  bodies.push("!!! ??? ...");
  bodies.push("   ");
  bodies.push("no numerals whatsoever in this sentence");
  return bodies;
}

test("gate-agreement: extractor v1-nonempty IFF the unmodified 4W gate fires (whole corpus)", () => {
  for (const body of generatedCorpus()) {
    const extractorFires = extractSpans(body).some((s) => s.class === "caught_v1");
    const gateFires = scanLeakage(body, [], []).length > 0;
    assert.equal(extractorFires, gateFires, `disagreement on: ${JSON.stringify(body)}`);
    assert.equal(gateAgrees(body), gateFires, "gateAgrees mirrors the gate");
  }
});
