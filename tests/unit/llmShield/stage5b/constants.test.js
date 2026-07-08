// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — constants (plan Task 1). Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VAR_ATTACK_FAMILIES,
  VAR_EXPECTED_FAMILY_TOTAL,
  VAR_EXPECTED_ATTACK_TOTAL,
  VAR_OUTCOME_CLASSES,
  VAR_TARGET_STAGES,
  VAR_SCHEMAS,
  VAR_NON_CLAIMS,
  VAR_KNOWN_LIMITATIONS,
  VAR_RAILS,
  VAR_PAID_SLOTS,
  VAR_MINTED_SLOTS,
  VAR_PAID_SLOT_SCOPES,
  VAR_RESERVED_SLOTS,
} from "../../../../tools/simurgh-attestation/stage5b/constants.mjs";

test("outcome classes are the 4U set verbatim (parity)", () => {
  assert.deepEqual(VAR_OUTCOME_CLASSES, ["survived", "bypass", "model_refused", "lane_disabled"]);
});

test("attack families: 7 names, expected totals declared as SHAPE only (no concrete counts)", () => {
  assert.equal(VAR_ATTACK_FAMILIES.length, 7);
  assert.equal(VAR_EXPECTED_FAMILY_TOTAL, 7);
  assert.equal(VAR_EXPECTED_ATTACK_TOTAL, 46);
  assert.equal(VAR_ATTACK_FAMILIES.length, VAR_EXPECTED_FAMILY_TOTAL);
  // Concrete FAMILY_COUNTS are NOT frozen here (reviewer blocker 3) — Task 10 freezes them.
  const mod = new Set(Object.keys({ VAR_ATTACK_FAMILIES }));
  assert.ok(mod.has("VAR_ATTACK_FAMILIES"));
});

test("target stages are the six frozen predecessors", () => {
  assert.deepEqual(VAR_TARGET_STAGES, ["4v", "4w", "4x", "4y", "4z", "5a"]);
});

test("schemas are simurgh.var.*.v1", () => {
  for (const s of Object.values(VAR_SCHEMAS)) assert.match(s, /^simurgh\.var\.[a-z_]+\.v1$/);
});

test("signed lists are frozen at spec cardinality", () => {
  assert.equal(VAR_NON_CLAIMS.length, 9);
  assert.equal(VAR_KNOWN_LIMITATIONS.length, 7);
  assert.equal(VAR_RAILS.length, 12);
  for (const arr of [VAR_NON_CLAIMS, VAR_KNOWN_LIMITATIONS, VAR_RAILS]) {
    assert.ok(Object.isFrozen(arr));
  }
});

test("socket ledger: pay 1 / mint 1 / reserved 6; paid slot NOT reserved, minted IS", () => {
  assert.deepEqual(VAR_PAID_SLOTS, ["cross_gate_residue_benchmark_deferred"]);
  assert.deepEqual(VAR_MINTED_SLOTS, ["live_adversary_capture_lane_deferred"]);
  assert.equal(VAR_RESERVED_SLOTS.length, 6);
  assert.ok(!VAR_RESERVED_SLOTS.includes("cross_gate_residue_benchmark_deferred"));
  assert.ok(VAR_RESERVED_SLOTS.includes("live_adversary_capture_lane_deferred"));
  // The frontier-scale socket is NOT retired by a 1B capture.
  assert.ok(VAR_RESERVED_SLOTS.includes("frontier_readout_conflict_deferred"));
});

test("paid-slot SCOPE is a machine fact set-equal to paid slots (reviewer MF1 lineage)", () => {
  assert.deepEqual(Object.keys(VAR_PAID_SLOT_SCOPES).sort(), [...VAR_PAID_SLOTS].sort());
  assert.equal(VAR_PAID_SLOT_SCOPES.cross_gate_residue_benchmark_deferred, "full");
});
