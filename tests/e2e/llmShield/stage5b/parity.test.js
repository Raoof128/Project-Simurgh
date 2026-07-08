// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — JS<->Python parity over the corpus (plan Task 13). Motto: AnthropicSafe First,
// then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  tallies,
  floorReconcile,
} from "../../../../tools/simurgh-attestation/stage5b/core/asrCore.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const PY = join(ROOT, "tools/simurgh-attestation/stage5b/python/var_parity.py");
const ATT = join(ROOT, "docs/research/llm-shield/evidence/stage-5b/attestation.json");
const bundle = JSON.parse(readFileSync(ATT, "utf8"));
const py = (mode) => execFileSync("python3", [PY, mode, ATT], { encoding: "utf8" }).trim();

test("JS tallies == Python tallies (canonical)", () => {
  assert.equal(canonicalJson(tallies(bundle.findings)), py("tallies"));
});

test("JS ASR == Python ASR", () => {
  assert.equal(bundle.attestation.aggregates.asr, py("asr"));
  assert.equal(py("asr"), "0/46");
});

test("JS floor reconciliation == Python floor reconciliation (canonical)", () => {
  assert.equal(canonicalJson(floorReconcile(bundle.findings, bundle.floors)), py("floor"));
});
