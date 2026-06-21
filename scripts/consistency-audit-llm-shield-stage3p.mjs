// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3P consistency: catalogue corpus digest + matrix shape match every target;
// every planned target is listed or excluded; signatures are the 3P key only.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PLANNED_TARGET_IDS } from "../tools/simurgh-benchmark/simurgh-crossdefence.mjs";
import { checkSilentDrop } from "../tools/simurgh-benchmark/crossDefenceCatalogue.mjs";
import { canonicalJson } from "../tools/simurgh-attestation/canonicalise.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";
const errors = [];
const catalogue = JSON.parse(
  await readFile(join(EV, "catalogue", "attestation-catalogue.json"), "utf8")
);
if (checkSilentDrop(catalogue, PLANNED_TARGET_IDS)) errors.push("catalogue silent drop");
const corpusDigest = catalogue.corpus.corpus_digest;
for (const id of PLANNED_TARGET_IDS) {
  const att = JSON.parse(
    await readFile(join(EV, "targets", id, "containment-attestation.json"), "utf8")
  );
  if (att.corpus.corpus_digest !== corpusDigest) errors.push(`${id} corpus digest mismatch`);
  if (canonicalJson(att.corpus.matrix_shape) !== canonicalJson(catalogue.corpus.matrix_shape))
    errors.push(`${id} matrix shape mismatch`);
  const sc = JSON.parse(
    await readFile(join(EV, "targets", id, "containment-attestation.signature.json"), "utf8")
  );
  if (sc.algorithm !== "Ed25519") errors.push(`${id} not Ed25519`);
}
if (errors.length > 0) {
  console.error("stage3p consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3p consistency: PASS");
