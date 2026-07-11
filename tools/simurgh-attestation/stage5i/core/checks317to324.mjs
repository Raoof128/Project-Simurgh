// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — VPC checks 317 (external config) → 324 (evaluation). Pure; crypto arrives via `facts`.
import { R } from "./result.mjs";
import { domainDigest, identityDigest } from "./digests.mjs";
import { roleCollisionOk } from "./signatures.mjs";
import { DOMAINS } from "../constants.mjs";

// 317 — external registries/pin/policy present & consistent; policy externally pinned (B7); producer
// excluded from the affiliation-issuer registry. Undefined cfg is handled as 331 by vpcCore.
export function checkExternalConfig(cfg, bundle) {
  if (cfg == null || typeof cfg !== "object") return R(317, "config_malformed");
  for (const k of [
    "affiliation_assertions",
    "reviewer_registry",
    "host_registry",
    "affiliation_issuer_registry",
    "verifier_key_pin",
    "policy",
    "policy_pin",
  ]) {
    if (cfg[k] == null) return R(317, `missing_${k}`);
  }
  const pd = domainDigest(DOMAINS.policy, cfg.policy);
  if (pd !== cfg.policy_pin.policy_digest) return R(317, "policy_pin_mismatch"); // swapping both still fails vs pin
  if (cfg.policy.profile_id !== cfg.policy_pin.profile_id) return R(317, "policy_profile_mismatch");
  const producerFp = bundle?.partition?.content?.producer_principal?.key_fingerprint;
  if (
    producerFp &&
    Object.prototype.hasOwnProperty.call(cfg.affiliation_issuer_registry, producerFp)
  ) {
    return R(317, "producer_in_affiliation_registry");
  }
  return null;
}

// 318 handled inline in vpcCore (rawReceiptCount).

// 319 — signatures + role bindings + collisions. PURE over facts (adapter verified the Ed25519). B11.
export function checkSignaturesAndRoles(ctx) {
  if (ctx.facts.sigValid !== true) return R(319, "signature_invalid");
  if (ctx.facts.roleFingerprints.verifier !== ctx.cfg.verifier_key_pin.key_fingerprint) {
    return R(319, "verifier_not_pinned");
  }
  const rc = roleCollisionOk(ctx.facts.roleFingerprints);
  if (!rc.ok) return R(319, rc.reason);
  return null;
}

// 320 — partition commitment recomputes over source+procedure+producer; producer identity bound; every
// grant/affiliation reference matches the recomputed partition_digest.
export function checkPartition(ctx) {
  const pc = ctx.bundle.partition.content;
  const pd = domainDigest(DOMAINS.partition, pc);
  if (identityDigest(pc.producer_principal) !== pc.producer_principal.producer_identity_digest) {
    return R(320, "producer_identity_digest_mismatch");
  }
  for (const g of ctx.bundle.access_grants) {
    if (g.content.partition_digest !== pd) return R(320, "grant_partition_digest_mismatch");
  }
  for (const a of ctx.cfg.affiliation_assertions) {
    if (a.content.partition_digest !== pd) return R(320, "affiliation_partition_digest_mismatch");
  }
  ctx.partition_digest = pd;
  ctx.S = new Set(pc.sections.map((s) => s.section_id));
  return null;
}

// 321 — object graph + reference closure → R_candidate. Never compares to the attestation (that is 329).
export function checkCensus(ctx) {
  const grantsByReviewer = new Map();
  for (const g of ctx.bundle.access_grants) {
    const fp = g.content.reviewer_principal.key_fingerprint;
    if (grantsByReviewer.has(fp)) return R(321, "duplicate_grant");
    grantsByReviewer.set(fp, g);
  }
  const seen = new Set();
  const candidate = [];
  for (const c of ctx.bundle.coverage_receipts) {
    const fp = c.content.reviewer_principal.key_fingerprint;
    if (seen.has(fp)) return R(321, "duplicate_receipt");
    seen.add(fp);
    const g = grantsByReviewer.get(fp);
    if (!g) return R(321, "orphan_receipt");
    if (ctx.grantDigest(g) !== c.content.grant_digest) return R(321, "grant_ref_mismatch");
    if (
      g.content.review_host_identity_ref.key_fingerprint !==
      c.content.review_host_identity_ref.key_fingerprint
    ) {
      return R(321, "host_mismatch");
    }
    if (!ctx.separationEvidence(c)) return R(321, "separation_evidence_unresolved");
    if (!ctx.hostEvidence(c)) return R(321, "host_evidence_unresolved");
    if (!ctx.affiliationAssertion(c)) return R(321, "affiliation_assertion_unresolved");
    candidate.push({ fp, grant: g, receipt: c });
  }
  for (const g of ctx.bundle.access_grants) {
    if (!seen.has(g.content.reviewer_principal.key_fingerprint)) return R(321, "orphan_grant");
  }
  ctx.R_candidate = candidate;
  return null;
}

const setOf = (arr) => new Set(arr);
const subset = (a, b) => [...a].every((x) => b.has(x)); // a ⊆ b

// 322 — ∀ grant: G(r) ⊆ S
export function checkGrantBounds(ctx) {
  for (const g of ctx.bundle.access_grants) {
    if (!subset(setOf(g.content.granted_sections), ctx.S)) return R(322, "grant_exceeds_partition");
  }
  return null;
}

// 323 — ∀ candidate: C(r) ⊆ G(r)  (No Phantom Review)
export function checkReceiptBounds(ctx) {
  for (const { grant, receipt } of ctx.R_candidate) {
    if (!subset(setOf(receipt.content.evaluated_sections), setOf(grant.content.granted_sections))) {
      return R(323, "receipt_exceeds_grant");
    }
  }
  return null;
}

// 324 — ∀ candidate: reviewer_attests_evaluated === true (strict)
export function checkEvaluation(ctx) {
  for (const { receipt } of ctx.R_candidate) {
    if (receipt.content.reviewer_attests_evaluated !== true)
      return R(324, "non_evaluation_receipt");
  }
  return null;
}
