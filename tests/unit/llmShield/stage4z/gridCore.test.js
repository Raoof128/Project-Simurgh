// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA gridCore (plan Task 4). No Silent Cell × No Silent Token + θ-flag rule.
import test from "node:test";
import assert from "node:assert/strict";
import {
  expandGrid,
  buildScores,
  flagsFor,
  aggregatesFromFlags,
  checkGrid,
  checkFlags,
} from "../../../../tools/simurgh-attestation/stage4z/core/gridCore.mjs";
import { scoreNano } from "../../../../tools/simurgh-attestation/stage4z/core/tensorCore.mjs";

// A tiny declaration: 2 prompts (2 and 1 tokens), 2 layers, 3-token lexicon.
const decl = {
  prompts: [
    { prompt_id: "p0", n_tokens: 2 },
    { prompt_id: "p1", n_tokens: 1 },
  ],
  layers: [5, 8],
};
const lexicon = { tokens: [{ token_id: 10 }, { token_id: 20 }, { token_id: 30 }] };
const theta = scoreNano(0.5); // "500000000"

// deterministic score: token 30 fires at (p0,t0); token 10 fires at (p1,t0); else 0.
const scoreFn = (c, tok) => {
  if (c.prompt_id === "p0" && c.t === 0 && tok.token_id === 30) return 0.9;
  if (c.prompt_id === "p1" && c.t === 0 && tok.token_id === 10) return 0.7;
  return 0.1;
};

function buildMap() {
  const cells = buildScores(expandGrid(decl), lexicon, scoreFn).map((c) => ({
    ...c,
    flags: flagsFor(c.scores, theta),
  }));
  return { cells, aggregates: aggregatesFromFlags(cells), theta_nano: theta };
}

test("expandGrid is the TOTAL position rule × layers, sorted, each cell once", () => {
  const cells = expandGrid(decl);
  // (2 tokens + 1 token) × 2 layers = 6 cells
  assert.equal(cells.length, 6);
  assert.deepEqual(cells[0], { prompt_id: "p0", t: 0, layer: 5 });
  assert.deepEqual(cells[cells.length - 1], { prompt_id: "p1", t: 0, layer: 8 });
  const keys = cells.map((c) => `${c.prompt_id}:${c.t}:${c.layer}`);
  assert.equal(new Set(keys).size, keys.length); // unique
});

test("a clean map passes checkGrid and checkFlags", () => {
  const map = buildMap();
  assert.equal(checkGrid(map, decl, lexicon), null);
  assert.equal(checkFlags(map, theta), null);
});

test("checkGrid fires 194 when a cell is dropped (shrunk grid) — No Silent Cell", () => {
  const map = buildMap();
  map.cells = map.cells.slice(0, 5); // drop the last cell
  const r = checkGrid(map, decl, lexicon);
  assert.equal(r.raw, 194);
});

test("checkGrid fires 194 when a token is dropped from a cell — No Silent Token", () => {
  const map = buildMap();
  map.cells[0].scores = map.cells[0].scores.slice(0, 2); // drop a lexicon token
  assert.equal(checkGrid(map, decl, lexicon).raw, 194);
});

test("checkGrid fires 194 when published aggregates disagree with the flags", () => {
  const map = buildMap();
  map.aggregates.flag_total += 1; // doctored count
  assert.equal(checkGrid(map, decl, lexicon).raw, 194);
});

test("checkFlags fires 196 when a published flag disagrees with the θ rule", () => {
  const map = buildMap();
  map.cells[0].flags = [10, 20, 30]; // claim all fire at (p0,t0) though only 30 does
  assert.equal(checkFlags(map, theta).raw, 196);
});

test("lexiconMonotone: adding a watch-token never removes an existing flag", () => {
  const scores = [
    { token_id: 30, score_nano: scoreNano(0.9) },
    { token_id: 10, score_nano: scoreNano(0.1) },
  ];
  const before = flagsFor(scores, theta);
  const withExtra = [...scores, { token_id: 99, score_nano: scoreNano(0.95) }];
  const after = flagsFor(withExtra, theta);
  for (const f of before) assert.ok(after.includes(f), `flag ${f} retained`);
  assert.ok(after.includes(99)); // the new token fires, none removed
});
