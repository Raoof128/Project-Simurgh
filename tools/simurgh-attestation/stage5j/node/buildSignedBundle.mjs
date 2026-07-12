// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — build a REAL Ed25519-signed vrc_bundle over a synthetic (raw-0) 5I bundle. Deterministic
// keys ⇒ deterministic signatures ⇒ byte-identical evidence. Mirrors the unit fixture's 8-section /
// 5-state census (A uncontested / B response / C concurrence / D non_comparable / E rebuttal), but
// everything is really signed. entry_digest is computed over the FINAL content (incl. ledger_epoch) and
// the signature is over that same content, so the adapter's verification lines up exactly.
import { buildSignedBundle as vpcBuildSignedBundle } from "../../stage5i/node/buildSignedBundle.mjs";
import { lanePanelSpec } from "../../stage5i/node/laneKeys.mjs";
import { signContent } from "../core/signatures.mjs";
import { domainDigest, artifactDigest } from "../core/digests.mjs";
import { DOMAINS } from "../constants.mjs";
import { computeProjections, projectionRoot } from "../core/projections.mjs";

const SCALE_CONTENT = {
  rating_scale_id: "vrc-sev-5",
  rating_scale_version: "1",
  severity_direction: "higher_is_more_severe",
  ordinal_ranks: { none: 0, low: 1, medium: 2, high: 3, critical: 4 },
  comparable_dimensions: ["overall_risk"],
};
const DIM = "overall_risk";

export function buildSignedVrcBundle(keys) {
  // 1. Synthetic 5I bundle (verifies raw 0 under the 5I verifier), signed with 5I's committed keys.
  const { sections, panel } = lanePanelSpec(keys.vpc);
  const { bundle: vpc_bundle, external_config: vpc_external_config } = vpcBuildSignedBundle(
    keys.vpc,
    {
      sections,
      panel,
    }
  );

  const att = vpc_bundle.attestation.content;
  const producer = vpc_bundle.partition.content.producer_principal;
  const S = vpc_bundle.partition.content.sections.map((s) =>
    typeof s === "string" ? s : s.section_id
  );
  const cov = vpc_bundle.coverage_receipts.map((c) => ({
    id: c.content.reviewer_principal.key_fingerprint,
    sections: c.content.evaluated_sections,
  }));
  const RA = cov[0].id;
  const RB = cov[1].id;
  const reviewerKey = (fp) =>
    fp === RA ? keys.reviewers[0].privatePem : keys.reviewers[1].privatePem;

  const scaleDigest = domainDigest(DOMAINS.scale, SCALE_CONTENT);
  const rating_scale = {
    content: SCALE_CONTENT,
    scale_authority: keys.scale.id.key_fingerprint,
    signature: signContent(keys.scale.privatePem, DOMAINS.scale, SCALE_CONTENT),
  };

  // Ledger-authority-sequenced epoch tickets.
  let epoch = 0;
  let prevTicket = null;
  const epoch_tickets = [];
  const ticket = (entry_type, entry_digest) => {
    epoch += 1;
    const content = {
      ledger_epoch: epoch,
      previous_epoch_ticket_digest: prevTicket,
      entry_type,
      entry_digest,
      ledger_id: "vrc-signed-ledger",
    };
    const epoch_ticket_digest = domainDigest(DOMAINS.epoch_ticket, content);
    epoch_tickets.push({
      content,
      epoch_ticket_digest,
      signature: signContent(keys.ledger.privatePem, DOMAINS.epoch_ticket, content),
    });
    prevTicket = epoch_ticket_digest;
    return epoch;
  };

  const ratingEntry = (domain, privatePem, chain_subject, base) => {
    const ledger_epoch = epoch + 1; // reserved for the ticket we create next
    const content = {
      chain_subject,
      revision: 0,
      supersedes_digest: null,
      rating_scale_digest: scaleDigest,
      dimension_id: DIM,
      ledger_epoch,
      ...base,
    };
    const entry_digest = domainDigest(domain, content);
    ticket(
      domain === DOMAINS.reviewer_rating ? "reviewer_rating" : "producer_rating",
      entry_digest
    );
    return { content, entry_digest, signature: signContent(privatePem, domain, content) };
  };

  const producerPlan = {
    1: "medium",
    2: "low",
    3: "low",
    4: "medium",
    5: "low",
    6: "low",
    7: "medium",
    8: "low",
  };
  const producer_ratings = S.map((s) =>
    ratingEntry(DOMAINS.producer_rating, keys.producer.privatePem, `producer:${s}`, {
      section_id: s,
      value_kind: "ordinal",
      value: producerPlan[s],
    })
  );
  const prodBy = Object.fromEntries(producer_ratings.map((e) => [e.content.section_id, e]));

  const reviewerPlan = [
    { s: "1", r: RA, value: "medium" },
    { s: "2", r: RA, value: "low" },
    { s: "3", r: RA, value: "high" }, // B
    { s: "4", r: RA, value: "medium" },
    { s: "5", r: RA, value: "low" },
    { s: "4", r: RB, value: "medium" },
    { s: "5", r: RB, value: "low" },
    { s: "6", r: RB, value: "high" }, // C
    { s: "7", r: RB, value: "critical" }, // E
    { s: "8", r: RB, kind: "not_assessed" }, // D
  ];
  const reviewer_ratings = reviewerPlan.map((p) =>
    ratingEntry(DOMAINS.reviewer_rating, reviewerKey(p.r), `reviewer:${p.s}:${p.r}`, {
      section_id: p.s,
      reviewer_id: p.r,
      value_kind: p.kind ?? "ordinal",
      ...(p.kind ? {} : { value: p.value }),
    })
  );
  const revBy = (s, r) =>
    reviewer_ratings.find((e) => e.content.section_id === s && e.content.reviewer_id === r);

  const contestEvent = (s, r) => {
    const content = {
      section_id: s,
      reviewer_id: r,
      producer_rating_digest: prodBy[s].entry_digest,
      reviewer_rating_digest: revBy(s, r).entry_digest,
      rating_scale_digest: scaleDigest,
      ledger_epoch: epoch + 1,
    };
    const contest_event_digest = domainDigest(DOMAINS.contest_event, content);
    ticket("contest_event", contest_event_digest);
    return { content, contest_event_digest };
  };
  const ceB = contestEvent("3", RA);
  const ceC = contestEvent("6", RB);
  const ceE = contestEvent("7", RB);
  const contest_history = [ceB, ceC, ceE];

  const response = (ce) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      response_body_digest: domainDigest(DOMAINS.producer_response, {
        note: ce.content.section_id,
      }),
      ledger_epoch: epoch + 1,
    };
    const response_digest = domainDigest(DOMAINS.producer_response, content);
    ticket("producer_response", response_digest);
    return {
      content,
      response_digest,
      signature: signContent(keys.producer.privatePem, DOMAINS.producer_response, content),
    };
  };
  const producer_responses = [response(ceB), response(ceC), response(ceE)];

  const concurrence = (ce, r) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      reviewer_id: r,
      concurrence_claim: "accepts_producer_response",
      concurrence_epoch: epoch + 1,
    };
    const concurrence_digest = domainDigest(DOMAINS.concurrence, content);
    ticket("concurrence", concurrence_digest);
    return {
      content,
      concurrence_digest,
      signature: signContent(reviewerKey(r), DOMAINS.concurrence, content),
    };
  };
  const concurrences = [concurrence(ceC, RB)];

  const rebuttal = (ce, r) => {
    const content = {
      contest_event_digest: ce.contest_event_digest,
      reviewer_id: r,
      rebuttal_claim: "maintains_dissent",
      rebuttal_epoch: epoch + 1,
    };
    const rebuttal_digest = domainDigest(DOMAINS.rebuttal, content);
    ticket("rebuttal", rebuttal_digest);
    return {
      content,
      rebuttal_digest,
      signature: signContent(reviewerKey(r), DOMAINS.rebuttal, content),
    };
  };
  const reviewer_rebuttals = [rebuttal(ceE, RB)];

  const projections = computeProjections({
    rating_scale: { content: SCALE_CONTENT },
    producer_ratings,
    reviewer_ratings,
    contest_history,
    concurrences,
  });
  projections.projection_root = projectionRoot(projections);

  // MUST match roots.mjs ratingObligationRoot (artifactDigest over sorted required sets).
  const required_reviewer_pairs = reviewerPlan.map((p) => `${p.s}:${p.r}`).sort();
  const rating_obligation_root = artifactDigest({
    required_reviewer_pairs,
    required_producer_sections: [...S].sort(),
  });

  const bundle = {
    schema_version: "vrc.v1",
    vpc_ref: {
      vpc_bundle_digest: artifactDigest(att), // MUST match makeCtx's artifactDigest(att)
      panel_subject_root: att.panel_subject_root,
      panel_evidence_root: att.panel_evidence_root,
      partition_digest: att.partition_digest,
    },
    producer_ref: {
      producer_identity_digest: producer.producer_identity_digest,
      producer_key_fingerprint: producer.key_fingerprint,
    },
    ledger_authority: keys.ledger.id.key_fingerprint,
    rating_scale,
    rating_obligation_root,
    epoch_tickets,
    reviewer_ratings,
    producer_ratings,
    contest_history,
    producer_responses,
    concurrences,
    reviewer_rebuttals,
    projections,
    external_registry_anchor: null,
    universe_commitment_anchor: null,
    review_window_binding: null,
    campaign_composition_root: null,
  };

  const cfg = {
    policy: { profile_id: "vrc-test-v1", min_reviewers: 1, require_two_sided_equality: true },
    verifier_key_pin: { key_fingerprint: keys.verifier.id.key_fingerprint },
    vpc_bundle,
    vpc_external_config,
    key_registry: {
      [producer.key_fingerprint]: keys.producer.id.public_key_pem,
      [RA]: keys.reviewers[0].id.public_key_pem,
      [RB]: keys.reviewers[1].id.public_key_pem,
      [keys.ledger.id.key_fingerprint]: keys.ledger.id.public_key_pem,
      [keys.scale.id.key_fingerprint]: keys.scale.id.public_key_pem,
      [keys.verifier.id.key_fingerprint]: keys.verifier.id.public_key_pem,
    },
  };

  return { bundle, cfg };
}
