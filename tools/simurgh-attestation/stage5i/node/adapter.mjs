// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — runtime adapter (B11). Verifies every Ed25519 signature / SPKI-DER fingerprint and
// resolves role fingerprints + challenge-bound separation into a normalized `facts` object. The pure
// vpcCore never touches crypto; it consumes `facts`.
import { verifyContent, fingerprint } from "../core/signatures.mjs";
import { domainDigest, artifactDigest } from "../core/digests.mjs";
import { panelSubjectRoot } from "../core/roots.mjs";
import { DOMAINS, CHALLENGE_DOMAIN } from "../constants.mjs";

function safeVerify(identity, domain, content, sig) {
  try {
    return (
      Boolean(identity?.public_key_pem) &&
      fingerprint(identity.public_key_pem) === identity.key_fingerprint &&
      verifyContent(identity, domain, content, sig)
    );
  } catch {
    return false;
  }
}

// Adapter-side panel_subject_root (partition + grants + affiliations + reviewer fps) so the challenge
// binding can be checked. Mirrors the pure roots.mjs input shape; never includes separation evidence.
function subjectRoot(bundle, cfg) {
  return panelSubjectRoot({
    partition_digest: domainDigest(DOMAINS.partition, bundle.partition.content),
    bundle: { access_grants: bundle.access_grants },
    cfg: { affiliation_assertions: cfg.affiliation_assertions },
    grantDigest: (g) => domainDigest(DOMAINS.grant, g.content),
    R_eligible: bundle.coverage_receipts.map((c) => ({
      fp: c.content.reviewer_principal.key_fingerprint,
    })),
  });
}

export function makeAdapterFacts(bundle, cfg) {
  const results = [
    safeVerify(
      bundle.partition.content.producer_principal,
      DOMAINS.partition,
      bundle.partition.content,
      bundle.partition.signature
    ),
  ];
  for (const g of bundle.access_grants)
    results.push(safeVerify(g.content.issued_by, DOMAINS.grant, g.content, g.signature));
  for (const c of bundle.coverage_receipts)
    results.push(safeVerify(c.content.reviewer_principal, DOMAINS.receipt, c.content, c.signature));
  for (const a of cfg.affiliation_assertions)
    results.push(safeVerify(a.content.issued_by, DOMAINS.affiliation, a.content, a.signature));
  if (bundle.attestation) {
    results.push(
      safeVerify(
        bundle.attestation.verifier_identity,
        DOMAINS.attestation,
        bundle.attestation.content,
        bundle.attestation.signature
      )
    );
  }
  const sigValid = results.every(Boolean);

  const roleFingerprints = {
    verifier: cfg.verifier_key_pin.key_fingerprint,
    producer: bundle.partition.content.producer_principal.key_fingerprint,
    grantIssuers: [
      ...new Set(bundle.access_grants.map((g) => g.content.issued_by.key_fingerprint)),
    ],
    affiliationIssuers: [
      ...new Set(cfg.affiliation_assertions.map((a) => a.content.issued_by.key_fingerprint)),
    ],
    reviewers: bundle.coverage_receipts.map((c) => c.content.reviewer_principal.key_fingerprint),
    hosts: bundle.coverage_receipts.map((c) => c.content.review_host_identity_ref.key_fingerprint),
  };

  const expectedRoot = subjectRoot(bundle, cfg);
  const challengeBoundDigests = new Set();
  for (const ev of [...bundle.reviewer_separation_evidence, ...bundle.host_separation_evidence]) {
    const ch = ev.challenge_receipt;
    if (!ch) continue;
    const ok =
      ch.content.bound_panel_subject_root === expectedRoot &&
      ch.content.subject_key_fingerprint === ev.subject_key_fingerprint &&
      ch.verifier_identity.key_fingerprint === cfg.verifier_key_pin.key_fingerprint &&
      safeVerify(ch.verifier_identity, CHALLENGE_DOMAIN, ch.content, ch.signature);
    if (ok) challengeBoundDigests.add(artifactDigest(ev));
  }

  return { sigValid, roleFingerprints, challengeBoundDigests, anchoredDigests: new Set() };
}
