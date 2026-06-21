// SPDX-License-Identifier: AGPL-3.0-or-later
// CI verify-only: signature + hash chain + digest + fingerprint + no ranking, plus
// the referenced 3P catalogue/target digests still match committed files.
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  canonicalJson,
  sha256Hex,
  fingerprintPublicKey,
} from "../simurgh-attestation/canonicalise.mjs";
import { verifyRegistryHashChain } from "./registryChain.mjs";
import { detectCrossTargetRankingExport } from "./temporalLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3q";

export function verifyRegistry({ registry, sidecar, publicKeyPem }) {
  const checks = {};
  checks.chain_valid = verifyRegistryHashChain(registry).ok;
  checks.no_cross_target_ranking = detectCrossTargetRankingExport(registry) === null;
  const canonical = Buffer.from(canonicalJson(registry), "utf8");
  checks.bundle_digest_match = sidecar.bundle_sha256 === sha256Hex(canonical);
  checks.key_fingerprint_match =
    sidecar.public_key_fingerprint === fingerprintPublicKey(publicKeyPem);
  const sig = Buffer.from(sidecar.signature.replace(/^base64:/, ""), "base64");
  checks.signature_valid = crypto.verify(
    null,
    canonical,
    crypto.createPublicKey(publicKeyPem),
    sig
  );
  return { ok: Object.values(checks).every(Boolean), checks };
}

// The registry signs CLAIMS about 3P evidence; prove the referenced files still match.
export async function verifyRegistryReferences(registry) {
  const errors = [];
  for (const entry of registry.entries ?? []) {
    const snap = entry.entry_body.snapshot;
    const catalogue = JSON.parse(await readFile(snap.catalogue_path, "utf8"));
    if (sha256Hex(canonicalJson(catalogue)) !== snap.catalogue_digest)
      errors.push(`catalogue digest mismatch in entry ${entry.entry_body.entry_index}`);
    if (catalogue.corpus?.corpus_digest !== snap.corpus_digest)
      errors.push(`corpus digest mismatch in entry ${entry.entry_body.entry_index}`);
    for (const t of snap.target_attestations ?? []) {
      const att = JSON.parse(await readFile(t.target_attestation_path, "utf8"));
      if (sha256Hex(canonicalJson(att)) !== t.target_attestation_digest)
        errors.push(`target ${t.target_lineage_id} attestation digest mismatch`);
      if (att.target?.target_id !== t.target_lineage_id)
        errors.push(`target ${t.target_lineage_id} lineage != attestation target_id`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function main() {
  const registry = JSON.parse(await readFile(join(EV, "registry", "registry.json"), "utf8"));
  const sidecar = JSON.parse(
    await readFile(join(EV, "registry", "registry.signature.json"), "utf8")
  );
  const pub = JSON.parse(await readFile(join(EV, "keys", "stage3q-public-key.json"), "utf8"));
  const { ok, checks } = verifyRegistry({ registry, sidecar, publicKeyPem: pub.public_key_pem });
  const refs = await verifyRegistryReferences(registry);
  console.log(
    JSON.stringify({ ...checks, references_valid: refs.ok, reference_errors: refs.errors }, null, 2)
  );
  if (!ok || !refs.ok) {
    console.error("stage3q registry verify: FAIL");
    process.exit(1);
  }
  console.log("stage3q registry verify: PASS");
}

if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
