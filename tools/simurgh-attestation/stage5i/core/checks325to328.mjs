// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC checks 325 (separation) → 328 (adequacy gate). Pure; over R_candidate (no silent
// filtering — every candidate must pass, else the whole bundle fails closed).
import { R } from "./result.mjs";
import { RUNG, rungGte, ADEQUACY_FORBIDDEN_KEYS } from "../constants.mjs";

// Re-instantiated 5G rung lattice. Evidence-driven; any declared rung is ignored.
export function vpcSeparation(ev, ctx) {
  if (!ctx.keyDistinct(ev)) return "below_floor";
  let rung = "distinct_key_only";
  if (ctx.challengeBound(ev)) rung = "challenge_bound";
  if (rung === "challenge_bound" && ctx.externallyAnchored(ev)) rung = "externally_anchored";
  return rung;
}

// 325 — reviewer AND host separation recompute and meet policy, over EVERY candidate (B8: ctx state).
export function checkSeparation(ctx, policy) {
  for (const { fp, receipt } of ctx.R_candidate) {
    const rev = vpcSeparation(ctx.separationEvidence(receipt), ctx);
    const host = vpcSeparation(ctx.hostEvidence(receipt), ctx);
    if (
      rev === "below_floor" ||
      RUNG.index(rev) < RUNG.index(policy.required_reviewer_separation)
    ) {
      return R(325, "reviewer_under_separated", { fp });
    }
    if (host === "below_floor" || RUNG.index(host) < RUNG.index(policy.required_host_separation)) {
      return R(325, "host_under_separated", { fp });
    }
    ctx.computedSeparation.set(fp, {
      reviewer_separation_strength: rev,
      host_separation_strength: host,
    });
  }
  return null;
}

// 326 — affiliation subject/producer/partition/pinned-issuer/relationship valid, issuer ∉ {producer,
// reviewer}. Stashes the subject lineage for 330 (P7/S6). No Self-Vouched Reviewer.
export function checkAffiliation(ctx) {
  const producerDigest = ctx.bundle.partition.content.producer_principal.producer_identity_digest;
  const issuerReg = ctx.cfg.affiliation_issuer_registry;
  for (const { fp, receipt } of ctx.R_candidate) {
    const a = ctx.affiliationAssertion(receipt).content;
    if (a.subject_key_fingerprint !== fp) return R(326, "affiliation_subject_mismatch", { fp });
    if (a.producer_identity_digest !== producerDigest)
      return R(326, "affiliation_producer_mismatch", { fp });
    if (a.partition_digest !== ctx.partition_digest)
      return R(326, "affiliation_partition_mismatch", { fp });
    if (a.relationship !== "independent_of_producer")
      return R(326, "affiliation_relationship_invalid", { fp });
    const issuerFp = a.issued_by.key_fingerprint;
    if (!Object.prototype.hasOwnProperty.call(issuerReg, issuerFp))
      return R(326, "affiliation_issuer_unpinned", { fp });
    if (issuerFp === ctx.bundle.partition.content.producer_principal.key_fingerprint)
      return R(326, "affiliation_issuer_is_producer", { fp });
    if (issuerFp === fp) return R(326, "affiliation_issuer_is_reviewer", { fp });
    ctx._anchorLineage.set(fp, a.subject_affiliation_lineage_digest);
    ctx._affiliation.set(fp, a);
  }
  return null;
}

// 327 — coverage equality: R_eligible = R_candidate (no silent filter); ⋃C over R_eligible == S.
export function checkCoverage(ctx) {
  ctx.R_eligible = ctx.R_candidate;
  const union = new Set();
  for (const { receipt } of ctx.R_eligible)
    for (const s of receipt.content.evaluated_sections) union.add(s);
  const gap = [...ctx.S].filter((s) => !union.has(s));
  ctx.coverage_union = [...union].sort();
  ctx.coverage_gap = gap.sort();
  if (gap.length > 0) return R(327, "section_left_unreviewed", { gap: ctx.coverage_gap });
  return null;
}

// 328 — BEAST A. Any adequacy/quality assertion inside the permitted flat annotations surface fails
// closed, EVEN at full coverage. Scans annotations only (B9a scope fix); nesting is schema-illegal.
export function checkAdequacyGate(bundle) {
  const anns = [];
  const push = (o) => o && o.content && o.content.annotations && anns.push(o.content.annotations);
  push(bundle.attestation);
  push(bundle.partition);
  for (const g of bundle.access_grants ?? []) push(g);
  for (const c of bundle.coverage_receipts ?? []) push(c);
  for (const ann of anns) {
    for (const k of Object.keys(ann)) {
      if (ADEQUACY_FORBIDDEN_KEYS.has(k.normalize("NFC").toLowerCase()))
        return R(328, "adequacy_or_quality_claimed", { key: k });
    }
  }
  return null;
}
