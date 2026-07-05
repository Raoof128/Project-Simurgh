// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FIX = "tests/fixtures/llmShield/stage4q/lane-a";

test("committed lane-a corpus replays to the committed expected decisions", async () => {
  const { replayCorpus } =
    await import("../../../../tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs");
  const corpus = JSON.parse(readFileSync(`${FIX}/corpus.json`, "utf8"));
  const expected = JSON.parse(readFileSync(`${FIX}/expected-decisions.json`, "utf8"));
  const got = replayCorpus(corpus);
  assert.deepEqual(
    got.map(({ case_id, raw, reason }) => ({ case_id, raw, reason })),
    expected
  );
});

test("corpus covers 3 GREEN variants, every raw code 80-89, and both exemption reasons", () => {
  const expected = JSON.parse(readFileSync(`${FIX}/expected-decisions.json`, "utf8"));
  const raws = expected.map((e) => e.raw);
  const reasons = expected.map((e) => e.reason);
  assert.equal(raws.filter((r) => r === 0).length, 3); // accepted, refusal-bearing, accepted_exempt
  for (let code = 80; code <= 89; code += 1) assert.ok(raws.includes(code), `code ${code} covered`);
  assert.ok(reasons.includes("accepted_exempt"));
  assert.ok(reasons.includes("binding_kind_conflict"));
  assert.ok(reasons.includes("approval_exemption_not_permitted_by_policy"));
  assert.equal(expected.length, 15);
});

test("builder is byte-idempotent (K7 requirement §4.2)", () => {
  execFileSync("node", ["tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs"]);
  const out = execFileSync("git", [
    "status",
    "--porcelain",
    "--",
    "tests/fixtures/llmShield/stage4q",
  ]);
  assert.equal(out.toString().trim(), "");
});
