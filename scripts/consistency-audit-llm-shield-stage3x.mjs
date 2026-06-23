// SPDX-License-Identifier: AGPL-3.0-or-later
// Re-derives the index + verifies the signature. Chain-level: recomputes sha256 of every
// evidence-root rung's evidence-hashes.json vs the signed evidence_root_digest (10/10,
// format-independent). Deep: runs the strict generic verifier on the current-format rungs (5/5).
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "../tools/simurgh-attestation/canonicalise.mjs";
import { verifyTimeline } from "../tools/simurgh-attestation/verify-stage3x-timeline.mjs";
import { buildIndexFile } from "../tools/simurgh-attestation/build-3x-timeline.mjs";
import { verifyEvidenceHashes } from "../tools/simurgh-attestation/verifyEvidenceHashesLib.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3x";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const committed = await rd("timeline.index.json");
if (stable(committed) !== stable(buildIndexFile())) {
  console.error("index does not re-derive");
  process.exit(1);
}
const sidecar = await rd("timeline.signature.json");
const pub = (await rd("keys/stage3x-public-key.json")).public_key_pem;
const r = verifyTimeline({ index: committed, sidecar, publicKeyPem: pub, reproduce: true, rebuild: buildIndexFile });
if (!r.ok) {
  console.error("consistency: verify failed", JSON.stringify(r.checks));
  process.exit(1);
}
let rootFail = 0;
let rootTotal = 0;
for (const rung of committed.rungs.filter((x) => x.evidence_hashes_available)) {
  rootTotal += 1;
  const live = sha256Hex(readFileSync(`${rung.evidence_dir}/evidence-hashes.json`, "utf8"));
  if (live !== rung.evidence_root_digest) {
    console.error("evidence-root digest drift:", rung.stage);
    rootFail += 1;
  }
}
let deepFail = 0;
let deepTotal = 0;
for (const rung of committed.rungs.filter((x) => x.deep_rewalk_mode === "strict_current_format")) {
  deepTotal += 1;
  if (!verifyEvidenceHashes(rung.evidence_dir).ok) {
    console.error("deep re-walk failed:", rung.stage);
    deepFail += 1;
  }
}
if (rootFail || deepFail) process.exit(1);
console.log(
  `stage3x consistency audit: PASS (index + signature + evidence-root ${rootTotal}/${rootTotal} + deep re-walk ${deepTotal}/${deepTotal})`
);
