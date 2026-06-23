// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyWitness } from "../tools/simurgh-attestation/verify-stage3w-witness.mjs";
import {
  buildBundle,
  buildWitnessVerdictFile,
} from "../tools/simurgh-attestation/build-3w-witness.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3w";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const committed = await rd("attestation.bundle.json");
if (stable(committed) !== stable(buildBundle())) {
  console.error("bundle does not re-derive");
  process.exit(1);
}
const sidecar = await rd("attestation.signature.json");
const pub = (await rd("keys/stage3w-public-key.json")).public_key_pem;
const r = verifyWitness({
  bundle: committed,
  sidecar,
  publicKeyPem: pub,
  reproduce: true,
  rebuild: buildBundle,
  rebuildVerdict: buildWitnessVerdictFile,
});
if (!r.ok) {
  console.error("consistency: verify failed", JSON.stringify(r.checks));
  process.exit(1);
}
console.log("stage3w consistency audit: PASS");
