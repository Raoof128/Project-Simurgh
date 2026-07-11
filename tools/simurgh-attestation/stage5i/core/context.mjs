// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC context factory. Carries every helper the pure checks call. Crypto is already done
// by the adapter and handed in via `facts` (B11); the context does resolution + pure derivations only.
import { domainDigest, artifactDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

export function makeCtx(bundle, cfg, facts) {
  const affByDigest = new Map();
  for (const a of cfg.affiliation_assertions ?? [])
    affByDigest.set(domainDigest(DOMAINS.affiliation, a.content), a);
  const sepByDigest = new Map();
  for (const s of bundle.reviewer_separation_evidence ?? []) sepByDigest.set(artifactDigest(s), s);
  const hostByDigest = new Map();
  for (const h of bundle.host_separation_evidence ?? []) hostByDigest.set(artifactDigest(h), h);

  const REGISTRY = {
    affiliation_assertion: affByDigest,
    reviewer_separation: sepByDigest,
    host_separation: hostByDigest,
  };

  return {
    bundle,
    cfg,
    facts,
    R_candidate: [],
    computedSeparation: new Map(), // fp → {reviewer_separation_strength, host_separation_strength}  (B8)
    _anchorLineage: new Map(), // fp → subject_affiliation_lineage_digest  (P7, filled by 326)
    _affiliation: new Map(), // fp → resolved assertion  (filled by 326)

    rawReceiptCount: () => bundle.coverage_receipts?.length ?? 0,
    grantDigest: (g) => domainDigest(DOMAINS.grant, g.content),

    resolveExactlyOne(kind, digest) {
      const m = REGISTRY[kind];
      return m && m.has(digest) ? m.get(digest) : undefined;
    },
    separationEvidence(receipt) {
      return this.resolveExactlyOne(
        "reviewer_separation",
        receipt.content.independence_evidence.separation_evidence_digest
      );
    },
    hostEvidence(receipt) {
      return this.resolveExactlyOne(
        "host_separation",
        receipt.content.independence_evidence.host_independence_evidence_digest
      );
    },
    affiliationAssertion(receipt) {
      return this.resolveExactlyOne(
        "affiliation_assertion",
        receipt.content.independence_evidence.affiliation_assertion_digest
      );
    },

    keyDistinct: (ev) =>
      Boolean(ev) && ev.subject_key_fingerprint !== facts.roleFingerprints.verifier,
    challengeBound: (ev) => Boolean(ev) && facts.challengeBoundDigests.has(artifactDigest(ev)),
    externallyAnchored: (ev) => Boolean(ev) && facts.anchoredDigests.has(artifactDigest(ev)),

    anchorLineageOf(fp) {
      return this._anchorLineage.get(fp);
    },
  };
}
