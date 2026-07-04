// SPDX-License-Identifier: AGPL-3.0-or-later
// Motto: AnthropicSafe First, then ReviewerSafe.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnvelope,
  validateHopReceipt,
  validateCustodyReceipt,
  validateCpcSignal,
} from "../../../../tools/simurgh-attestation/stage4p/core/schemaCore.mjs";

const D = (s) => "sha256:" + s.repeat(64).slice(0, 64);

export function goodEnvelope() {
  return {
    schema: "simurgh.origin_custody_envelope.v1",
    run_epoch: 12,
    declared_endpoint_digest: D("a"),
    provider_family: "self_hosted",
    provider_identity_digest: D("b"),
    model_identity_digest: D("c"),
    relay_policy: "declared_relays_allowed",
    declared_relay_digests: [D("d")],
    declared_transform_digests: [D("e")],
    account_boundary: "single_declared",
    trace_custody: "declared_relay",
    tool_surface_digest: D("f"),
    valid_from_epoch: 10,
    valid_until_epoch: 20,
    signature: "QUJD",
  };
}

export function goodHop() {
  return {
    schema: "simurgh.custody_hop_receipt.v1",
    hop_index: 0,
    previous_receipt_digest: D("1"),
    relay_identity_digest: D("2"),
    transform_digest: "genesis",
    input_digest: D("3"),
    output_digest: D("4"),
    signature: "QUJD",
  };
}

export function goodReceipt() {
  return {
    schema: "simurgh.custody_receipt.v1",
    request_digest: D("5"),
    response_digest: D("6"),
    custody_path_digest: D("7"),
    model_identity_digest: D("c"),
    relay_chain_digest: D("8"),
    trace_custody_observed: "declared_relay",
    tool_surface_digest: D("f"),
    receipt_epoch: 12,
    signature: "QUJD",
  };
}

test("good objects validate", () => {
  assert.deepEqual(validateEnvelope(goodEnvelope()), { ok: true });
  assert.deepEqual(validateHopReceipt(goodHop()), { ok: true });
  assert.deepEqual(validateCustodyReceipt(goodReceipt()), { ok: true });
});

test("envelope: extra key, missing key, bad enum, inverted epochs all fail raw 67", () => {
  for (const bad of [
    { ...goodEnvelope(), surprise: 1 },
    (() => {
      const e = goodEnvelope();
      delete e.trace_custody;
      return e;
    })(),
    { ...goodEnvelope(), provider_family: "acme_cloud" },
    { ...goodEnvelope(), valid_from_epoch: 30 },
    { ...goodEnvelope(), declared_endpoint_digest: "sha256:xyz" },
  ]) {
    const r = validateEnvelope(bad);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 67);
    assert.equal(r.reason, "schema_invalid");
  }
});

test("malformed custody receipt fails raw 77 receipt_schema_invalid (spec §7.2)", () => {
  const r = validateCustodyReceipt({ ...goodReceipt(), trace_custody_observed: "psychic" });
  assert.deepEqual(r, { ok: false, raw: 77, reason: "receipt_schema_invalid" });
});

test("cpc signal: two exact variants; cross-variant contamination is raw 79", () => {
  const matchable = {
    schema: "simurgh.custody_class_signal.v1",
    signal_mode: "matchable",
    failure_class: "undeclared_proxy_hop",
    stage4n_window_anchor_digest: D("9"),
    evidence_kind: "relay_spki_sha256",
    windowed_evidence_commitment: D("8"),
    custody_class_digest: D("0"),
    entropy_floor_bits: 96,
    disclosure_budget_max_signals_per_window: 4,
    public_linkability: "bounded",
  };
  const degraded = {
    schema: "simurgh.custody_class_signal.v1",
    signal_mode: "degraded_non_matchable",
    coarse_failure_class: "undeclared_proxy_hop",
    stage4n_window_anchor_digest: D("9"),
    entropy_floor_bits: 96,
    observed_entropy_bits: 0,
    public_linkability: "none",
  };
  assert.deepEqual(validateCpcSignal(matchable), { ok: true });
  assert.deepEqual(validateCpcSignal(degraded), { ok: true });
  const m = { ...matchable };
  delete m.custody_class_digest;
  assert.deepEqual(validateCpcSignal(m), {
    ok: false,
    raw: 79,
    reason: "matchable_missing_digest",
  });
  assert.deepEqual(validateCpcSignal({ ...degraded, custody_class_digest: D("0") }), {
    ok: false,
    raw: 79,
    reason: "degraded_carries_digest",
  });
  assert.deepEqual(validateCpcSignal({ ...matchable, public_linkability: "unbounded" }), {
    ok: false,
    raw: 67,
    reason: "schema_invalid",
  });
});

test("hop receipt: extra key, missing key, bad digest, bad transform digest, negative index, bad signature all fail raw 67", () => {
  for (const bad of [
    { ...goodHop(), surprise: 1 },
    (() => {
      const h = goodHop();
      delete h.input_digest;
      return h;
    })(),
    { ...goodHop(), relay_identity_digest: "sha256:xyz" },
    { ...goodHop(), transform_digest: "nope" },
    { ...goodHop(), hop_index: -1 },
    { ...goodHop(), signature: "not base64!!" },
  ]) {
    const r = validateHopReceipt(bad);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 67);
    assert.equal(r.reason, "schema_invalid");
  }
});

test("custody receipt: extra key, missing key, bad digest, bad receipt_epoch all fail raw 77", () => {
  for (const bad of [
    { ...goodReceipt(), surprise: 1 },
    (() => {
      const r = goodReceipt();
      delete r.model_identity_digest;
      return r;
    })(),
    { ...goodReceipt(), relay_chain_digest: "sha256:xyz" },
    { ...goodReceipt(), receipt_epoch: -1 },
    { ...goodReceipt(), receipt_epoch: "twelve" },
  ]) {
    const r = validateCustodyReceipt(bad);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 77);
    assert.equal(r.reason, "receipt_schema_invalid");
  }
});

test("cpc signal matchable: bad evidence_kind enum, zero entropy floor, zero disclosure budget all fail raw 67", () => {
  const matchable = {
    schema: "simurgh.custody_class_signal.v1",
    signal_mode: "matchable",
    failure_class: "undeclared_proxy_hop",
    stage4n_window_anchor_digest: D("9"),
    evidence_kind: "relay_spki_sha256",
    windowed_evidence_commitment: D("8"),
    custody_class_digest: D("0"),
    entropy_floor_bits: 96,
    disclosure_budget_max_signals_per_window: 4,
    public_linkability: "bounded",
  };
  for (const bad of [
    { ...matchable, evidence_kind: "psychic_hunch" },
    { ...matchable, entropy_floor_bits: 0 },
    { ...matchable, disclosure_budget_max_signals_per_window: 0 },
  ]) {
    const r = validateCpcSignal(bad);
    assert.equal(r.ok, false);
    assert.equal(r.raw, 67);
    assert.equal(r.reason, "schema_invalid");
  }
});
