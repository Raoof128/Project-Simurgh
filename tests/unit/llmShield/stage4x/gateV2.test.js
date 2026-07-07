// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4X VLR gateV2 (plan Task 3) — vsn.leakage.v2 = v1 ∪ DISJOINT lexicon.
import test from "node:test";
import assert from "node:assert/strict";
import {
  V2_LEXICON,
  checkLeakageV2,
  v2Digest,
} from "../../../../tools/simurgh-attestation/stage4x/core/gateV2.mjs";
import { checkLeakage } from "../../../../tools/simurgh-attestation/stage4w/core/leakageGate.mjs";
import {
  LEAKAGE_NUMBER_WORDS,
  LEAKAGE_QUANTIFIERS,
  LEAKAGE_MONTHS,
} from "../../../../tools/simurgh-attestation/stage4w/constants.mjs";

// This is the machine guard that Finding 1 (residue examples already caught by v1) never recurs.
test("V2_LEXICON is DISJOINT from every v1 lexical list", () => {
  const v1 = new Set([...LEAKAGE_NUMBER_WORDS, ...LEAKAGE_QUANTIFIERS, ...LEAKAGE_MONTHS]);
  const overlap = V2_LEXICON.filter((w) => v1.has(w));
  assert.deepEqual(overlap, [], `v2 words that collide with v1: ${overlap}`);
});

test("v2 is a SUPERSET of v1: everything v1 catches, v2 catches", () => {
  const inputs = [
    "23% of accounts",
    "all users",
    "nearly everyone",
    "on 3 August",
    "forty seven cases",
    "the majority",
  ];
  for (const t of inputs) {
    if (checkLeakage(t, [], []))
      assert.ok(checkLeakageV2(t, [], []), `v2 must catch what v1 catches: ${t}`);
  }
});

test("v2 additionally catches disjoint hedge/fraction/bulk residue v1 misses", () => {
  for (const t of [
    "roughly a quarter of the base",
    "a handful of incidents",
    "essentially the whole base",
    "a large fraction of sessions",
  ]) {
    assert.equal(checkLeakage(t, [], []), null, `v1 should MISS: ${t}`);
    assert.ok(checkLeakageV2(t, [], []), `v2 should CATCH: ${t}`);
  }
});

test("v2 does NOT catch the irreducible floor (true semantic paraphrase)", () => {
  for (const t of ["materially affected", "not ideal for a subset"]) {
    assert.equal(checkLeakage(t, [], []), null, `v1 misses: ${t}`);
    assert.equal(checkLeakageV2(t, [], []), null, `v2 also misses (floor): ${t}`);
  }
});

test("v2Digest is stable across calls", () => {
  assert.equal(v2Digest(), v2Digest());
  assert.match(v2Digest(), /^sha256:[0-9a-f]{64}$/);
});
