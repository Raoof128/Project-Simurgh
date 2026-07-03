// SPDX-License-Identifier: AGPL-3.0-or-later
// Attestation + manifest (spec §4.6). The attestation is the TIER-P payload: sorted-leaf
// Merkle roots + aggregates, never ledger content ("dual safety": provider-safe shape,
// reviewer-safe recomputability). Tier A = same bundle + ledger files.
import { sign, verify } from "node:crypto";
import { domainBytes, publicKeyFingerprint } from "../../stage4d/stage4dCrypto.mjs";
import { canonicalJson, merkleRootSorted, recordDigest } from "../core/canonical.mjs";
import { chainDigest } from "../core/disclosureCore.mjs";
import {
  VXD_ATTESTATION_SCHEMA,
  VXD_KNOWN_LIMITATIONS,
  VXD_MANIFEST_DOMAIN,
  VXD_MANIFEST_SCHEMA,
  VXD_NON_CLAIMS,
} from "../constants.mjs";

export const vxdAttestationDigest = (a) => recordDigest(a);

export function buildVxdAttestation({
  windows,
  mergeEvents,
  rescoreRecords,
  disclosure,
  contests,
  acks,
  chain,
  sourceCcbManifestDigest,
  leanProofDigest,
}) {
  const histogram = {};
  let exposure = 0;
  for (const w of windows) {
    for (const c of w.clusters) {
      exposure += c.cluster_weighted_total;
      histogram[c.cluster_size] = (histogram[c.cluster_size] ?? 0) + 1;
    }
  }
  const breached = new Set(rescoreRecords.flatMap((r) => r.breached_after));
  const attestation = {
    schema: VXD_ATTESTATION_SCHEMA,
    windows_root: merkleRootSorted(windows.map(recordDigest)),
    merge_chain_root: merkleRootSorted(mergeEvents.map(recordDigest)),
    rescore_root: merkleRootSorted(rescoreRecords.map(recordDigest)),
    disclosure_root: merkleRootSorted(disclosure ? [recordDigest(disclosure)] : []),
    contest_root: merkleRootSorted([...contests, ...acks].map(recordDigest)),
    chain_digest: chainDigest(chain),
    aggregates: {
      window_count: windows.length,
      breach_count: breached.size,
      newly_revealed_count: new Set(rescoreRecords.flatMap((r) => r.newly_revealed)).size,
      exposure_mass_total: exposure,
      cluster_size_histogram: histogram,
    },
    source_ccb_manifest_digest: sourceCcbManifestDigest,
    lean_proof_digest: leanProofDigest,
    demand_side_evidence_digest: null,
    corroborating_commitments: [],
    known_limitations: [...VXD_KNOWN_LIMITATIONS],
    non_claims: [...VXD_NON_CLAIMS],
  };
  // Aggregate-only guard: no ledger-level cluster commitment may leak into Tier P.
  const flat = canonicalJson(attestation);
  for (const w of windows) {
    for (const c of w.clusters) {
      if (flat.includes(c.cluster_commitment)) {
        throw new Error("tier_p_leak: cluster commitment in attestation");
      }
    }
  }
  return attestation;
}

export function buildVxdManifest({ attestation, privateKey, publicKeyPem }) {
  const payload = {
    schema: VXD_MANIFEST_SCHEMA,
    attestation_digest: vxdAttestationDigest(attestation),
  };
  const signature = `ed25519:${sign(null, domainBytes(VXD_MANIFEST_DOMAIN, payload), privateKey).toString("base64")}`;
  return {
    ...payload,
    signature,
    public_key_fingerprint: `sha256:${publicKeyFingerprint(publicKeyPem)}`,
  };
}

export function verifyVxdManifest({ manifest, attestation, publicKey }) {
  const { signature, public_key_fingerprint, ...payload } = manifest;
  if (payload.schema !== VXD_MANIFEST_SCHEMA)
    return { ok: false, reason: "manifest_schema_mismatch" };
  if (payload.attestation_digest !== vxdAttestationDigest(attestation)) {
    return { ok: false, reason: "attestation_digest_mismatch" };
  }
  if (typeof signature !== "string" || !signature.startsWith("ed25519:")) {
    return { ok: false, reason: "signature_malformed" };
  }
  try {
    const ok = verify(
      null,
      domainBytes(VXD_MANIFEST_DOMAIN, payload),
      publicKey,
      Buffer.from(signature.slice("ed25519:".length), "base64")
    );
    return ok ? { ok: true } : { ok: false, reason: "signature_invalid" };
  } catch {
    return { ok: false, reason: "signature_invalid" };
  }
}
