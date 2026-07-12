// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — runtime adapter (B11). Re-verifies the embedded 5I bundle (via the 5I verifier) and
// resolves every VRC Ed25519 signature into the `facts` the pure vrcCore consumes. The pure core never
// touches crypto. Signers are resolved by ROLE: reviewer entries by their reviewer_id, producer entries
// by producer_ref, tickets by the ledger authority, the scale by scale_authority, attestations by the
// pinned verifier — each public key looked up in cfg.key_registry.
import { verifyContent, fingerprint } from "../core/signatures.mjs";
import { DOMAINS } from "../constants.mjs";
import { vrcVerify } from "../core/vrcCore.mjs";
import { vpcVerify } from "../../stage5i/core/vpcCore.mjs";
import { makeAdapterFacts as vpcAdapterFacts } from "../../stage5i/node/adapter.mjs";

function safeVerify(registry, fp, domain, content, sig) {
  try {
    const pem = registry?.[fp];
    if (!pem || fingerprint(pem) !== fp) return false;
    return verifyContent({ public_key_pem: pem, key_fingerprint: fp }, domain, content, sig);
  } catch {
    return false;
  }
}

export function makeAdapterFacts(bundle, cfg) {
  const reg = cfg.key_registry;

  // Re-verify the embedded 5I bundle under the 5I verifier (earns "verified"): inject the verdict.
  let vpc_verdict = 331;
  try {
    const vpcFacts = vpcAdapterFacts(cfg.vpc_bundle, cfg.vpc_external_config);
    vpc_verdict = vpcVerify(cfg.vpc_bundle, cfg.vpc_external_config, vpcFacts, {
      tier: "audit",
    }).raw;
  } catch {
    vpc_verdict = 331;
  }

  const producerFp = bundle.producer_ref.producer_key_fingerprint;
  const map = (arr, digestField, fpOf, domain) => {
    const out = {};
    for (const o of arr)
      out[o[digestField]] = safeVerify(reg, fpOf(o), domain, o.content, o.signature);
    return out;
  };

  return {
    vpc_verdict,
    scaleSigValid: safeVerify(
      reg,
      bundle.rating_scale.scale_authority,
      DOMAINS.scale,
      bundle.rating_scale.content,
      bundle.rating_scale.signature
    ),
    reviewerSigValid: map(
      bundle.reviewer_ratings,
      "entry_digest",
      (e) => e.content.reviewer_id,
      DOMAINS.reviewer_rating
    ),
    producerSigValid: map(
      bundle.producer_ratings,
      "entry_digest",
      () => producerFp,
      DOMAINS.producer_rating
    ),
    epochTicketSigValid: map(
      bundle.epoch_tickets,
      "epoch_ticket_digest",
      () => bundle.ledger_authority,
      DOMAINS.epoch_ticket
    ),
    responseSigValid: map(
      bundle.producer_responses,
      "response_digest",
      () => producerFp,
      DOMAINS.producer_response
    ),
    concurrenceSigValid: map(
      bundle.concurrences,
      "concurrence_digest",
      (c) => c.content.reviewer_id,
      DOMAINS.concurrence
    ),
    rebuttalSigValid: map(
      bundle.reviewer_rebuttals,
      "rebuttal_digest",
      (r) => r.content.reviewer_id,
      DOMAINS.rebuttal
    ),
    roleFingerprints: {
      reviewers: bundle.reviewer_ratings.map((e) => e.content.reviewer_id),
      producer: producerFp,
      ledger_authority: bundle.ledger_authority,
      scale_authority: bundle.rating_scale.scale_authority,
      attestation_verifier: cfg.verifier_key_pin.key_fingerprint,
    },
  };
}

// Full verify: resolve facts, then run the pure core.
export function verifyVrc(bundle, cfg, { tier = "public" } = {}) {
  const facts = makeAdapterFacts(bundle, cfg);
  return vrcVerify(bundle, cfg, facts, { tier });
}
