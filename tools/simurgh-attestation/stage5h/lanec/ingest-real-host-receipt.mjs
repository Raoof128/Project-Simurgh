// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — Lane C ingest of a REAL independent-party review-host receipt. An unaffiliated host
// (own key, own machine) reran OUR committed Lane-A controlled recipe and counter-signed an R1 receipt
// reproducing our committed output byte-for-byte. We swap that real receipt into our attestation, pin
// the host's key (from OUTSIDE the bundle), re-sign the OUTER attestation with our verifier key, and
// verify raw 0. Verify-only: the receipt is signed by a key we do NOT hold (non-possession is the point).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { buildSyntheticBundle } from "../node/buildBundle.mjs";
import { evaluateDisclosureSafe } from "../core/vsdCore.mjs";
import { runRecomputeKernel } from "../node/recomputeKernelRunner.mjs";
import { signContent, fingerprint } from "../core/signatures.mjs";
import { identityDigest } from "../core/digests.mjs";
import { DOMAIN } from "../constants.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const OUT = join(ROOT, "docs/research/llm-shield/evidence/stage-5h/real-disclosure");
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + "\n");

export function ingestRealHostReceipt({
  receiptPath,
  hostSubject = "droplet-review-host",
  outDir = OUT,
}) {
  const rr = JSON.parse(readFileSync(receiptPath, "utf8"));
  const hostPem = rr.host_public_key_pem;
  const hostFp = fingerprint(hostPem);
  if (hostFp !== rr.content.host_key_fingerprint)
    throw new Error("receipt host fp does not match its PEM");

  const fx = buildSyntheticBundle();
  const b = fx.bundle;
  if (rr.content.claim_digest !== b.review_receipts[0].content.claim_digest) {
    throw new Error("receipt does not review our committed controlled claim");
  }
  if (rr.content.inventory_digest !== b.claim_inventory.inventory_digest) {
    throw new Error("receipt inventory_digest does not match ours");
  }
  if (hostFp === b.verifier_identity.key_fingerprint)
    throw new Error("host key is not distinct from verifier");

  // swap in the REAL host receipt (strip the PEM into the external registry), re-sign the attestation
  b.review_receipts = [
    {
      schema: rr.schema,
      content: rr.content,
      receipt_digest: rr.receipt_digest,
      host_signature: rr.host_signature,
    },
  ];
  const { attestation_signature, schema, ...att } = b;
  b.attestation_signature = signContent(
    fx.keys.verifierKey.priv,
    DOMAIN.disclosure_attestation,
    att
  );

  const hostRegistry = [
    { host_subject: hostSubject, host_key_fingerprint: hostFp, public_key_pem: hostPem },
  ];
  const pin = {
    key_fingerprint: b.verifier_identity.key_fingerprint,
    identity_subject: b.verifier_identity.identity_subject,
    identity_digest: identityDigest(b.verifier_identity),
  };
  const recomputeResult = runRecomputeKernel({
    claims: b.claim_inventory.content.claims,
    recipes: fx.recipes,
    artefactBytes: fx.artefacts,
  });
  const res = evaluateDisclosureSafe(b, {
    pin,
    hostRegistry,
    recipes: fx.recipes,
    artefactBytes: fx.artefacts,
    recomputeResult,
    tier: "audit",
  });

  mkdirSync(join(outDir, "artefacts"), { recursive: true });
  writeJson(join(outDir, "vsd-attestation.json"), b);
  writeJson(join(outDir, "recompute-recipe.json"), fx.recipes);
  for (const a of b.artefacts_ref) writeJson(join(outDir, a.path), fx.artefacts[a.artefact_id]);
  writeJson(join(outDir, "pin.json"), pin);
  writeJson(join(outDir, "host-registry.json"), hostRegistry);
  return { raw: res.raw, hostFp, verifierFp: b.verifier_identity.key_fingerprint, outDir };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const receiptPath = process.argv[2];
  const r = ingestRealHostReceipt({ receiptPath });
  console.log(
    `[5h] real-disclosure ingested: raw ${r.raw} | host ${r.hostFp.slice(0, 20)} ≠ verifier ${r.verifierFp.slice(0, 20)}`
  );
  process.exitCode = r.raw === 0 ? 0 : 1;
}
