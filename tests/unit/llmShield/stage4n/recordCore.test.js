// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { test } from "node:test";
import { recordDigest } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  BAND_DIMENSIONS,
  HEARTBEAT_NON_CLAIMS,
  REVEAL_NON_CLAIMS,
  SEISMOGRAPH_CHAIN_ID,
  SEISMOGRAPH_HEARTBEAT_SCHEMA,
  SEISMOGRAPH_REVEAL_SCHEMA,
} from "../../../../tools/simurgh-attestation/stage4n/constants.mjs";
import {
  bandFor,
  commitBandVector,
  validateHeartbeat,
  validateReveal,
} from "../../../../tools/simurgh-attestation/stage4n/core/recordCore.mjs";

const D = (v) => recordDigest({ v }); // shorthand valid sha256:… digests for fixtures

export const goodHeartbeat = () => ({
  schema: SEISMOGRAPH_HEARTBEAT_SCHEMA,
  record_type: "heartbeat",
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  window_id: "synthetic-0003",
  position: 4,
  prev_record_digest: D("prev"),
  commitments: {
    stage4k_exposure_root: D("4k"),
    stage4l_cluster_budget_root: D("4l"),
    stage4m_disclosure_root: D("4m"),
    private_evidence_root: D("per"),
  },
  reveal_commitment: {
    committed_band_vector_digest: D("cbv"),
    reveal_due_window: "synthetic-0005",
  },
  non_claims: [...HEARTBEAT_NON_CLAIMS],
});

export const goodReveal = () => ({
  schema: SEISMOGRAPH_REVEAL_SCHEMA,
  record_type: "aggregate_reveal",
  stage: "4N",
  chain_id: SEISMOGRAPH_CHAIN_ID,
  window_id: "synthetic-0003",
  revealed_at_window: "synthetic-0005",
  position: 9,
  prev_record_digest: D("prev9"),
  bands: { breach_count: "1-5", consumer_count: "1-10" },
  reveal_salt: D("salt"),
  self_leakage: {
    band_vector_space_size: 9,
    leakage_bits_upper_bound: 4,
    budget_bits: 4,
    within_budget: true,
  },
  non_claims: [...REVEAL_NON_CLAIMS],
});

test("bandFor maps raw counts onto declared bands deterministically", () => {
  assert.equal(bandFor(0, BAND_DIMENSIONS.breach_count), "0");
  assert.equal(bandFor(1, BAND_DIMENSIONS.breach_count), "1-5");
  assert.equal(bandFor(5, BAND_DIMENSIONS.breach_count), "1-5");
  assert.equal(bandFor(6, BAND_DIMENSIONS.breach_count), ">5");
  assert.equal(bandFor(7, BAND_DIMENSIONS.consumer_count), "1-10");
  assert.throws(() => bandFor(-1, BAND_DIMENSIONS.breach_count), /band_unmappable/);
});

test("commitBandVector is order-independent and salt-sensitive", () => {
  const a = commitBandVector({
    window_id: "synthetic-0003",
    bands: { breach_count: "1-5", consumer_count: "1-10" },
    salt: D("s"),
  });
  const b = commitBandVector({
    window_id: "synthetic-0003",
    bands: { consumer_count: "1-10", breach_count: "1-5" },
    salt: D("s"),
  });
  assert.equal(a, b); // canonical JSON sorts keys
  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  const c = commitBandVector({
    window_id: "synthetic-0003",
    bands: { breach_count: "1-5", consumer_count: "1-10" },
    salt: D("other"),
  });
  assert.notEqual(a, c);
});

test("clean heartbeat validates; mutations fail closed", () => {
  assert.deepEqual(validateHeartbeat(goodHeartbeat()), { ok: true });
  const cases = [
    [(r) => (r.aggregate_reveal = null), "unknown_field:aggregate_reveal"], // Fix 1 guard
    [(r) => delete r.commitments.private_evidence_root, "commitments_keys_invalid"],
    [(r) => (r.commitments.stage4k_exposure_root = "not-a-digest"), "digest_malformed"],
    [(r) => (r.record_type = "aggregate_reveal"), "record_type_mismatch"],
    [(r) => (r.non_claims = []), "non_claims_incomplete"],
    [(r) => (r.position = "4"), "position_not_integer"],
  ];
  for (const [mutate, reason] of cases) {
    const r = goodHeartbeat();
    mutate(r);
    assert.deepEqual(validateHeartbeat(r), { ok: false, reason }, reason);
  }
});

test("clean reveal validates; raw counts and undeclared dimensions fail closed", () => {
  assert.deepEqual(validateReveal(goodReveal(), BAND_DIMENSIONS), { ok: true });
  const cases = [
    [(r) => (r.bands.breach_count = 7), "raw_count_public"], // T10 seed
    [(r) => (r.bands.cluster_count = "1-10"), "undeclared_band_dimension"], // T9 seed
    [(r) => (r.bands.breach_count = "2-6"), "band_label_unknown"],
    [(r) => delete r.reveal_salt, "missing_field:reveal_salt"],
    [(r) => (r.self_leakage.within_budget = "yes"), "self_leakage_invalid"],
  ];
  for (const [mutate, reason] of cases) {
    const r = goodReveal();
    mutate(r);
    assert.deepEqual(validateReveal(r, BAND_DIMENSIONS), { ok: false, reason }, reason);
  }
});
