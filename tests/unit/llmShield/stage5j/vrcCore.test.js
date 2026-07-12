// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J VRC — pure core (plan Tasks 1.2–1.13). Motto: AnthropicSafe First, then ReviewerSafe.
// Negative arms are appended as each check lands; the valid fixture must stay green throughout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle } from "./_validBundle.mjs";
import { vrcVerify } from "../../../../tools/simurgh-attestation/stage5j/core/vrcCore.mjs";

test("Task 1.2 — _validBundle() carries every required top-level key", () => {
  const { bundle, cfg, facts } = validBundle();
  for (const k of [
    "schema_version",
    "vpc_ref",
    "producer_ref",
    "rating_scale",
    "rating_obligation_root",
    "epoch_tickets",
    "reviewer_ratings",
    "producer_ratings",
    "contest_history",
    "producer_responses",
    "concurrences",
    "reviewer_rebuttals",
    "projections",
  ]) {
    assert.ok(k in bundle, `bundle.${k}`);
  }
  for (const k of ["policy", "verifier_key_pin", "vpc_bundle", "vpc_external_config"]) {
    assert.ok(k in cfg, `cfg.${k}`);
  }
  assert.equal(facts.vpc_verdict, 0);
  // reserved slots null; external_registry_anchor is an active optional field, also null here
  assert.equal(bundle.universe_commitment_anchor, null);
  assert.equal(bundle.external_registry_anchor, null);
});

test("Task 1.2 — the valid fixture verifies raw 0 (public + audit) against the current core", () => {
  const { bundle, cfg, facts } = validBundle();
  assert.equal(vrcVerify(bundle, cfg, facts, { tier: "public" }).raw, 0);
  assert.equal(vrcVerify(bundle, cfg, facts, { tier: "audit" }).raw, 0);
});

// --- Task 1.3 — schema 332 (bundle + cfg), cfg===undefined → 347 --------------------------------
test("332 — missing a required bundle key", () => {
  const { bundle, cfg, facts } = validBundle();
  delete bundle.reviewer_ratings;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 332);
});

test("332 — ordinal entry without a value / non-ordinal entry with a value", () => {
  const a = validBundle();
  delete a.bundle.producer_ratings[0].content.value; // ordinal but no value
  assert.equal(vrcVerify(a.bundle, a.cfg, a.facts).raw, 332);
  const b = validBundle();
  b.bundle.reviewer_ratings[9].content.value = "low"; // section 8 is not_assessed → must NOT carry value
  assert.equal(vrcVerify(b.bundle, b.cfg, b.facts).raw, 332);
});

test("332 — duplicate entry_digest across rating chains", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.producer_ratings[1].entry_digest = bundle.producer_ratings[0].entry_digest;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 332);
});

test("332 — a reserved slot is a non-null non-object (bad union type)", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.universe_commitment_anchor = 7; // neither null nor object
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 332);
});

test("332 — G13 correctness-forbidden key in the annotation surface", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.annotations = { producer_wrong: true };
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 332);
});

test("332 — malformed cfg (missing vpc_bundle)", () => {
  const { bundle, cfg, facts } = validBundle();
  delete cfg.vpc_bundle;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 332);
});

test("347 — cfg undefined (never a throw)", () => {
  const { bundle, facts } = validBundle();
  assert.equal(vrcVerify(bundle, undefined, facts).raw, 347);
});

// --- Task 1.4 — makeCtx + upstream RE-VERIFICATION → 333 ----------------------------------------
test("333 — upstream 5I bundle did not verify (facts.vpc_verdict ≠ 0)", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.vpc_verdict = 327; // e.g. the 5I coverage-gap code
  const r = vrcVerify(bundle, cfg, facts);
  assert.equal(r.raw, 333);
  assert.equal(r.reason, "upstream_unverified");
});

test("333 — vpc_ref anchor mismatch (panel_subject_root tampered)", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.vpc_ref.panel_subject_root = "sha256:deadbeef";
  const r = vrcVerify(bundle, cfg, facts);
  assert.equal(r.raw, 333);
  assert.equal(r.reason, "anchor_mismatch");
});

test("333 — producer_ref does not bind the reused 5I producer principal", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.producer_ref.producer_key_fingerprint = "sha256:nottheproducer";
  const r = vrcVerify(bundle, cfg, facts);
  assert.equal(r.raw, 333);
  assert.equal(r.reason, "producer_mismatch");
});

test("makeCtx does not throw on a structurally-odd-but-schema-valid upstream (→ 333, not 347)", () => {
  const { bundle, cfg, facts } = validBundle();
  cfg.vpc_bundle.attestation.content.panel_subject_root = "sha256:changed";
  // vpc_ref still holds the original → anchor_mismatch, cleanly, not a wrapper throw
  const r = vrcVerify(bundle, cfg, facts);
  assert.equal(r.raw, 333);
});

// --- Task 1.5 — obligation equality 334 / 335 / 336 --------------------------------------------
test("334 — declared rating_obligation_root ≠ recompute (incomplete synthetic set)", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.rating_obligation_root = "sha256:notthederivedobligation";
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 334);
});

test("335 — a required reviewer pair is missing (arm a) / a producer section is missing (arm b)", () => {
  const a = validBundle();
  a.bundle.reviewer_ratings.pop(); // drop (8,RB) — a required pair now absent
  assert.equal(vrcVerify(a.bundle, a.cfg, a.facts).raw, 335);
  const b = validBundle();
  b.bundle.producer_ratings.pop(); // drop section 8's producer self-rating
  assert.equal(vrcVerify(b.bundle, b.cfg, b.facts).raw, 335);
});

test("336 — orphan rating (reviewer not in the verified 5I panel)", () => {
  const { bundle, cfg, facts } = validBundle();
  const orphan = {
    content: {
      chain_subject: "reviewer:3:sha256:ghostreviewer",
      revision: 0,
      supersedes_digest: null,
      rating_scale_digest: bundle.reviewer_ratings[0].content.rating_scale_digest,
      dimension_id: "overall_risk",
      section_id: "3",
      reviewer_id: "sha256:ghostreviewer",
      value_kind: "ordinal",
      value: "low",
      ledger_epoch: 999,
    },
    entry_digest: "sha256:orphanentrydigestunique",
  };
  bundle.reviewer_ratings.push(orphan);
  facts.reviewerSigValid[orphan.entry_digest] = true;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 336);
});

// --- Task 1.6 — rating-chain + epoch-ticket integrity 337 --------------------------------------
test("337 — forked chain: a second genesis for one chain_subject (two active heads)", () => {
  const { bundle, cfg, facts } = validBundle();
  const twin = structuredClone(bundle.producer_ratings[0]);
  twin.content.value = "high"; // different content → distinct entry_digest, still revision 0 / genesis
  twin.entry_digest = "sha256:twin-genesis-producer-1";
  facts.producerSigValid[twin.entry_digest] = true;
  bundle.producer_ratings.push(twin);
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 337);
});

test("337 — cross-subject supersession (entry supersedes a different chain_subject)", () => {
  const { bundle, cfg, facts } = validBundle();
  // producer:2 entry claims to supersede the producer:1 entry — different chain_subject.
  bundle.producer_ratings[1].content.supersedes_digest = bundle.producer_ratings[0].entry_digest;
  bundle.producer_ratings[1].content.revision = 1;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 337);
});

test("337 — broken epoch-ticket chain (previous_epoch_ticket_digest tampered)", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.epoch_tickets[2].content.previous_epoch_ticket_digest = "sha256:notthepriorticket";
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 337);
});

test("337 — forged/unsigned epoch ticket (ledger-authority signature invalid)", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.epochTicketSigValid[bundle.epoch_tickets[0].epoch_ticket_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 337);
});

// --- Task 1.7 — scale + comparison 338 / 339 --------------------------------------------------
test("338 — rating scale unsigned (scale_authority signature invalid)", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.scaleSigValid = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 338);
});

test("338 — an ordinal entry's rating_scale_digest ≠ the committed top-level scale", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.producer_ratings[0].content.rating_scale_digest = "sha256:otherscale";
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 338);
});

test("339 — a contest event over a non_comparable pair (reviewer abstained on section 8)", () => {
  const { bundle, cfg, facts } = validBundle();
  const rev8 = bundle.reviewer_ratings.find(
    (e) => e.content.section_id === "8" && e.content.value_kind === "not_assessed"
  );
  const prod8 = bundle.producer_ratings.find((e) => e.content.section_id === "8");
  bundle.contest_history.push({
    content: {
      section_id: "8",
      reviewer_id: rev8.content.reviewer_id,
      producer_rating_digest: prod8.entry_digest,
      reviewer_rating_digest: rev8.entry_digest,
      rating_scale_digest: bundle.rating_scale ? prod8.content.rating_scale_digest : "x",
      ledger_epoch: 999,
    },
    contest_event_digest: "sha256:contest-over-abstain",
  });
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 339);
});

// --- Task 1.8 — signatures over ALL historical entries 340 / 341 (fossil attack) ---------------
test("340 — an active reviewer rating has an invalid signature", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.reviewerSigValid[bundle.reviewer_ratings[0].entry_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 340);
});

test("341 — an active producer rating has an invalid signature", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.producerSigValid[bundle.producer_ratings[0].entry_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 341);
});

test("341 — fossil attack: a SUPERSEDED producer entry has an invalid signature (all history checked)", () => {
  const { bundle, cfg, facts } = validBundle();
  const genesis = bundle.producer_ratings[0]; // producer:1 genesis
  const rev1 = {
    content: {
      chain_subject: genesis.content.chain_subject,
      revision: 1,
      supersedes_digest: genesis.entry_digest,
      rating_scale_digest: genesis.content.rating_scale_digest,
      dimension_id: genesis.content.dimension_id,
      section_id: "1",
      value_kind: "ordinal",
      value: "medium",
      ledger_epoch: 998,
    },
    entry_digest: "sha256:producer-1-rev1-head",
  };
  bundle.producer_ratings.push(rev1);
  facts.producerSigValid[rev1.entry_digest] = true; // the head is honestly signed
  facts.producerSigValid[genesis.entry_digest] = false; // the fossil is forged
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 341);
});

// --- Task 1.9 — append-only contest layer 342 / 343 -------------------------------------------
// Helper: append a producer supersession (rev1) on a section, matching the reviewer (severity "high").
function supersedeProducer(bundle, facts, section, value) {
  const genesis = bundle.producer_ratings.find((e) => e.content.section_id === section);
  const rev1 = {
    content: {
      chain_subject: genesis.content.chain_subject,
      revision: 1,
      supersedes_digest: genesis.entry_digest,
      rating_scale_digest: genesis.content.rating_scale_digest,
      dimension_id: genesis.content.dimension_id,
      section_id: section,
      value_kind: "ordinal",
      value,
      ledger_epoch: 900 + Number(section),
    },
    entry_digest: `sha256:producer-${section}-rev1`,
  };
  bundle.producer_ratings.push(rev1);
  facts.producerSigValid[rev1.entry_digest] = true;
  return rev1;
}

test("342 — a recomputed contest event is omitted from contest_history (census mismatch)", () => {
  const { bundle, cfg, facts } = validBundle();
  bundle.contest_history = bundle.contest_history.filter((ce) => ce.content.section_id !== "3");
  bundle.producer_responses = bundle.producer_responses.filter(
    (r) => r.content.contest_event_digest !== "sha256:contest-over-abstain"
  );
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 342);
});

test("342 — erase-by-supersession: producer revises to match, then drops the earlier event (still recomputed)", () => {
  const { bundle, cfg, facts } = validBundle();
  supersedeProducer(bundle, facts, "3", "high"); // now head matches reviewer(3,RA)=high
  // producer drops the section-3 contest event AND its response, hoping the divergence vanishes
  const ceB = bundle.contest_history.find((ce) => ce.content.section_id === "3");
  bundle.contest_history = bundle.contest_history.filter((ce) => ce !== ceB);
  bundle.producer_responses = bundle.producer_responses.filter(
    (r) => r.content.contest_event_digest !== ceB.contest_event_digest
  );
  // the fossil producer rev0 (low) still pairs with reviewer(3,RA) high → event recomputed → 342
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 342);
});

test("342 — a stored contest event has no response object (unanswered)", () => {
  const { bundle, cfg, facts } = validBundle();
  const ceB = bundle.contest_history.find((ce) => ce.content.section_id === "3");
  bundle.producer_responses = bundle.producer_responses.filter(
    (r) => r.content.contest_event_digest !== ceB.contest_event_digest
  );
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 342);
});

test("343 — a present response has an invalid signature", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.responseSigValid[bundle.producer_responses[0].response_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 343);
});

test("343 — a response is bound to a non-existent event (replayed / dangling)", () => {
  const { bundle, cfg, facts } = validBundle();
  const extra = {
    content: {
      contest_event_digest: "sha256:noSuchEvent",
      response_body_digest: "sha256:x",
      ledger_epoch: 950,
    },
    response_digest: "sha256:extra-response",
  };
  bundle.producer_responses.push(extra);
  facts.responseSigValid[extra.response_digest] = true;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 343);
});

test("POSITIVE control — producer revises AFTER responding (history + receipt preserved) → raw 0", () => {
  const { bundle, cfg, facts } = validBundle();
  supersedeProducer(bundle, facts, "3", "high"); // revise to match, but keep ceB + its response
  assert.equal(vrcVerify(bundle, cfg, facts, { tier: "public" }).raw, 0);
});

// --- Task 1.10 — phantom reviewer statement 344 -----------------------------------------------
test("344 — an unsigned concurrence object (phantom backed-state)", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.concurrenceSigValid[bundle.concurrences[0].concurrence_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 344);
});

test("344 — a wrongly-signed rebuttal object", () => {
  const { bundle, cfg, facts } = validBundle();
  facts.rebuttalSigValid[bundle.reviewer_rebuttals[0].rebuttal_digest] = false;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 344);
});

test("344 — one reviewer asserts BOTH concurrence and rebuttal on one event (ambiguous)", () => {
  const { bundle, cfg, facts } = validBundle();
  const conc = bundle.concurrences[0]; // ceC, reviewer RB
  const bothRebuttal = {
    content: {
      contest_event_digest: conc.content.contest_event_digest,
      reviewer_id: conc.content.reviewer_id,
      rebuttal_claim: "maintains_dissent",
      rebuttal_epoch: 951,
    },
    rebuttal_digest: "sha256:both-rebuttal",
  };
  bundle.reviewer_rebuttals.push(bothRebuttal);
  facts.rebuttalSigValid[bothRebuttal.rebuttal_digest] = true;
  assert.equal(vrcVerify(bundle, cfg, facts).raw, 344);
});
