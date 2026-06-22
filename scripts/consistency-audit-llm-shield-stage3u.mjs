// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { metaSetDigestV2 } from "../tools/simurgh-extraction/metaSetV2.mjs";
import { familyMapDigestV2 } from "../tools/simurgh-extraction/signalFamiliesV2.mjs";
import { metadataGrammarDigest } from "../tools/simurgh-extraction/metadataGrammar.mjs";
import { runDetectorV2 } from "../tools/simurgh-extraction/detectorV2.mjs";
import { verifyExtractionV2 } from "../tools/simurgh-extraction/verify-stage3u-attestation.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3u";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const errors = [];
const mainSet = await rd("meta-set/metadata-set-v2.json");
const regrSet = await rd("meta-set/redteam-a10-regression-set.json");
const cfg = await rd("meta-set/detector-config.json");
const att = await rd("result/attestation.json");
const sidecar = await rd("result/attestation.signature.json");
const pub = await rd("keys/stage3u-public-key.json");
if (att.meta_set_digest !== metaSetDigestV2(mainSet)) errors.push("meta_set_digest mismatch");
if (att.family_map_digest !== familyMapDigestV2() || cfg.family_map_digest !== familyMapDigestV2())
  errors.push("family_map_digest mismatch");
if (
  att.metadata_grammar_digest !== metadataGrammarDigest() ||
  cfg.metadata_grammar_digest !== metadataGrammarDigest()
)
  errors.push("metadata_grammar_digest mismatch");
if (stable(runDetectorV2(mainSet)) !== stable(await rd("result/expected-detector-result-v2.json")))
  errors.push("main result does not reproduce");
if (stable(runDetectorV2(regrSet)) !== stable(await rd("result/redteam-regression-result.json")))
  errors.push("regression result does not reproduce");
if ((await rd("result/redteam-regression-result.json")).decision !== "single_signal_observed")
  errors.push("A10 regression escalated");
// Signature + all bindings actually verify (not just digests).
const { ok } = verifyExtractionV2({
  attestation: att,
  sidecar,
  publicKeyPem: pub.public_key_pem,
  mainSet,
  regressionSet: regrSet,
  detectorConfig: cfg,
});
if (!ok) errors.push("signature/binding verification failed");
if (errors.length) {
  console.error("stage3u consistency: FAIL", JSON.stringify(errors));
  process.exit(1);
}
console.log("stage3u consistency: PASS");
