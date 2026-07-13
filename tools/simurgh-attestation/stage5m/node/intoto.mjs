// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5M — I-B: emit-only in-toto Statement carrying the containment-quorum verdict as a CANDIDATE
// predicate so a lab's Sigstore/cosign tooling can ingest it. No verification path; ships its own
// anti-gaming non-claim (unregistered; not in-toto/SCITT-conforming).
export function emitContainmentQuorumPredicate(bundle, verdict) {
  const dHex = (bundle.commitment_session_id ?? "sha256:").slice("sha256:".length);
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [{ name: "vtc-quorum", digest: { sha256: dHex } }],
    predicateType: "https://simurgh.dev/attestation/containment-quorum/v0",
    predicate: {
      outcome_class: verdict.outcome_class ?? null,
      ecology_independence_number: verdict.ecology_independence_number ?? null,
      externally_anchored: verdict.externally_anchored ?? false,
      raw: verdict.raw,
      non_conformance:
        "unregistered candidate predicate; not in-toto/SCITT-conforming; emitted for interoperability exploration only",
    },
  };
}
