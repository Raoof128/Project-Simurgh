// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — build a fully Ed25519-signed VPC bundle from key material. Acyclic order: partition →
// grants → affiliations → panel_subject_root → verifier-signed challenge receipts → separation
// evidence → receipts → attestation. The Lane-C challenge binds panel_subject_root (B4), which never
// transitively includes separation evidence (grants do NOT reference it — receipts do).
import { domainDigest, artifactDigest, identityDigest } from "../core/digests.mjs";
import { signContent } from "../core/signatures.mjs";
import { panelSubjectRoot } from "../core/roots.mjs";
import { recomputeAttestationContent } from "../core/checks329to330.mjs";
import { makeCtx } from "../core/context.mjs";
import {
  checkPartition,
  checkCensus,
  checkGrantBounds,
  checkReceiptBounds,
  checkEvaluation,
} from "../core/checks317to324.mjs";
import { checkSeparation, checkAffiliation, checkCoverage } from "../core/checks325to328.mjs";
import { makeAdapterFacts } from "./adapter.mjs";
import { DOMAINS, CHALLENGE_DOMAIN, POLICY_PROFILES } from "../constants.mjs";

// keys: { producer, grantIssuer, affIssuer, verifier, reviewers:[{...}] } each { privatePem, id:{identity_subject,public_key_pem,key_fingerprint} }
export function buildSignedBundle(
  keys,
  { sections, panel, campaign_id = "c1", profile = "release" } = {}
) {
  const producer = {
    ...keys.producer.id,
    anchor_type: "none",
    anchor_subject: "",
    subject_distinct: true,
  };
  producer.producer_identity_digest = identityDigest(producer);

  const partitionContent = {
    source_report: {
      title: "Sabotage Risk Report: Claude Opus 4.6",
      source_digest: "sha256:src",
      redaction_taxonomy: ["misuse_risk", "commercial_proprietary"],
    },
    partition_procedure: { id: "toc-leaf-partition", version: "1" },
    producer_principal: producer,
    sections,
  };
  const partition_digest = domainDigest(DOMAINS.partition, partitionContent);
  const partition = {
    content: partitionContent,
    signature: signContent(keys.producer.privatePem, DOMAINS.partition, partitionContent),
  };

  const access_grants = [];
  const affiliation_assertions = [];
  const reviewerMeta = [];
  for (const p of panel) {
    const rk = keys.reviewers[p.i];
    const hostRef = {
      identity_subject: `${rk.id.identity_subject}-host`,
      key_fingerprint: p.hostFp,
      identity_digest: identityDigest({
        identity_subject: `${rk.id.identity_subject}-host`,
        key_fingerprint: p.hostFp,
      }),
    };
    const grantContent = {
      reviewer_principal: { key_fingerprint: rk.id.key_fingerprint },
      review_host_identity_ref: hostRef,
      granted_sections: [...p.sec],
      partition_digest,
      issued_by: keys.grantIssuer.id,
    };
    access_grants.push({
      content: grantContent,
      signature: signContent(keys.grantIssuer.privatePem, DOMAINS.grant, grantContent),
    });

    const affContent = {
      subject_key_fingerprint: rk.id.key_fingerprint,
      subject_identity_digest: identityDigest(rk.id),
      producer_identity_digest: producer.producer_identity_digest,
      relationship: "independent_of_producer",
      subject_affiliation_lineage_digest: p.lineage,
      partition_digest,
      issued_by: keys.affIssuer.id,
    };
    affiliation_assertions.push({
      content: affContent,
      signature: signContent(keys.affIssuer.privatePem, DOMAINS.affiliation, affContent),
    });
    reviewerMeta.push({ rk, hostRef, sec: p.sec });
  }

  // subject_root over partition + grants + affiliations + reviewer fps (no separation evidence).
  const subjRootCtx = {
    partition_digest,
    bundle: { access_grants },
    cfg: { affiliation_assertions },
    grantDigest: (g) => domainDigest(DOMAINS.grant, g.content),
    R_eligible: reviewerMeta.map((m) => ({ fp: m.rk.id.key_fingerprint })),
  };
  const panel_subject_root = panelSubjectRoot(subjRootCtx);

  const reviewer_separation_evidence = [];
  const host_separation_evidence = [];
  const coverage_receipts = [];
  const mkChallenge = (subjectFp) => {
    const content = {
      bound_panel_subject_root: panel_subject_root,
      campaign_id,
      nonce: `n:${subjectFp}`,
      subject_key_fingerprint: subjectFp,
    };
    return {
      content,
      verifier_identity: keys.verifier.id,
      signature: signContent(keys.verifier.privatePem, CHALLENGE_DOMAIN, content),
    };
  };
  for (const m of reviewerMeta) {
    const sep = {
      subject_key_fingerprint: m.rk.id.key_fingerprint,
      challenge_receipt: mkChallenge(m.rk.id.key_fingerprint),
    };
    const hostSep = {
      subject_key_fingerprint: m.hostRef.key_fingerprint,
      challenge_receipt: mkChallenge(m.hostRef.key_fingerprint),
    };
    reviewer_separation_evidence.push(sep);
    host_separation_evidence.push(hostSep);
    const receiptContent = {
      reviewer_principal: m.rk.id,
      review_host_identity_ref: m.hostRef,
      grant_digest: domainDigest(DOMAINS.grant, access_grants[reviewerMeta.indexOf(m)].content),
      evaluated_sections: [...m.sec],
      reviewer_attests_evaluated: true,
      independence_evidence: {
        separation_evidence_digest: artifactDigest(sep),
        affiliation_assertion_digest: domainDigest(
          DOMAINS.affiliation,
          affiliation_assertions[reviewerMeta.indexOf(m)].content
        ),
        host_independence_evidence_digest: artifactDigest(hostSep),
      },
    };
    coverage_receipts.push({
      content: receiptContent,
      signature: signContent(m.rk.privatePem, DOMAINS.receipt, receiptContent),
    });
  }

  const policy = { ...POLICY_PROFILES[profile] };
  const policy_digest = domainDigest(DOMAINS.policy, policy);
  const external_config = {
    affiliation_assertions,
    reviewer_registry: Object.fromEntries(
      reviewerMeta.map((m) => [
        m.rk.id.key_fingerprint,
        { identity_subject: m.rk.id.identity_subject },
      ])
    ),
    host_registry: Object.fromEntries(
      reviewerMeta.map((m) => [
        m.hostRef.key_fingerprint,
        { identity_subject: m.hostRef.identity_subject },
      ])
    ),
    affiliation_issuer_registry: {
      [keys.affIssuer.id.key_fingerprint]: { identity_subject: keys.affIssuer.id.identity_subject },
    },
    verifier_key_pin: {
      key_fingerprint: keys.verifier.id.key_fingerprint,
      identity_subject: keys.verifier.id.identity_subject,
    },
    policy,
    policy_pin: { profile_id: policy.profile_id, policy_digest },
  };

  const bundle = {
    partition,
    access_grants,
    coverage_receipts,
    reviewer_separation_evidence,
    host_separation_evidence,
    attestation: null,
  };

  // Fill the attestation via the verifier recompute. The attestation isn't signed yet, so run the pure
  // checks DIRECTLY (vpcVerify's schema would require a signed attestation — chicken/egg).
  const facts = makeAdapterFacts(bundle, external_config);
  const ctx = makeCtx(bundle, external_config, facts);
  for (const chk of [
    checkPartition,
    checkCensus,
    checkGrantBounds,
    checkReceiptBounds,
    checkEvaluation,
    (c) => checkSeparation(c, policy),
    checkAffiliation,
    checkCoverage,
  ]) {
    const r = chk(ctx);
    if (r) throw new Error(`builder check failed: ${r.raw} ${r.reason}`);
  }
  const attContent = recomputeAttestationContent(ctx);
  bundle.attestation = {
    content: attContent,
    verifier_identity: keys.verifier.id,
    signature: signContent(keys.verifier.privatePem, DOMAINS.attestation, attContent),
  };
  return { bundle, external_config };
}
