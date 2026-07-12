// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L — VTC-Q raw 365: ALL committed-digest binding failures. Recomputes the commitment_session_id
// from the ceremony_contract, recomputes each policy-content digest and compares to the committed digest,
// checks committed-vs-cfg profile match (P7), and the raw-byte anchor imprint binding
// (messageImprintBindsRawBytes / ots_leaf == commitment_digest_bytes).
import { R } from "./result.mjs";
import { artifactDigest } from "./digests.mjs";

const POLICY_CONTENT = [
  ["review_window", "review_window_policy_digest"],
  ["anchor_policy", "anchor_policy_digest"],
  ["quorum_policy", "quorum_policy_digest"],
  ["trust_domain_registry", "trust_domain_registry_digest"],
  ["declared_release_surface", "declared_release_surface_digest"],
];

export function checkCommitment(ctx) {
  const { bundle } = ctx;
  const cc = bundle.ceremony_contract;

  if (bundle.commitment_session_id !== ctx.commitmentSessionIdRecomputed) {
    return R(365, "commitment_session_id_mismatch");
  }
  for (const [contentKey, digestKey] of POLICY_CONTENT) {
    if (artifactDigest(bundle[contentKey]) !== cc[digestKey]) {
      return R(365, "policy_digest_unbound", { policy: contentKey });
    }
  }
  if (!ctx.profileMatch) return R(365, "profile_committed_vs_cfg_mismatch");

  // raw-byte anchor imprint binding (never the ASCII "sha256:…")
  const wantHex = ctx.commitmentDigestHex;
  if (ctx.tsaAnchor) {
    const mi = ctx.tsaFact?.messageImprintHex;
    if (mi !== wantHex) return R(365, "tsa_message_imprint_not_commitment_bytes");
  }
  if (ctx.otsAnchor) {
    const leaf = ctx.facts?.otsLeafHex?.[ctx.otsAnchor.ots_proof_digest];
    if (leaf !== wantHex) return R(365, "ots_leaf_not_commitment_bytes");
  }
  return null;
}
