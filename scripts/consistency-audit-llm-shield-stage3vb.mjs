// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyExternalDefense } from "../tools/simurgh-attestation/verify-stage3vb-external-defense.mjs";
import { buildExternalDefenseBundle } from "../tests/e2e/llm_shield_stage3vb_external_defense_runner.mjs";
const EV = "docs/research/llm-shield/evidence/stage-3v-b";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

const committed = await rd("attestation.bundle.json");
if (stable(committed) !== stable(buildExternalDefenseBundle())) {
  console.error("bundle does not re-derive");
  process.exit(1);
}
const sidecar = await rd("attestation.signature.json");
const pub = (await rd("keys/stage3vb-public-key.json")).public_key_pem;
const r = verifyExternalDefense({
  bundle: committed,
  sidecar,
  publicKeyPem: pub,
  reproduce: true,
  rebuild: buildExternalDefenseBundle,
});
if (!r.ok) {
  console.error("consistency: verify failed", JSON.stringify(r.checks));
  process.exit(1);
}
console.log("stage3vb consistency audit: PASS");
