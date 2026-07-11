// Shared fixture: a fully-valid VPC bundle + external config + normalized cryptoFacts (B11).
// Pure-core tests mutate a structuredClone of this and assert the intended first raw code.
import {
  domainDigest,
  artifactDigest,
  identityDigest,
} from "../../../../tools/simurgh-attestation/stage5i/core/digests.mjs";
import { DOMAINS, POLICY_PROFILES } from "../../../../tools/simurgh-attestation/stage5i/constants.mjs";

const idOf = (subject, fp) => ({ identity_subject: subject, key_fingerprint: fp, public_key_pem: `PEM:${fp}` });

export function validBundle() {
  const sections = ["1", "2", "3", "4", "5", "6", "7", "8"].map((id) => ({
    section_id: id,
    canonical_path: `sec/${id}`,
    redaction_types: [],
  }));
  const S = sections.map((s) => s.section_id);

  const producer = {
    ...idOf("evidence-producer", "fp:producer"),
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

  const verifier = idOf("simurgh-verifier", "fp:verifier");
  const grantIssuer = idOf("panel-coordinator", "fp:grantIssuer");
  const affIssuer = idOf("affiliation-authority", "fp:affIssuer");

  // Two reviewers, each C(r) ⊂ S, union = S (A:1-5, B:4-8).
  const reviewers = [
    { subject: "reviewerA", fp: "fp:reviewerA", host: "fp:hostA", lineage: "lineage:A", sec: ["1", "2", "3", "4", "5"] },
    { subject: "reviewerB", fp: "fp:reviewerB", host: "fp:hostB", lineage: "lineage:B", sec: ["4", "5", "6", "7", "8"] },
  ];

  const reviewer_separation_evidence = [];
  const host_separation_evidence = [];
  const affiliation_assertions = [];
  const access_grants = [];
  const coverage_receipts = [];
  const challengeBoundDigests = new Set();

  for (const r of reviewers) {
    const revId = idOf(r.subject, r.fp);
    const hostRef = { identity_subject: `${r.subject}-host`, key_fingerprint: r.host, identity_digest: identityDigest(idOf(`${r.subject}-host`, r.host)) };

    const sep = { subject_key_fingerprint: r.fp, challenge_receipt: { bound_panel_subject_root: "ANY", campaign_id: "c1", nonce: `n:${r.fp}` } };
    const sepDigest = artifactDigest(sep);
    challengeBoundDigests.add(sepDigest);
    reviewer_separation_evidence.push(sep);

    const hostSep = { subject_key_fingerprint: r.host, challenge_receipt: { bound_panel_subject_root: "ANY", campaign_id: "c1", nonce: `n:${r.host}` } };
    const hostSepDigest = artifactDigest(hostSep);
    challengeBoundDigests.add(hostSepDigest);
    host_separation_evidence.push(hostSep);

    const affContent = {
      subject_key_fingerprint: r.fp,
      subject_identity_digest: identityDigest(revId),
      producer_identity_digest: producer.producer_identity_digest,
      relationship: "independent_of_producer",
      subject_affiliation_lineage_digest: r.lineage,
      partition_digest,
      issued_by: affIssuer,
    };
    const aff = { content: affContent, signature: `sig:aff:${r.fp}` };
    const affDigest = domainDigest(DOMAINS.affiliation, affContent);
    affiliation_assertions.push(aff);

    const grantContent = {
      reviewer_principal: { key_fingerprint: r.fp },
      review_host_identity_ref: hostRef,
      granted_sections: [...r.sec],
      partition_digest,
      issued_by: { identity_subject: grantIssuer.identity_subject, key_fingerprint: grantIssuer.key_fingerprint },
    };
    const grant = { content: grantContent, signature: `sig:grant:${r.fp}` };
    const grant_digest = domainDigest(DOMAINS.grant, grantContent);
    access_grants.push(grant);

    const receiptContent = {
      reviewer_principal: revId,
      review_host_identity_ref: hostRef,
      grant_digest,
      evaluated_sections: [...r.sec],
      reviewer_attests_evaluated: true,
      independence_evidence: {
        separation_evidence_digest: sepDigest,
        affiliation_assertion_digest: affDigest,
        host_independence_evidence_digest: hostSepDigest,
      },
    };
    coverage_receipts.push({ content: receiptContent, signature: `sig:receipt:${r.fp}` });
  }

  const partition = { content: partitionContent, signature: "sig:partition" };

  const policy = { ...POLICY_PROFILES.release };
  const policy_digest = domainDigest(DOMAINS.policy, policy);

  const external_config = {
    affiliation_assertions,
    reviewer_registry: { "fp:reviewerA": { identity_subject: "reviewerA" }, "fp:reviewerB": { identity_subject: "reviewerB" } },
    host_registry: { "fp:hostA": { identity_subject: "reviewerA-host" }, "fp:hostB": { identity_subject: "reviewerB-host" } },
    affiliation_issuer_registry: { "fp:affIssuer": { identity_subject: "affiliation-authority" } },
    verifier_key_pin: { key_fingerprint: "fp:verifier", identity_subject: "simurgh-verifier" },
    policy,
    policy_pin: { profile_id: policy.profile_id, policy_digest },
  };

  // Attestation content is filled by the verifier; the fixture supplies the DECLARED values so the
  // audit recompute (329) matches. Roots/coverage/projections computed lazily in tests that need audit.
  const attestation = {
    content: {
      partition_digest,
      policy_digest,
      panel_subject_root: "FILLED_BY_AUDIT",
      panel_evidence_root: "FILLED_BY_AUDIT",
      trust_context_digest: "FILLED_BY_AUDIT",
      counted_reviewers: [],
      coverage_union: [...S],
      coverage_gap: [],
      equality_holds: true,
      verdict: "covered",
      coverage_depth: {},
      section_states: {},
    },
    verifier_identity: verifier,
    signature: "sig:attestation",
  };

  const bundle = { partition, access_grants, coverage_receipts, reviewer_separation_evidence, host_separation_evidence, attestation };

  const facts = {
    sigValid: true,
    roleFingerprints: {
      verifier: "fp:verifier",
      producer: "fp:producer",
      grantIssuers: ["fp:grantIssuer"],
      affiliationIssuers: ["fp:affIssuer"],
      reviewers: ["fp:reviewerA", "fp:reviewerB"],
      hosts: ["fp:hostA", "fp:hostB"],
    },
    challengeBoundDigests,
    anchoredDigests: new Set(),
  };

  return { bundle, cfg: external_config, facts, S, partition_digest };
}
