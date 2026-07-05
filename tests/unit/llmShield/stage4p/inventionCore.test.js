// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnforcementCommitment,
  pincerCorroborated,
  validateRelayContest,
  projectVendorDisclosure,
  verifyVendorDisclosure,
  validateExtractionBridge,
} from "../../../../tools/simurgh-attestation/stage4p/core/inventionCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

const commitment = {
  schema: "simurgh.enforcement_window_commitment.v1",
  stage4n_window_anchor_digest: D("a"),
  custody_class_digest: D("b"),
  action_class: "account_cluster_ban",
  count_commitment: D("c"),
  signer_public_key: "QUJD",
  signature: "QUJD",
};
const signal = (over = {}) => ({
  schema: "simurgh.custody_class_signal.v1",
  signal_mode: "matchable",
  failure_class: "undeclared_proxy_hop",
  stage4n_window_anchor_digest: D("a"),
  evidence_kind: "relay_spki_sha256",
  custody_class_digest: D("b"),
  entropy_floor_bits: 96,
  disclosure_budget_max_signals_per_window: 4,
  public_linkability: "bounded",
  ...over,
});

test("pincer: match / window-mismatch / class-mismatch", () => {
  assert.deepEqual(validateEnforcementCommitment(commitment), { ok: true });
  assert.equal(pincerCorroborated({ commitment, signals: [signal()] }), true);
  assert.equal(
    pincerCorroborated({ commitment, signals: [signal({ stage4n_window_anchor_digest: D("z") })] }),
    false
  );
  assert.equal(
    pincerCorroborated({ commitment, signals: [signal({ custody_class_digest: D("z") })] }),
    false
  );
});

test("relay contest: valid chains; wrong signer key is 68-class", () => {
  const contest = {
    schema: "simurgh.relay_contest.v1",
    contested_custody_class_digest: D("b"),
    stage4n_window_anchor_digest: D("a"),
    relay_identity_digest: D("d"),
    counter_evidence_digest: D("e"),
    signature: "QUJD",
  };
  assert.deepEqual(validateRelayContest(contest, { signerKeyDigest: D("d") }), { ok: true });
  assert.deepEqual(validateRelayContest(contest, { signerKeyDigest: D("f") }), {
    ok: false,
    raw: 68,
    reason: "contest_signer_mismatch",
  });
});

test("vendor disclosure: recomputes field-for-field; underivable field fails closed", () => {
  // The disclosure projects a SINGLE headline custody subject, not the whole multi-arm
  // bundle. body0 carries this subject explicitly so derivation is deterministic.
  const subject = {
    provider_family: "self_hosted",
    declared_relay_digests: [D("1"), D("2")],
    trace_custody: "declared_relay",
    verification_raw: 0,
  };
  const body0Digest = D("9"); // stands in for body0_digest (MF5 two-stage)
  const disc = projectVendorDisclosure(body0Digest, subject);
  assert.equal(disc.schema, "simurgh.vendor_custody_disclosure.v1");
  assert.equal(disc.declared_provider_family, "self_hosted");
  assert.equal(disc.declared_relay_count, 2);
  assert.equal(disc.trace_custody_class, "declared_relay");
  assert.equal(disc.verification_result, "verified");
  assert.equal(disc.attestation_digest, body0Digest);
  assert.deepEqual(verifyVendorDisclosure(disc, body0Digest, subject), { ok: true });
  assert.equal(
    projectVendorDisclosure(body0Digest, { ...subject, verification_raw: 75 }).verification_result,
    "custody_failure"
  );
  assert.equal(
    verifyVendorDisclosure({ ...disc, marketing_grade: "A+" }, body0Digest, subject).ok,
    false
  );
});

test("extraction bridge: both digests must verify independently", () => {
  const bridge = {
    cpc_custody_class_digest: D("b"),
    stage3t_attestation_digest: D("8"),
    bridge_mode: "digest_binding_only",
  };
  const ctx = { knownCpcDigests: [D("b")], known3tDigests: [D("8")] };
  assert.deepEqual(validateExtractionBridge(bridge, ctx), { ok: true });
  assert.equal(validateExtractionBridge(bridge, { ...ctx, known3tDigests: [] }).ok, false);
  assert.equal(validateExtractionBridge({ ...bridge, bridge_mode: "causal_proof" }, ctx).ok, false);
});
