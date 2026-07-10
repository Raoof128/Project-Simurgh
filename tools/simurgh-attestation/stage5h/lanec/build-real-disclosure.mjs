// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane C real-disclosure ingest. Takes a returned `disclosure-package.json` (an
// independent producer's signed claim inventory + artefact bytes, optionally an independent host
// receipt) and assembles a Simurgh-signed attestation-of-record, then verifies it (verify-only —
// NOT rebuildable by us: we do not hold the foreign producer key). Cross-attestation chaining: a
// prior stage's real attestation may appear as a present[] artefact by digest.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN, VSD_SCHEMAS } from "../constants.mjs";
import { domainDigest, artifactDigest, identityDigest } from "../core/digests.mjs";
import { signContent } from "../core/signatures.mjs";
import { buildVerdictTable } from "../core/tierLattice.mjs";
import { runRecomputeKernel } from "../node/recomputeKernelRunner.mjs";
import { evaluateDisclosureSafe } from "../core/vsdCore.mjs";

// pkg = { claim_inventory (producer-signed), review_receipts[], producer_identity, artefacts{id:bytes} }
export function assembleRealAttestation({ pkg, verifierIdentity, verifierPriv }) {
  const claims = pkg.claim_inventory.content.claims;
  const artefacts_ref = Object.keys(pkg.artefacts)
    .sort()
    .map((id) => ({
      artefact_id: id,
      path: `artefacts/${id}.json`,
      digest: artifactDigest(pkg.artefacts[id]),
    }));

  const recomputeResult = runRecomputeKernel({
    claims,
    recipes: pkg.recipes,
    artefactBytes: pkg.artefacts,
  });
  const verdict_table = buildVerdictTable({
    bundle: { claim_inventory: pkg.claim_inventory, review_receipts: pkg.review_receipts || [] },
    recomputeResult,
  });

  const inventory_census_digest = domainDigest(DOMAIN.inventory_census, {
    claim_ids: claims.map((c) => c.claim_id).sort(),
    artefact_ids: artefacts_ref.map((a) => a.artefact_id).sort(),
  });
  const attContent = {
    claim_inventory: pkg.claim_inventory,
    review_receipts: pkg.review_receipts || [],
    producer_identity: pkg.producer_identity,
    verifier_identity: verifierIdentity,
    artefacts_ref,
    verdict_table,
    inventory_census_digest,
  };
  const bundle = {
    schema: VSD_SCHEMAS.disclosure_attestation,
    ...attContent,
    attestation_signature: signContent(verifierPriv, DOMAIN.disclosure_attestation, attContent),
  };
  return { bundle, recipes: pkg.recipes, artefacts: pkg.artefacts };
}

export function verifyAssembled(assembled, { pin, hostRegistry }) {
  const { bundle, recipes, artefacts } = assembled;
  const recomputeResult = runRecomputeKernel({
    claims: bundle.claim_inventory.content.claims,
    recipes,
    artefactBytes: artefacts,
  });
  return evaluateDisclosureSafe(bundle, {
    pin,
    hostRegistry,
    recipes,
    artefactBytes: artefacts,
    recomputeResult,
    tier: "audit",
  });
}

export function writeRealEvidence(outDir, assembled) {
  mkdirSync(join(outDir, "artefacts"), { recursive: true });
  const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");
  writeJson(join(outDir, "vsd-attestation.json"), assembled.bundle);
  writeJson(join(outDir, "recompute-recipe.json"), assembled.recipes);
  for (const a of assembled.bundle.artefacts_ref) {
    writeJson(join(outDir, a.path), assembled.artefacts[a.artefact_id]);
  }
  return outDir;
}
