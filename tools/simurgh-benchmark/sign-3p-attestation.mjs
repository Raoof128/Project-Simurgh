// SPDX-License-Identifier: AGPL-3.0-or-later
// Local-only signer for Stage 3P. Reads the private key from
// SIMURGH_3P_PRIVATE_KEY_PATH (default ~/.simurgh/3p-ed25519.pem); CI never runs
// this. Signs every per-target attestation (coverage.json -> containment-attestation
// .json + sidecar) and the catalogue, reusing the 3M canonicalisation primitives.
import crypto from "node:crypto";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { buildCatalogue } from "./crossDefenceCatalogue.mjs";
import { MATRIX_SHAPE } from "./crossDefenceMatrix.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3p";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";

function sidecarFor(bundle, privPem, pubPem) {
  const canonical = Buffer.from(canonicalJson(bundle), "utf8");
  const signature = crypto.sign(null, canonical, crypto.createPrivateKey(privPem));
  return {
    schema: "simurgh.cross_defence.signature.v1",
    algorithm: "Ed25519",
    canonicalisation: "simurgh.canonical-json.v1",
    bundle_sha256: sha256Hex(canonical),
    public_key_fingerprint: fingerprintPublicKey(pubPem),
    signature: "base64:" + signature.toString("base64"),
  };
}

async function main() {
  const keyPath =
    process.env.SIMURGH_3P_PRIVATE_KEY_PATH || join(homedir(), ".simurgh", "3p-ed25519.pem");
  const priv = await readFile(keyPath, "utf8");
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3p-public-key.json"), "utf8"));
  const pubPem = pub.public_key_pem;

  const ids = (await readdir(join(EV, "targets"), { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const catalogueTargets = [];
  for (const id of ids) {
    const bundle = JSON.parse(await readFile(join(EV, "targets", id, "coverage.json"), "utf8"));
    const sidecar = sidecarFor(bundle, priv, pubPem);
    await writeFile(join(EV, "targets", id, "containment-attestation.json"), stable(bundle));
    await writeFile(
      join(EV, "targets", id, "containment-attestation.signature.json"),
      stable(sidecar)
    );
    catalogueTargets.push({
      target_id: id,
      provenance: bundle.target.provenance,
      execution_trust: bundle.target.execution_trust,
      attestation: bundle,
    });
  }

  const corpusDigest = catalogueTargets[0].attestation.corpus.corpus_digest;
  const catalogue = buildCatalogue({
    corpusDigest,
    matrixShape: MATRIX_SHAPE,
    targets: catalogueTargets,
    excludedTargets: [],
  });
  const catSidecar = sidecarFor(catalogue, priv, pubPem);
  await writeFile(join(EV, "catalogue", "attestation-catalogue.json"), stable(catalogue));
  await writeFile(
    join(EV, "catalogue", "attestation-catalogue.signature.json"),
    stable(catSidecar)
  );
  console.log(
    "stage3p: signed",
    ids.length,
    "target attestations + catalogue; fingerprint",
    catSidecar.public_key_fingerprint
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
