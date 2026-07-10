// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the portable browser verifier corroborates the committed evidence under Node WebCrypto.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { verifyPortable } from "../../../../tools/simurgh-attestation/stage5h/browser/vsd-portable.mjs";

const EVID = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5h"
);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

test("browser portable verifier: raw null, corroborated true", async () => {
  const bundle = readJson(join(EVID, "vsd-attestation.json"));
  const recipes = readJson(join(EVID, "recompute-recipe.json"));
  const artefacts = {};
  for (const a of bundle.artefacts_ref) artefacts[a.artefact_id] = readJson(join(EVID, a.path));
  const res = await verifyPortable({ bundle, recipes, artefacts });
  assert.equal(res.raw, null);
  assert.equal(res.corroborated, true);
  assert.deepEqual(res.mismatches, []);
  assert.equal(res.verdict_table.length, 3);
});

test("browser portable verifier flags a tampered artefact", async () => {
  const bundle = readJson(join(EVID, "vsd-attestation.json"));
  const recipes = readJson(join(EVID, "recompute-recipe.json"));
  const artefacts = {};
  for (const a of bundle.artefacts_ref) artefacts[a.artefact_id] = readJson(join(EVID, a.path));
  artefacts["eval-results"] = structuredClone(artefacts["eval-results"]);
  artefacts["eval-results"].rows[0].value = "0.10";
  const res = await verifyPortable({ bundle, recipes, artefacts });
  assert.equal(res.corroborated, false);
});
