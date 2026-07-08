// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — partitionCore (204, 208). Plan Task 5. Motto: AnthropicSafe First, then
// ReviewerSafe.
import test from "node:test";
import assert from "node:assert/strict";
import {
  partitionFlags,
  checkCoverage,
  tallies,
  checkTallies,
} from "../../../../tools/simurgh-attestation/stage5a/core/partitionCore.mjs";

const score = (tid) => ({ token_id: tid, score_nano: "0" });
// Map: two flags — (p1,t0,l2,1001) and (p1,t1,l2,2001).
const map = {
  cells: [
    { prompt_id: "p1", t: 0, layer: 2, scores: [score(1001), score(2001)], flags: [1001] },
    { prompt_id: "p1", t: 1, layer: 2, scores: [score(1001), score(2001)], flags: [2001] },
  ],
};
const addr = (t, token_id) => ({ prompt_id: "p1", t, layer: 2, token_id: String(token_id) });

// Clean ledger: claim c1 covers 1001; 2001 is unnarrated.
const cleanLedger = () => ({
  content: {
    verdicts: [{ claim_id: "c1", verdict: "contradicted", evidence: [addr(0, 1001)] }],
    unnarrated_flags: [addr(1, 2001)],
    aggregates: {
      n_claims: 1,
      n_corroborated: 0,
      n_contradicted: 1,
      n_unreadable: 0,
      n_flags: 2,
      n_covered_flags: 1,
      n_unnarrated_flags: 1,
    },
  },
});

test("partitionFlags: covered ⊎ unnarrated = F, identity holds", () => {
  const p = partitionFlags(cleanLedger(), map);
  assert.equal(p.F.length, 2);
  assert.equal(p.covered.length, 1);
  assert.equal(p.unnarrated.length, 1);
  assert.ok(p.identityHolds);
});

test("checkCoverage: clean → null", () => {
  assert.equal(checkCoverage(cleanLedger(), map), null);
});

test("204: a silent flag (in neither covered nor unnarrated)", () => {
  const l = cleanLedger();
  l.content.unnarrated_flags = []; // drop 2001 from both sides
  assert.equal(checkCoverage(l, map).reason, "flag_uncovered");
});

test("204: a double-covered flag (in both sides)", () => {
  const l = cleanLedger();
  l.content.unnarrated_flags = [addr(0, 1001), addr(1, 2001)]; // 1001 also in evidence
  assert.equal(checkCoverage(l, map).reason, "flag_double_covered");
});

test("204: an unnarrated flag absent from the map", () => {
  const l = cleanLedger();
  l.content.unnarrated_flags = [addr(1, 2001), addr(9, 7777)];
  assert.equal(checkCoverage(l, map).reason, "unnarrated_flag_absent_from_map");
});

test("204: fabricated evidence — a covered flag absent from the map (N7)", () => {
  const l = cleanLedger();
  l.content.verdicts[0].evidence = [addr(0, 1001), addr(5, 3333)];
  assert.equal(checkCoverage(l, map).reason, "evidence_flag_absent_from_map");
});

test("tallies recounts all seven aggregates", () => {
  assert.deepEqual(tallies(cleanLedger()), cleanLedger().content.aggregates);
});

test("208: each of the seven aggregates, mutated once, is caught", () => {
  for (const field of [
    "n_claims",
    "n_corroborated",
    "n_contradicted",
    "n_unreadable",
    "n_flags",
    "n_covered_flags",
    "n_unnarrated_flags",
  ]) {
    const l = cleanLedger();
    l.content.aggregates[field] = l.content.aggregates[field] + 1;
    const r = checkTallies(l);
    assert.equal(r.raw, 208, field);
    assert.equal(r.detail.field, field);
  }
});

test("checkTallies: clean → null", () => {
  assert.equal(checkTallies(cleanLedger()), null);
});
