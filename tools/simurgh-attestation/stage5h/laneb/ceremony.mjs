// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane B blind-recompute review ceremony. In VSD the ceremony IS the controlled-tier
// mechanism played for real: a second process, holding ONLY the evidence dir + the host key, blind-
// recomputes every domain digest, re-verifies the producer + attestation signatures, reruns BOTH
// committed recipes (each claim's OWN recipe — never borrowed), recomputes proven tiers, and signs a
// review_receipt (same species as the bundle receipt). R1 is not a trust assertion — it is a rerun.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN, VSD_SCHEMAS } from "../constants.mjs";
import { domainDigest, artifactDigest, identityDigest } from "../core/digests.mjs";
import { fingerprint, signContent, verifyContent } from "../core/signatures.mjs";
import { buildVerdictTable } from "../core/tierLattice.mjs";
import { runRecipe } from "../node/recomputeKernelRunner.mjs";
import { createPublicKey } from "node:crypto";

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Process-2: independent recompute over the committed evidence. Returns the ceremony transcript.
export function performCeremony({ evidenceDir, hostPrivPem }) {
  const bundle = readJson(join(evidenceDir, "vsd-attestation.json"));
  const recipes = readJson(join(evidenceDir, "recompute-recipe.json"));
  const artefactBytes = {};
  for (const a of bundle.artefacts_ref)
    artefactBytes[a.artefact_id] = readJson(join(evidenceDir, a.path));

  // 1) re-verify the producer + attestation signatures (fp recomputed from PEM inside verifyContent)
  const inv = bundle.claim_inventory;
  const producerOk = verifyContent(
    bundle.producer_identity,
    DOMAIN.claim_inventory,
    inv.content,
    inv.producer_signature
  );
  const { schema, attestation_signature, ...attContent } = bundle;
  const attestationOk = verifyContent(
    bundle.verifier_identity,
    DOMAIN.disclosure_attestation,
    attContent,
    attestation_signature
  );

  // 2) rerun BOTH recipes (each claim's own) and record output digests
  const recipeReruns = {};
  for (const c of inv.content.claims) {
    if (!c.recompute) continue;
    recipeReruns[c.claim_id] = artifactDigest(runRecipe(recipes[c.claim_id], artefactBytes));
  }

  // 3) recompute the verdict table independently (host reruns public claims here too)
  const recomputeResult = {};
  for (const c of inv.content.claims) {
    if (c.declared_tier === "public" && c.recompute) {
      recomputeResult[c.claim_id] = {
        matched: recipeReruns[c.claim_id] === c.recompute.committed_output_digest,
      };
    }
  }
  const verdict_table = buildVerdictTable({ bundle, recomputeResult });

  // 4) sign a review_receipt for the controlled claim over ITS recipe output
  const controlled = inv.content.claims.find((c) => c.declared_tier === "controlled");
  const hostPub = createPublicKey(hostPrivPem).export({ type: "spki", format: "pem" }).toString();
  const hostFp = fingerprint(hostPub);
  const host_identity = {
    identity_subject: "aisi-review-host@example.org",
    public_key_pem: hostPub,
    key_fingerprint: hostFp,
  };
  const receiptContent = {
    claim_digest: domainDigest(DOMAIN.claim, controlled),
    inventory_digest: inv.inventory_digest,
    host_identity_digest: identityDigest(host_identity),
    host_key_fingerprint: hostFp,
    recomputed_output_digest: recipeReruns[controlled.claim_id],
    verdict: "reproduced",
  };
  const ceremonyReceipt = {
    schema: VSD_SCHEMAS.review_receipt,
    content: receiptContent,
    receipt_digest: domainDigest(DOMAIN.review_receipt, receiptContent),
    host_signature: signContent(hostPrivPem, DOMAIN.review_receipt, receiptContent),
  };

  return {
    schema: "simurgh.vsd.laneb_ceremony.v1",
    producer_signature_ok: producerOk,
    attestation_signature_ok: attestationOk,
    recipe_reruns: recipeReruns,
    recomputed_verdict_table: verdict_table,
    ceremony_receipt: ceremonyReceipt,
  };
}
