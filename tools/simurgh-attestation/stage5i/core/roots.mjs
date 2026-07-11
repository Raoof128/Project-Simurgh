// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC evidence roots. Two roots break the challenge cycle (B4): panel_subject_root EXCLUDES
// challenge receipts + coverage receipts; the Lane-C challenge binds subject_root only.
import { artifactDigest, domainDigest } from "./digests.mjs";
import { DOMAINS } from "../constants.mjs";

const sortedRoot = (arr) => artifactDigest([...arr].sort());

// subject_root = partition + grants + identities + affiliation-assertion digests (NO challenge/receipts).
export function panelSubjectRoot(ctx) {
  const parts = [`partition:${ctx.partition_digest}`];
  for (const g of ctx.bundle.access_grants) parts.push(`grant:${ctx.grantDigest(g)}`);
  for (const a of ctx.cfg.affiliation_assertions)
    parts.push(`aff:${domainDigest(DOMAINS.affiliation, a.content)}`);
  for (const { fp } of ctx.R_eligible ?? ctx.R_candidate) parts.push(`rev:${fp}`);
  return sortedRoot(parts);
}

// evidence_root = subject_root + challenge/anchor evidence + receipts + separation digests.
export function panelEvidenceRoot(ctx) {
  const parts = [`subject:${panelSubjectRoot(ctx)}`];
  for (const c of ctx.bundle.coverage_receipts) parts.push(`receipt:${artifactDigest(c.content)}`);
  for (const s of ctx.bundle.reviewer_separation_evidence) parts.push(`sep:${artifactDigest(s)}`);
  for (const h of ctx.bundle.host_separation_evidence) parts.push(`hostsep:${artifactDigest(h)}`);
  return sortedRoot(parts);
}

// trust_context = policy + registries + verifier pin + policy_pin.
export function trustContextDigest(ctx) {
  return artifactDigest({
    policy: ctx.cfg.policy,
    policy_pin: ctx.cfg.policy_pin,
    reviewer_registry: ctx.cfg.reviewer_registry,
    host_registry: ctx.cfg.host_registry,
    affiliation_issuer_registry: ctx.cfg.affiliation_issuer_registry,
    verifier_key_pin: ctx.cfg.verifier_key_pin,
  });
}
