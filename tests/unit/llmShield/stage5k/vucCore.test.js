// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5K VUC — the frozen first-failure tamper matrix. Each structural arm tampers a structuredClone and
// RE-RESOLVES facts against the tamper (makeAdapterFacts); facts-only arms override the fact. The
// per-component set-law arms (357/358/359) use injected ctx (Review-v2 rule 17).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validBundle, validCfg } from "./_validBundle.mjs";
import { makeAdapterFacts } from "../../../../tools/simurgh-attestation/stage5k/node/adapter.mjs";
import { vucVerify } from "../../../../tools/simurgh-attestation/stage5k/core/vucCore.mjs";
import {
  checkShrinking,
  checkPhantom,
  checkAlias,
} from "../../../../tools/simurgh-attestation/stage5k/core/setlaws.mjs";

const cfg = validCfg();
// verify a tampered bundle with facts re-resolved against it
const v = (bundle, tier = "public", factsOverride = null) => {
  const facts = factsOverride ?? makeAdapterFacts(bundle, cfg);
  return vucVerify(bundle, cfg, facts, { tier }).raw;
};

test("valid fixture verifies raw 0 at both tiers", () => {
  assert.equal(v(validBundle(), "public"), 0);
  assert.equal(v(validBundle(), "audit"), 0);
});

test("349 commitment — tampered universe_root", () => {
  const b = validBundle();
  b.universe_commitment.universe_root = "sha256:" + "9".repeat(64);
  assert.equal(v(b), 349);
});

test("349 commitment — dup leaf_id", () => {
  const b = validBundle();
  b.universe_commitment.leaves[1].leaf_id = b.universe_commitment.leaves[0].leaf_id;
  assert.equal(v(b), 349);
});

test("349 commitment — invalid producer commitment signature", () => {
  const b = validBundle();
  b.producer_commitment_statement.sig = "AA==";
  assert.equal(v(b), 349);
});

test("350 anchor subject mismatch", () => {
  const b = validBundle();
  b.ordering_anchor.subject_digest = "sha256:" + "1".repeat(64);
  assert.equal(v(b), 350);
});

test("351 ordering not verified_immediate", () => {
  const b = validBundle();
  const facts = makeAdapterFacts(b, cfg);
  assert.equal(v(b, "public", { ...facts, orderingState: "pending_unverified" }), 351);
});

test("352 downstream — vpc_ref tampered", () => {
  const b = validBundle();
  b.vpc_ref.partition_digest = "sha256:" + "2".repeat(64);
  assert.equal(v(b), 352);
});

test("353 start census — missing reviewer start", () => {
  const b = validBundle();
  b.review_start_records.pop();
  assert.equal(v(b), 353);
});

test("354 precedence — challenge bound to wrong ordering receipt", () => {
  const b = validBundle();
  b.start_challenges[0].ordering_receipt_digest = "sha256:" + "3".repeat(64);
  assert.equal(v(b), 354);
});

test("355 execution binding — tampered rating-entry set", () => {
  const b = validBundle();
  b.review_execution_bindings[0].rating_entry_digests = [];
  assert.equal(v(b), 355);
});

test("356 inclusion — dropped proof", () => {
  const b = validBundle();
  b.inclusion_proofs.pop();
  assert.equal(v(b), 356);
});

test("357/358/359 set laws via injected ctx (per-component)", () => {
  const L = (id, sub = id) => ({
    leaf_id: id,
    leaf_type: "vpc_section",
    subject_digest: `sha256:${sub.padEnd(64, "0")}`,
  });
  const U = [L("1"), L("2"), L("3")];
  // 357 shrinking: a committed leaf missing from U_vpc
  assert.equal(checkShrinking({ U_commit: U, U_vpc: [L("1"), L("2")], U_vrc: U }).raw, 357);
  // 357 shrinking: missing from U_vrc (separate arm)
  assert.equal(checkShrinking({ U_commit: U, U_vpc: U, U_vrc: [L("1"), L("3")] }).raw, 357);
  // 358 phantom: a U_vpc leaf absent from U_commit
  assert.equal(checkPhantom({ U_commit: [L("1"), L("2")], U_vpc: U, U_vrc: [L("1")] }).raw, 358);
  // 358 phantom: a U_vrc-only arm
  assert.equal(checkPhantom({ U_commit: [L("1")], U_vpc: [L("1")], U_vrc: U }).raw, 358);
  // 359 alias: distinct leaf_id, duplicate subject
  assert.equal(checkAlias({ U_commit: [L("1", "x"), L("2", "x")] }).raw, 359);
  // all clean → null
  assert.equal(checkShrinking({ U_commit: U, U_vpc: U, U_vrc: U }), null);
  assert.equal(checkPhantom({ U_commit: U, U_vpc: U, U_vrc: U }), null);
  assert.equal(checkAlias({ U_commit: U }), null);
});

test("360 finality overclaim — claimed confirmed, computed pending", () => {
  const b = validBundle();
  b.claimed_finality_state = "confirmed";
  assert.equal(v(b), 360);
});

test("361 projection mismatch (audit only; public stays 0)", () => {
  const b = validBundle();
  b.projections.projection_root = "sha256:" + "4".repeat(64);
  assert.equal(v(b, "public"), 0); // public tier does NOT run 361
  assert.equal(v(b, "audit"), 361);
});

test("362 policy — reserved slot activated", () => {
  const b = validBundle();
  b.review_window_binding = { some: "thing" };
  assert.equal(v(b), 362);
});

test("363 wrapper — cfg undefined", () => {
  assert.equal(vucVerify(validBundle(), undefined, {}).raw, 363);
});
