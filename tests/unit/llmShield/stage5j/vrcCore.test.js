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
