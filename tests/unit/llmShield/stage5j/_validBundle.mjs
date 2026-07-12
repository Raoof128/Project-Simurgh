// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — the crux fixture (plan Task 1.2). A fully-valid vrc_bundle + cfg + facts over the real
// 5I coverage relation (sections 1–8; reviewer A covers 1–5, reviewer B covers 4–8) and the 5-scenario
// derived-state census (A uncontested / B response-recorded / C concurrence / D non_comparable /
// E rebuttal). Digests are COMPUTED via the core functions, so the fixture is valid by construction.
// Every check task tests a negative arm derived from this via structuredClone + resign.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  domainDigest,
  artifactDigest,
} from "../../../../tools/simurgh-attestation/stage5j/core/digests.mjs";
import { DOMAINS } from "../../../../tools/simurgh-attestation/stage5j/constants.mjs";

const ROOT = join(import.meta.dirname, "../../../..");
const VPC_BUNDLE = JSON.parse(
  readFileSync(join(ROOT, "docs/research/llm-shield/evidence/stage-5i/bundle.json"), "utf8")
);
const VPC_CFG = JSON.parse(
  readFileSync(
    join(ROOT, "docs/research/llm-shield/evidence/stage-5i/external-config.json"),
    "utf8"
  )
);

// --- upstream-derived facts (structural; no crypto) ---------------------------------------------
const ATT = VPC_BUNDLE.attestation.content;
const PRODUCER = VPC_BUNDLE.partition.content.producer_principal;
const S = VPC_BUNDLE.partition.content.sections.map((s) =>
  typeof s === "string" ? s : s.section_id
);
// C(r): reviewer fingerprint → covered sections.
const COVERAGE = VPC_BUNDLE.coverage_receipts.map((c) => ({
  reviewer_id: c.content.reviewer_principal.key_fingerprint,
  sections: c.content.evaluated_sections,
}));
const RA = COVERAGE[0].reviewer_id; // covers 1..5
const RB = COVERAGE[1].reviewer_id; // covers 4..8
const LEDGER_AUTHORITY = "sha256:ledgerauthorityfixturekeyfingerprint00000000000000000000000000";
const SCALE_AUTHORITY = "sha256:scaleauthorityfixturekeyfingerprint00000000000000000000000000";
const ATT_VERIFIER = "sha256:vrcverifierfixturekeyfingerprint000000000000000000000000000000";

// --- rating scale (signed via facts.scaleSigValid) ----------------------------------------------
const SCALE_CONTENT = {
  rating_scale_id: "vrc-sev-5",
  rating_scale_version: "1",
  severity_direction: "higher_is_more_severe",
  ordinal_ranks: { none: 0, low: 1, medium: 2, high: 3, critical: 4 },
  comparable_dimensions: ["overall_risk"],
};
const RATING_SCALE_DIGEST = domainDigest(DOMAINS.scale, SCALE_CONTENT);
const DIM = "overall_risk";

let EPOCH = 0;
const epochTickets = [];
let prevTicket = null;
function ticket(entry_type, entry_digest) {
  EPOCH += 1;
  const content = {
    ledger_epoch: EPOCH,
    previous_epoch_ticket_digest: prevTicket,
    entry_type,
    entry_digest,
    ledger_id: "vrc-fixture-ledger",
  };
  const tdig = domainDigest(DOMAINS.epoch_ticket, content);
  epochTickets.push({ content, epoch_ticket_digest: tdig });
  prevTicket = tdig;
  return EPOCH;
}

// --- rating chains (append-only; genesis entries only in the fixture) ----------------------------
function ratingEntry(domain, chain_subject, base) {
  const content = {
    chain_subject,
    revision: 0,
    supersedes_digest: null,
    rating_scale_digest: RATING_SCALE_DIGEST,
    dimension_id: DIM,
    ...base,
  };
  const entry_digest = domainDigest(domain, content);
  const ledger_epoch = ticket(
    domain === DOMAINS.reviewer_rating ? "reviewer_rating" : "producer_rating",
    entry_digest
  );
  return { content: { ...content, ledger_epoch }, entry_digest };
}

// Producer self-ratings (one per section). Lower rank = more favourable.
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
  ratingEntry(DOMAINS.producer_rating, `producer:${s}`, {
    section_id: s,
    value_kind: "ordinal",
    value: producerPlan[s],
  })
);
const prodBySection = Object.fromEntries(producer_ratings.map((e) => [e.content.section_id, e]));

// Reviewer ratings (one per required (s,r) pair).
const reviewerPlan = [
  { s: "1", r: RA, kind: "ordinal", value: "medium" },
  { s: "2", r: RA, kind: "ordinal", value: "low" },
  { s: "3", r: RA, kind: "ordinal", value: "high" }, // B: divergence (prod low<high)
  { s: "4", r: RA, kind: "ordinal", value: "medium" },
  { s: "5", r: RA, kind: "ordinal", value: "low" },
  { s: "4", r: RB, kind: "ordinal", value: "medium" },
  { s: "5", r: RB, kind: "ordinal", value: "low" },
  { s: "6", r: RB, kind: "ordinal", value: "high" }, // C: divergence → concurrence
  { s: "7", r: RB, kind: "ordinal", value: "critical" }, // E: divergence → rebuttal
  { s: "8", r: RB, kind: "not_assessed" }, // D: non_comparable
];
const reviewer_ratings = reviewerPlan.map((p) =>
  ratingEntry(DOMAINS.reviewer_rating, `reviewer:${p.s}:${p.r}`, {
    section_id: p.s,
    reviewer_id: p.r,
    value_kind: p.kind,
    ...(p.kind === "ordinal" ? { value: p.value } : {}),
  })
);
const revBy = (s, r) =>
  reviewer_ratings.find((e) => e.content.section_id === s && e.content.reviewer_id === r);

// --- contest events + responses/concurrence/rebuttal --------------------------------------------
function contestEvent(s, r) {
  const content = {
    section_id: s,
    reviewer_id: r,
    producer_rating_digest: prodBySection[s].entry_digest,
    reviewer_rating_digest: revBy(s, r).entry_digest,
    rating_scale_digest: RATING_SCALE_DIGEST,
    ledger_epoch: ticket("contest_event", `pending`), // ordered after the ratings
  };
  const contest_event_digest = domainDigest(DOMAINS.contest_event, content);
  return { content, contest_event_digest };
}
const ceB = contestEvent("3", RA); // response only
const ceC = contestEvent("6", RB); // response + concurrence
const ceE = contestEvent("7", RB); // response + rebuttal
const contest_history = [ceB, ceC, ceE];

function response(ce) {
  const content = {
    contest_event_digest: ce.contest_event_digest,
    response_body_digest: artifactDigest({ note: `response for ${ce.content.section_id}` }),
    ledger_epoch: ticket("producer_response", ce.contest_event_digest),
  };
  return { content, response_digest: domainDigest(DOMAINS.producer_response, content) };
}
const producer_responses = [response(ceB), response(ceC), response(ceE)];

const concurrences = [
  (() => {
    const content = {
      contest_event_digest: ceC.contest_event_digest,
      reviewer_id: RB,
      concurrence_claim: "accepts_producer_response",
      concurrence_epoch: ticket("concurrence", ceC.contest_event_digest),
    };
    return { content, concurrence_digest: domainDigest(DOMAINS.concurrence, content) };
  })(),
];
const reviewer_rebuttals = [
  (() => {
    const content = {
      contest_event_digest: ceE.contest_event_digest,
      reviewer_id: RB,
      rebuttal_claim: "maintains_dissent",
      rebuttal_epoch: ticket("rebuttal", ceE.contest_event_digest),
    };
    return { content, rebuttal_digest: domainDigest(DOMAINS.rebuttal, content) };
  })(),
];

// --- projections (recomputed at audit tier) -----------------------------------------------------
const projections = {
  divergence_census: contest_history.map((ce) => ({
    section_id: ce.content.section_id,
    reviewer_id: ce.content.reviewer_id,
    producer_rating: producerPlan[ce.content.section_id],
    reviewer_ratings: [revBy(ce.content.section_id, ce.content.reviewer_id).content.value],
  })),
  favourable_skew: { favourable_count: 3, comparable_pair_count: 9 }, // 9 comparable (10 − 1 abstain)
  concurrence_backing: { backed_claim_count: 1, total_concurrence_claim_count: 1 },
  downgrade_depth: { total_rank_delta: 2 + 2 + 2, contested_pair_count: 3 }, // (3-1)+(3-1)+(4-2)
};
projections.projection_root = artifactDigest(projections);

// --- roots --------------------------------------------------------------------------------------
const required_reviewer_pairs = reviewerPlan.map((p) => `${p.s}:${p.r}`).sort();
const rating_obligation_root = artifactDigest({
  required_reviewer_pairs,
  required_producer_sections: [...S].sort(),
});
const rating_ledger_root = artifactDigest({
  reviewer: reviewer_ratings.map((e) => e.entry_digest).sort(),
  producer: producer_ratings.map((e) => e.entry_digest).sort(),
});
const contest_layer_root = artifactDigest({
  epoch_tickets: epochTickets.map((t) => t.epoch_ticket_digest),
  contest_history: contest_history.map((c) => c.contest_event_digest).sort(),
  producer_responses: producer_responses.map((r) => r.response_digest).sort(),
  concurrences: concurrences.map((c) => c.concurrence_digest).sort(),
  reviewer_rebuttals: reviewer_rebuttals.map((r) => r.rebuttal_digest).sort(),
});

const vpc_bundle_digest = artifactDigest(ATT);

// --- the bundle ---------------------------------------------------------------------------------
export function validBundle() {
  const bundle = {
    schema_version: "vrc.v1",
    vpc_ref: {
      vpc_bundle_digest,
      panel_subject_root: ATT.panel_subject_root,
      panel_evidence_root: ATT.panel_evidence_root,
      partition_digest: ATT.partition_digest,
    },
    producer_ref: {
      producer_identity_digest: PRODUCER.producer_identity_digest,
      producer_key_fingerprint: PRODUCER.key_fingerprint,
    },
    rating_scale: { content: SCALE_CONTENT, scale_authority: SCALE_AUTHORITY },
    rating_obligation_root,
    epoch_tickets: epochTickets,
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
    verifier_key_pin: { key_fingerprint: ATT_VERIFIER },
    vpc_bundle: VPC_BUNDLE,
    vpc_external_config: VPC_CFG,
  };

  const allSig = (arr, key) => Object.fromEntries(arr.map((e) => [e[key], true]));
  const facts = {
    vpc_verdict: 0, // the node adapter re-verified the 5I bundle to raw 0
    scaleSigValid: true,
    reviewerSigValid: allSig(reviewer_ratings, "entry_digest"),
    producerSigValid: allSig(producer_ratings, "entry_digest"),
    responseSigValid: allSig(producer_responses, "response_digest"),
    concurrenceSigValid: allSig(concurrences, "concurrence_digest"),
    rebuttalSigValid: allSig(reviewer_rebuttals, "rebuttal_digest"),
    epochTicketSigValid: allSig(epochTickets, "epoch_ticket_digest"),
    roleFingerprints: {
      reviewers: [RA, RB],
      producer: PRODUCER.key_fingerprint,
      ledger_authority: LEDGER_AUTHORITY,
      scale_authority: SCALE_AUTHORITY,
      attestation_verifier: ATT_VERIFIER,
    },
  };

  return { bundle, cfg, facts, meta: { S, RA, RB, RATING_SCALE_DIGEST } };
}

// resign(obj, key): after mutating a signed object in a cloned fixture, recompute its digest and mark
// the matching sig fact valid. `key` names the digest field + the facts map (reviewerSigValid, …).
export function resign(entry, domain, digestField, factMap, facts) {
  const fresh = domainDigest(domain, entry.content);
  entry[digestField] = fresh;
  facts[factMap][fresh] = true;
  return fresh;
}
