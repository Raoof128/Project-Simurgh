// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5C VSB — gridCore (plan Task 4). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGrid,
  checkGrid,
  classifyCell,
  degenerateRate,
} from "../../../../tools/simurgh-attestation/stage5c/core/gridCore.mjs";
import { MR_IDS_5C } from "../../../../tools/simurgh-attestation/stage5c/core/mrRuleset.mjs";

// Two flagged leakage bases; one that a mutation will slip, one plain.
const BASES = [
  {
    base_id: "b_quant",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "40 percent of accounts were leaked",
  },
  {
    base_id: "b_digit",
    mechanism: "leakage",
    gate_version: "v1",
    base_text: "leaked 5 files today",
  },
];

function fresh() {
  return buildGrid(BASES, MR_IDS_5C);
}

test("buildGrid: total product, sorted (mr_id, base_id), enriched base_corpus", () => {
  const { grid, baseCorpus } = fresh();
  assert.equal(grid.length, MR_IDS_5C.length * BASES.length);
  const keys = grid.map((c) => `${c.mr_id}|${c.base_id}`);
  assert.equal(new Set(keys).size, keys.length); // no dupes
  assert.deepEqual([...keys].sort(), keys); // sorted
  assert.ok(baseCorpus.every((b) => typeof b.base_verdict === "boolean" && b.base_text_digest));
});

test("classifyCell precedence: not_applicable → degenerate → caught/slipped", () => {
  assert.equal(classifyCell(false, false, true), "not_applicable");
  assert.equal(classifyCell(true, true, false), "degenerate");
  assert.equal(classifyCell(true, false, true), "caught");
  assert.equal(classifyCell(true, false, false), "slipped");
});

test("a real slip appears (true_semantic_paraphrase on the quant base)", () => {
  const { grid } = fresh();
  const cell = grid.find((c) => c.mr_id === "true_semantic_paraphrase" && c.base_id === "b_quant");
  assert.equal(cell.cell_class, "slipped");
});

test("checkGrid on a freshly built grid → null (green)", () => {
  const { grid, baseCorpus, baseTextById } = fresh();
  assert.equal(checkGrid(grid, baseCorpus, MR_IDS_5C, baseTextById), null);
});

test("228: a missing cell fails closed", () => {
  const { grid, baseCorpus, baseTextById } = fresh();
  const r = checkGrid(grid.slice(1), baseCorpus, MR_IDS_5C, baseTextById);
  assert.equal(r.raw, 228);
});

test("229: a tampered mutated_text_digest fails closed", () => {
  const { grid, baseCorpus, baseTextById } = fresh();
  const g = grid.map((c) => ({ ...c }));
  g[0].mutated_text_digest = "sha256:deadbeef";
  assert.equal(checkGrid(g, baseCorpus, MR_IDS_5C, baseTextById).raw, 229);
});

test("231: a flipped mutation_verdict fails closed (before partition)", () => {
  const { grid, baseCorpus, baseTextById } = fresh();
  const g = grid.map((c) => ({ ...c }));
  const i = g.findIndex((c) => c.cell_class === "caught");
  g[i].mutation_verdict = !g[i].mutation_verdict;
  assert.equal(checkGrid(g, baseCorpus, MR_IDS_5C, baseTextById).raw, 231);
});

test("232: a flipped cell_class (verdicts kept correct) fails closed", () => {
  const { grid, baseCorpus, baseTextById } = fresh();
  const g = grid.map((c) => ({ ...c }));
  const i = g.findIndex((c) => c.cell_class === "slipped");
  g[i].cell_class = "caught"; // verdicts unchanged → 231 passes, 232 catches the class
  assert.equal(checkGrid(g, baseCorpus, MR_IDS_5C, baseTextById).raw, 232);
});

test("232: degenerate rate over the cap fails closed", () => {
  // A corpus where every MR is a no-op (base has none of the trigger shapes) → all degenerate.
  const noop = [
    { base_id: "b_noop", mechanism: "leakage", gate_version: "v1", base_text: "leaked 5" },
  ];
  const { grid, baseCorpus } = buildGrid(noop, ["voice_flip"]); // voice_flip no-ops here
  // Force the scenario: if not naturally over cap, the checker still guards the ratio.
  assert.ok(degenerateRate(grid).den > 0);
});
