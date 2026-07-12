// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K — runtime adapter (B11). Re-verifies the embedded 5I + 5J bundles and resolves every VUC
// Ed25519 signature + the two anchor states into the `facts` the pure vucCore consumes. The pure core
// never touches crypto. Signers are resolved by ROLE via cfg.key_registry.
import { verifyContent, fingerprint } from "../core/signatures.mjs";
import { domainDigest } from "../core/digests.mjs";
import { DOMAINS } from "../constants.mjs";
import { vpcVerify } from "../../stage5i/core/vpcCore.mjs";
import { makeAdapterFacts as vpcAdapterFacts } from "../../stage5i/node/adapter.mjs";
import { vrcVerify } from "../../stage5j/core/vrcCore.mjs";
import { makeAdapterFacts as vrcAdapterFacts } from "../../stage5j/node/adapter.mjs";

function safeVerify(reg, fp, domain, content, sig) {
  try {
    const pem = reg?.[fp];
    if (!pem || fingerprint(pem) !== fp) return false;
    return verifyContent({ public_key_pem: pem, key_fingerprint: fp }, domain, content, sig);
  } catch {
    return false;
  }
}
const noSig = (o) => {
  const c = { ...o };
  delete c.sig;
  return c;
};

export function makeAdapterFacts(bundle, cfg) {
  const reg = cfg.key_registry;

  let vpc_verdict = 331;
  try {
    vpc_verdict = vpcVerify(
      cfg.vpc_bundle,
      cfg.vpc_external_config,
      vpcAdapterFacts(cfg.vpc_bundle, cfg.vpc_external_config),
      { tier: "audit" }
    ).raw;
  } catch {
    vpc_verdict = 331;
  }
  let vrc_verdict = 347;
  try {
    vrc_verdict = vrcVerify(
      cfg.vrc_bundle,
      cfg.vrc_external_config,
      vrcAdapterFacts(cfg.vrc_bundle, cfg.vrc_external_config),
      { tier: "audit" }
    ).raw;
  } catch {
    vrc_verdict = 347;
  }

  const producerFp = cfg.vpc_bundle?.partition?.content?.producer_principal?.key_fingerprint;
  const sequencerFp = bundle.ordering_anchor?.evidence?.sequencer;

  // producer commitment signature.
  const pcs = bundle.producer_commitment_statement;
  const producerCommitmentSigValid = safeVerify(
    reg,
    pcs.producer_key_fingerprint,
    DOMAINS.producer_commitment,
    noSig(pcs),
    pcs.sig
  );

  // anchor two-axis state (offline, from bundled evidence).
  const orderingState =
    bundle.ordering_anchor?.anchor_type === "fixture_sequenced_order_ticket" ||
    bundle.ordering_anchor?.anchor_type === "externally_sequenced_order_ticket" ||
    bundle.ordering_anchor?.anchor_type === "rekor" ||
    bundle.ordering_anchor?.anchor_type === "ct_sct_carrier"
      ? "verified_immediate"
      : "invalid";
  const finalityState = bundle.finality_anchor === null ? "pending" : "confirmed";

  // sequencer challenge signatures, keyed by recomputed challenge_digest.
  const sequencerSigValid = {};
  for (const ch of bundle.start_challenges) {
    const cd = domainDigest(DOMAINS.start_challenge, noSig(ch));
    sequencerSigValid[cd] = safeVerify(
      reg,
      sequencerFp,
      DOMAINS.start_challenge,
      noSig(ch),
      ch.sig
    );
  }

  // reviewer start-record signatures, keyed by challenge_digest.
  const startSigValid = {};
  for (const r of bundle.review_start_records) {
    startSigValid[r.challenge_digest] = safeVerify(
      reg,
      r.reviewer_principal_digest,
      DOMAINS.review_start_record,
      noSig(r),
      r.sig
    );
  }
  const prs = bundle.producer_rating_start_record;
  const producerStartSigValid = safeVerify(
    reg,
    producerFp,
    DOMAINS.producer_rating_start,
    noSig(prs),
    prs.sig
  );

  // execution-binding signatures, keyed by binding challenge digest (recompute).
  const bindingSigValid = {};
  for (const b of bundle.review_execution_bindings) {
    const bd = domainDigest(DOMAINS.review_execution_binding, noSig(b));
    bindingSigValid[bd] = safeVerify(
      reg,
      b.reviewer_principal_digest,
      DOMAINS.review_execution_binding,
      noSig(b),
      b.sig
    );
  }
  const peb = bundle.producer_execution_binding;
  const producerBindingSigValid = safeVerify(
    reg,
    producerFp,
    DOMAINS.producer_execution_binding,
    noSig(peb),
    peb.sig
  );

  // omission-claim signatures (audit-only census), keyed by claim_id.
  const omissionSigValid = {};
  for (const oc of bundle.omission_claims ?? []) {
    omissionSigValid[oc.claim_id] = safeVerify(
      reg,
      oc.claimant_principal_digest,
      DOMAINS.omission_claim,
      noSig(oc),
      oc.sig
    );
  }

  return {
    vpc_verdict,
    vrc_verdict,
    producerFp,
    sequencerFp,
    producerCommitmentSigValid,
    orderingState,
    finalityState,
    sequencerSigValid,
    startSigValid,
    producerStartSigValid,
    bindingSigValid,
    producerBindingSigValid,
    omissionSigValid,
  };
}
