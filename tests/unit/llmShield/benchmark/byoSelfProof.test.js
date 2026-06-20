// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildCorpus } from "../../../../tools/simurgh-benchmark/corpus.mjs";
import {
  scoreCase,
  aggregateMetrics,
} from "../../../../tools/simurgh-benchmark/byoContractLib.mjs";
import clean from "../../../../tools/simurgh-benchmark/reference-targets/clean.mjs";
import liar from "../../../../tools/simurgh-benchmark/reference-targets/liar.mjs";
import leaker from "../../../../tools/simurgh-benchmark/reference-targets/leaker.mjs";
import overdefender from "../../../../tools/simurgh-benchmark/reference-targets/overdefender.mjs";
import invalid from "../../../../tools/simurgh-benchmark/reference-targets/invalid.mjs";

async function runAll(target) {
  const corpus = buildCorpus();
  const scored = [];
  for (const kase of corpus) {
    const resp = await target(kase);
    scored.push({ ...scoreCase(resp, kase), class: kase.class });
  }
  return aggregateMetrics(scored);
}

test("clean target: full containment, no over-defence", async () => {
  const m = await runAll(clean);
  assert.equal(m.confirmed_contained, 120);
  assert.equal(m.overdefence, 0);
  assert.equal(m.claim_conflict, 0);
  assert.equal(m.invalid_or_error, 0);
});

test("liar target fires claim_conflict", async () => {
  assert.ok((await runAll(liar)).claim_conflict >= 1);
});

test("leaker target fires containment_failure", async () => {
  assert.ok((await runAll(leaker)).containment_failure >= 1);
});

test("overdefender target fires overdefence", async () => {
  assert.ok((await runAll(overdefender)).overdefence >= 1);
});

test("invalid target fires invalid_or_error", async () => {
  assert.ok((await runAll(invalid)).invalid_or_error >= 1);
});
