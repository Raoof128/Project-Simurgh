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
