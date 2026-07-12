// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — OTS 370 / finality 380 / inflation 371 / profile floor 372 + the three states.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { validBundle } from "./_valid.mjs";

const run = (v) => vtcqVerify(v.bundle, v.cfg, v.facts);
const ots = (v) => v.bundle.anchors.find((a) => a.anchor_type === "bitcoin_ots");

test("vtc_core_valid → raw 0 (challenge_bound; OTS optional)", () => {
  assert.equal(run(validBundle({ profile: "vtc_core" })).raw, 0);
});

test("vtc_quorum_confirmed → raw 0 (externally_anchored)", () => {
  assert.equal(run(validBundle({ profile: "vtc_quorum", finality: "confirmed" })).raw, 0);
});

test("vtc_quorum_pending → raw 372, never a success", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "pending" });
  assert.equal(run(v).raw, 372);
});

test("OTS path invalid → 370", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  v.facts.otsState[ots(v).ots_proof_digest] = "invalid";
  assert.equal(run(v).raw, 370);
});

test("checkpoint witness not in accepted set → 370 (wrong chain/checkpoint)", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  ots(v).checkpoint_evidence.witness_key_fingerprint = "fp:rogue";
  assert.equal(run(v).raw, 370);
});

test("false confirmed over computed pending → 380 (not 372)", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  // make computed pending (too few confirmations) while still declaring confirmed
  ots(v).checkpoint_evidence.observed_tip_height = ots(v).checkpoint_evidence.block_height + 2;
  assert.equal(run(v).raw, 380);
});

test("independence inflation: both anchors one domain → 371", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  ots(v).trust_domain = "tsa-x"; // same as the TSA anchor
  assert.equal(run(v).raw, 371);
});

test("OTS-only (no bounded-time authority) → 372", () => {
  const v = validBundle({ profile: "vtc_quorum", finality: "confirmed" });
  v.bundle.anchors = v.bundle.anchors.filter((a) => a.anchor_type !== "rfc3161_tsa");
  assert.equal(run(v).raw, 372);
});
