// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5L VTC-Q — raw 365 committed-digest binding (+ messageImprintBindsRawBytes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { vtcqVerify } from "../../../../tools/simurgh-attestation/stage5l/core/vtcqCore.mjs";
import { validBundle } from "./_valid.mjs";

const run = ({ bundle, cfg, facts }) => vtcqVerify(bundle, cfg, facts);

test("valid core bundle passes 365 (not 365)", () => {
  assert.notEqual(run(validBundle({ profile: "vtc_core" })).raw, 365);
});

test("tampering a policy content after commit → 365", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.review_window = { ...v.bundle.review_window, window_open_not_before: 12345 };
  assert.equal(run(v).raw, 365);
});

test("tampering commitment_session_id → 365", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.bundle.commitment_session_id = "sha256:deadbeef";
  assert.equal(run(v).raw, 365);
});

test("committed profile != cfg profile → 365", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.cfg.profile = "vtc_quorum";
  assert.equal(run(v).raw, 365);
});

test("TSA messageImprint != commitment_digest_bytes → 365 (not 367)", () => {
  const v = validBundle({ profile: "vtc_core" });
  v.facts.tsaCrypto[v.bundle.anchors[0].tsa_token_digest].messageImprintHex = "00".repeat(32);
  assert.equal(run(v).raw, 365);
});

test("quorum bundle: OTS leaf != commitment_digest_bytes → 365", () => {
  const v = validBundle({ profile: "vtc_quorum" });
  const ots = v.bundle.anchors.find((a) => a.anchor_type === "bitcoin_ots").ots_proof_digest;
  v.facts.otsLeafHex[ots] = "11".repeat(32);
  assert.equal(run(v).raw, 365);
});

test("ceremony_id is absent from every upstream input (cycle-free)", () => {
  const v = validBundle({ profile: "vtc_quorum" });
  const cid = v.bundle.ceremony_id;
  // not in commitment payload sources
  assert.ok(!Object.values(v.bundle.ceremony_contract).includes(cid));
  // not bound by the receipt
  assert.ok(!Object.values(v.bundle.review_access_authorisation_receipt.binds).includes(cid));
  // not the capability root
  assert.notEqual(v.bundle.review_access_authorisation_receipt.start_capability_root_digest, cid);
});
