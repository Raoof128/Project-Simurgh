// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — Ed25519 attestation domains. DISTINCT from every 5L SIG.* domain (G-L): public/audit tiers
// are separately domain-separated so a public attestation can never be replayed as an audit one.
export const SIG5M = Object.freeze({
  public: "simurgh.vtcquorum.attestation_public.v1",
  audit: "simurgh.vtcquorum.attestation_audit.v1",
});
