// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 4S Lane A corpus gate (4S spec §12, §13): every committed fixture reaches
// its expected raw code; the corpus covers 0 and 100-117 except 104 (cycle) and
// 118 (typed wrapper), which are unit-tested over the real detection code; and the
// builder is byte-stable.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { evaluateChainSafe } from "../../../../tools/simurgh-attestation/stage4s/core/chainCore.mjs";
import { buildAllFixtures } from "../../../../tools/simurgh-attestation/stage4s/node/build-stage4s-fixtures.mjs";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const FIX = join(ROOT, "docs/research/llm-shield/evidence/stage-4s/fixtures");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const index = readJson(join(FIX, "corpus-index.json"));

test("every committed fixture reaches its expected raw code", () => {
  for (const c of index.cases) {
    const bundle = readJson(join(FIX, c.file));
    assert.equal(evaluateChainSafe(bundle).raw, c.expected_raw, c.name);
  }
});

test("corpus covers 0 and 100-117 except 104 (documented defensive codes)", () => {
  const covered = new Set(index.cases.map((c) => c.expected_raw));
  const expected = [0];
  for (let r = 100; r <= 117; r++) if (r !== 104) expected.push(r);
  for (const r of expected) assert.ok(covered.has(r), `raw ${r} covered by a fixture`);
  // 104 (cycle) is unreachable via well-formed content-addressed bundles; 118 is
  // typed-wrapper only. Both are exercised by unit tests, not corpus files.
  assert.ok(!covered.has(104));
  assert.ok(!covered.has(118));
});

test("fixture builder is byte-stable (deterministic Ed25519 + canonical JSON)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "stage4s-fix-"));
  buildAllFixtures(tmp);
  for (const f of readdirSync(FIX)) {
    assert.equal(readFileSync(join(tmp, f), "utf8"), readFileSync(join(FIX, f), "utf8"), f);
  }
});
