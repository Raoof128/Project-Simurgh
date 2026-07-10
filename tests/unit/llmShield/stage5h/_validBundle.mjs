// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the unit fixture. The bundle CONSTRUCTION lives in the production builder
// (node/buildBundle.mjs) so evidence and tests share one byte-identical source; this file adds the
// test-only resign helpers and re-exports the deterministic mean for parity assertions.
import { signContent } from "../../../../tools/simurgh-attestation/stage5h/core/signatures.mjs";
import { domainDigest } from "../../../../tools/simurgh-attestation/stage5h/core/digests.mjs";
import { DOMAIN } from "../../../../tools/simurgh-attestation/stage5h/constants.mjs";
import {
  buildSyntheticBundle,
  claimDigest,
} from "../../../../tools/simurgh-attestation/stage5h/node/buildBundle.mjs";
import { aggregateMean } from "../../../../tools/simurgh-attestation/stage5h/node/recomputeKernelRunner.mjs";

export { claimDigest, aggregateMean };
export const validBundle = buildSyntheticBundle;

// Re-sign ALL signed objects after a content mutation (inventory + every receipt + attestation).
export function resign(bundle, keys) {
  const { producerKey, hostKey } = keys;
  const inv = bundle.claim_inventory;
  inv.inventory_digest = domainDigest(DOMAIN.claim_inventory, inv.content);
  inv.producer_signature = signContent(producerKey.priv, DOMAIN.claim_inventory, inv.content);
  for (const r of bundle.review_receipts) {
    r.content.inventory_digest = inv.inventory_digest;
    r.receipt_digest = domainDigest(DOMAIN.review_receipt, r.content);
    r.host_signature = signContent(hostKey.priv, DOMAIN.review_receipt, r.content);
  }
  return resignAttestationOnly(bundle, keys);
}

// Re-sign ONLY the outer attestation (leave inventory + receipts as-is). Needed to test an inner
// signature failure (e.g. a bad host receipt) while keeping the attestation itself valid.
export function resignAttestationOnly(bundle, keys) {
  const { verifierKey } = keys;
  const { attestation_signature, schema, ...attContent } = bundle;
  bundle.attestation_signature = signContent(
    verifierKey.priv,
    DOMAIN.disclosure_attestation,
    attContent
  );
  return bundle;
}
