// SPDX-License-Identifier: AGPL-3.0-or-later
import test from "node:test";
import assert from "node:assert/strict";
import { buildMatrixCorpus } from "../../../../tools/simurgh-benchmark/crossDefenceMatrix.mjs";
import { buildCoverageProfile } from "../../../../tools/simurgh-benchmark/crossDefenceLib.mjs";
import noDefence from "../../../../tools/simurgh-benchmark/cross-defence-targets/no-defence-baseline.mjs";
import keyword from "../../../../tools/simurgh-benchmark/cross-defence-targets/keyword-filter-replica.mjs";
import toolGate from "../../../../tools/simurgh-benchmark/cross-defence-targets/tool-gate-replica.mjs";
import fullGateway from "../../../../tools/simurgh-benchmark/cross-defence-targets/full-gateway-target.mjs";

async function profile(target) {
  const corpus = buildMatrixCorpus();
  const scored = [];
  for (const kase of corpus) scored.push({ kase, resp: await target(kase) });
  return buildCoverageProfile(scored);
}

test("no-defence-baseline leaks every cell", async () => {
  const cp = await profile(noDefence);
  assert.ok(Object.values(cp.cells).every((c) => c.result === "allowed"));
});

test("full-gateway-target contains every cell with no over-defence", async () => {
  const cp = await profile(fullGateway);
  assert.ok(Object.values(cp.cells).every((c) => c.result === "contained"));
  assert.equal(cp.controls.overdefence, 0);
});

test("keyword-filter-replica contains some cells and leaks others (a real fingerprint)", async () => {
  const cp = await profile(keyword);
  const results = Object.values(cp.cells).map((c) => c.result);
  assert.ok(results.includes("contained"));
  assert.ok(results.includes("allowed"));
});

test("tool-gate-replica contains the tool_request row but leaks unrelated rows", async () => {
  const cp = await profile(toolGate);
  assert.equal(cp.cells["tool_request::plain_marker"].result, "contained");
  assert.equal(cp.cells["direct_input::plain_marker"].result, "allowed");
});

test("targets do not over-defend benign controls", async () => {
  const cp = await profile(keyword);
  assert.equal(cp.controls.total, 30);
  assert.equal(cp.controls.overdefence, 0);
});
