// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4Z VWA mapCore (plan Task 6) — buildMap, recomputeReadout (195), checkSelfReport (197).
import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import {
  buildMap,
  recomputeReadout,
  checkSelfReport,
} from "../../../../tools/simurgh-attestation/stage4z/core/mapCore.mjs";

function f32(values) {
  const b = Buffer.alloc(values.length * 4);
  values.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
}
const saltFor = (k) => "salt:" + k;

// 1 prompt, 1 token position, 1 layer, 1-token lexicon; dot([1,0],[2,0]) = 2 → flags at θ=1.
const declaration = {
  schema: "simurgh.vwa.declaration.v1",
  tokens: [{ token: "fake", token_id: 10 }],
  theta_nano: "1000000000", // θ = 1.0
  corpus_manifest: { prompts: [{ prompt_id: "p0", n_tokens: 1, prompt_digest: "sha256:aa" }] },
  position_rule_id: "all_positions",
  layers: [5],
  tokenizer: "t",
};
const activations = { "p0:0:5": f32([1, 0]) };
const lensRows = { "5:10": f32([2, 0]) };

test("buildMap produces a total-matrix map + sealed audit with self_report=flag_total", () => {
  const { map, audit } = buildMap({ declaration, activations, lensRows, saltFor });
  assert.equal(map.schema, "simurgh.vwa.map.v1");
  assert.equal(map.cells.length, 1);
  assert.equal(map.cells[0].scores[0].score_nano, "2000000000"); // dot = 2.0
  assert.deepEqual(map.cells[0].flags, [10]); // 2.0 ≥ θ 1.0
  assert.equal(map.aggregates.flag_total, 1);
  assert.equal(map.self_report.n_flags, 1); // defaults to the true count
  assert.ok(audit.tensors["act:p0:0:5"] && audit.tensors["lens:5:10"]);
});

test("recomputeReadout (195) passes on a clean map, fires on a doctored score", () => {
  const { map, audit } = buildMap({ declaration, activations, lensRows, saltFor });
  assert.equal(recomputeReadout(map, audit, declaration), null);
  const doctored = structuredClone(map);
  doctored.cells[0].scores[0].score_nano = "999"; // does not match tensors
  assert.equal(recomputeReadout(doctored, audit, declaration).raw, 195);
});

test("checkSelfReport (197) fires only when the claim ≠ recomputed total", () => {
  const { map } = buildMap({ declaration, activations, lensRows, saltFor });
  assert.equal(checkSelfReport(map), null);
  const lying = { ...map, self_report: { n_flags: 0 } }; // claims zero though 1 fired
  assert.equal(checkSelfReport(lying).raw, 197);
});
