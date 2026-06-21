// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { metaSetDigest } from "../tools/simurgh-extraction/metaSet.mjs";
import { familyMapDigest } from "../tools/simurgh-extraction/signalFamilies.mjs";
import { runDetector } from "../tools/simurgh-extraction/detector.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3t";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const errors = [];
const set = await rd("meta-set/metadata-set.json");
const cfg = await rd("meta-set/detector-config.json");
const att = await rd("result/attestation.json");
if (att.meta_set_digest !== metaSetDigest(set)) errors.push("meta_set_digest mismatch");
if (att.family_map_digest !== familyMapDigest())
  errors.push("attestation family_map_digest mismatch");
if (cfg.family_map_digest !== familyMapDigest()) errors.push("config family_map_digest mismatch");
const result = runDetector(set);
const committed = await rd("result/expected-detector-result.json");
if (stable(result) !== stable(committed)) errors.push("detector result does not reproduce");
if (att.decision !== result.decision) errors.push("attestation/result decision mismatch");
if (errors.length) {
  console.error("stage3t consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3t consistency: PASS");
