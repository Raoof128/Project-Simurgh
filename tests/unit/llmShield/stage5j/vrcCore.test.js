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
