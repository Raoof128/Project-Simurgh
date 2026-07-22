// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §7.3.6 — the canonical Lane-A S7.* first-failure matrix.
//
// Every row is a SINGLE-defect mutation of a fresh valid case, so the reason returned is the FIRST
// check to fail: getting the assigned reason proves checks 1..c-1 passed on that fixture (prefix-
// satisfaction). Check 6 runs against a sealed synthetic validator that accepts exactly one frozen
// header-vector and returns one fixed VerifiedBitcoinSuffix — NOT claimed to satisfy Bitcoin PoW;
// real PoW is Lane B/C. Fixture counts are DERIVED from the row array, never hand-carried.
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalJson } from "../../../../tools/simurgh-attestation/stage4m/core/canonical.mjs";
import {
  makeSection7Verifier,
  makeEvaluateSection7Safe,
  SECTION7_FIRST_FAILURE_ORDER,
} from "../../../../tools/simurgh-attestation/stage5o/core/section7Verifier.mjs";
import { RAW_VERIFIER_CODES } from "../../../../tools/simurgh-attestation/stage4h/exitCodes.mjs";
import {
  buildValidSection7Case,
  validateSyntheticBitcoinSuffix,
  makeSyntheticValidator,
  VERIFIED_FACT,
  tok,
} from "./section7SyntheticFixture.mjs";

const withArtifact = (bundle, name, fn) => {
  const o = JSON.parse(bundle[name]);
  fn(o);
  return { ...bundle, [name]: canonicalJson(o) };
};
const noncanonical = (bundle, name) => ({
  ...bundle,
  [name]: JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(bundle[name])).reverse())),
});

const ATTACK = "evidence_attack_fixtures";
const POSITIVE = "implementation_regression_fixtures";

// Each build() returns { context, bundle, validator }. The reason (or ACCEPT) is the frozen verdict.
const ROWS = [
  {
    id: "S7.1",
    cls: POSITIVE,
    accept: true,
    build: () => ({ ...base(), validator: validateSyntheticBitcoinSuffix }),
  },
  {
    id: "S7.2",
    cls: ATTACK,
    reason: "s7_noncanonical_or_oversize",
    build: () => {
      const b = base();
      return { ...b, bundle: noncanonical(b.bundle, "beacon_contract") };
    },
  },
  {
    id: "S7.3",
    cls: ATTACK,
    reason: "s7_artifact_shape",
    build: () => {
      const b = base();
      return {
        ...b,
        bundle: withArtifact(b.bundle, "beacon_contract", (o) => delete o.challenge_height),
      };
    },
  },
  {
    id: "S7.4",
    cls: ATTACK,
    reason: "s7_bytes32_token_grammar",
    build: () => {
      const b = base();
      return {
        ...b,
        bundle: withArtifact(
          b.bundle,
          "beacon_contract",
          (o) => (o.schema_digest = "A".repeat(64))
        ),
      };
    },
  },
  {
    id: "S7.5",
    cls: ATTACK,
    reason: "s7_schema_pin_mismatch",
    build: () => mutate("beacon_contract", (o) => (o.schema_id = "simurgh.vsc.wrong.v1")),
  },
  {
    id: "S7.6",
    cls: ATTACK,
    reason: "s7_schema_pin_mismatch",
    build: () => mutate("beacon_contract", (o) => (o.schema_digest = tok(0xee))),
  },
  {
    id: "S7.7",
    cls: ATTACK,
    reason: "s7_schema_pin_mismatch",
    build: () => mutate("beacon_contract", (o) => (o.profile_id = "simurgh.vsc.wrong_profile.v1")),
  },
  {
    id: "S7.8",
    cls: ATTACK,
    reason: "s7_schema_pin_mismatch",
    build: () => mutate("beacon_contract", (o) => (o.profile_digest = tok(0xee))),
  },
  {
    id: "S7.9",
    cls: ATTACK,
    reason: "s7_checkpoint_not_verifier_derived",
    build: () =>
      mutate("beacon_suffix", (o) => (o.verified_closure_bitcoin_checkpoint_digest = tok(0xee))),
  },
  {
    id: "S7.10",
    cls: ATTACK,
    reason: "s7_chain_invalid",
    build: () =>
      mutate("beacon_suffix", (o) => (o.headers = [...o.headers.slice(0, -1), "f".repeat(160)])),
  },
  {
    id: "S7.11",
    cls: ATTACK,
    reason: "s7_insufficient_descendants",
    build: () => ({
      ...base(),
      validator: makeSyntheticValidator({
        ...VERIFIED_FACT,
        finalSuffixHeight: VERIFIED_FACT.beaconHeight + 5, // depth 5 < required 6
      }),
    }),
  },
  {
    id: "S7.12",
    cls: ATTACK,
    reason: "s7_precommitment_binding_mismatch",
    build: () => mutate("beacon_contract", (o) => (o.challenge_height = "850001")),
  },
  {
    id: "S7.13",
    cls: ATTACK,
    reason: "s7_precommitment_binding_mismatch",
    build: () => mutate("ordered_selected_indices", (o) => (o.indices = o.indices.slice(0, -1))),
  },
  {
    id: "S7.14",
    cls: ATTACK,
    reason: "s7_index_derivation",
    build: () => {
      const b = base();
      const real = JSON.parse(b.bundle.ordered_selected_indices).indices.map(Number);
      let cand = Array.from({ length: real.length }, (_, i) => i); // [0..k-1]
      if (sameList(cand, real)) cand = cand.map((x) => x + 1); // [1..k]
      assert.ok(!sameList(cand, real), "S7.14 premise: substitute set differs from the replay");
      return {
        ...b,
        bundle: withArtifact(
          b.bundle,
          "ordered_selected_indices",
          (o) => (o.indices = cand.map(String))
        ),
      };
    },
  },
  {
    id: "S7.15",
    cls: ATTACK,
    reason: "s7_root_incomplete",
    build: () =>
      mutate(
        "challenge_record",
        (o) => (o.ordered_selected_indices_digest = o.beacon_contract_digest) // cross-wire
      ),
  },
  {
    id: "S7.16",
    cls: ATTACK,
    reason: "s7_seed_binding",
    build: () => ({
      ...buildValidSection7Case({ forgedSeedToken: tok(0xff) }),
      validator: validateSyntheticBitcoinSuffix,
    }),
  },
];

function base() {
  const { context, bundle } = buildValidSection7Case();
  return { context, bundle, validator: validateSyntheticBitcoinSuffix };
}
function mutate(name, fn) {
  const b = base();
  return { ...b, bundle: withArtifact(b.bundle, name, fn) };
}
function sameList(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

for (const row of ROWS) {
  test(`${row.id} (${row.cls}) -> ${row.accept ? "ACCEPT" : row.reason}`, () => {
    const { context, bundle, validator } = row.build();
    const verify = makeSection7Verifier({ validateBitcoinSuffix: validator });
    const result = verify(context, bundle);
    if (row.accept) {
      assert.deepEqual(result, { accept: true });
    } else {
      assert.deepEqual(
        result,
        { reject: row.reason },
        `${row.id} must reject at its assigned check`
      );
    }
  });
}

test("matrix: derived class counts (never hand-carried) — 1 positive control + 15 evidence attacks", () => {
  const positive = ROWS.filter((r) => r.cls === POSITIVE);
  const attacks = ROWS.filter((r) => r.cls === ATTACK);
  assert.equal(positive.length, 1);
  assert.equal(attacks.length, ROWS.length - 1);
  assert.ok(positive[0].accept === true);
});

test("matrix: every one of the eleven reasons has at least one live witness", () => {
  const witnessed = new Set(ROWS.filter((r) => r.reason).map((r) => r.reason));
  for (const reason of SECTION7_FIRST_FAILURE_ORDER) {
    assert.ok(witnessed.has(reason), `reason ${reason} has no S7 witness`);
  }
  assert.equal(SECTION7_FIRST_FAILURE_ORDER.length, 11);
});

test("prefix-satisfaction: removing the mutation makes every attack row ACCEPT (single-defect)", () => {
  const verify = makeSection7Verifier({ validateBitcoinSuffix: validateSyntheticBitcoinSuffix });
  const { context, bundle } = buildValidSection7Case();
  assert.deepEqual(verify(context, bundle), { accept: true });
});

test("wiring: makeSection7Verifier requires a validator; the relation is exactly two-argument", () => {
  assert.throws(() => makeSection7Verifier({}));
  const verify = makeSection7Verifier({ validateBitcoinSuffix: validateSyntheticBitcoinSuffix });
  assert.equal(verify.length, 2, "ordinary callers pass (context, bundle) only");
});

test("wiring: an extra third argument cannot inject a weaker validator", () => {
  const verify = makeSection7Verifier({ validateBitcoinSuffix: validateSyntheticBitcoinSuffix });
  const { context, bundle } = buildValidSection7Case();
  const evil = () => ({ ok: true, value: VERIFIED_FACT });
  // The 2-arg relation ignores any extra argument; the sealed validator still governs check 6.
  assert.deepEqual(verify(context, bundle, evil), { accept: true });
  const broken = withArtifact(bundle, "beacon_suffix", (o) => (o.headers = ["f".repeat(160)]));
  assert.deepEqual(
    verify(context, broken, () => ({ ok: true, value: VERIFIED_FACT })),
    { reject: "s7_chain_invalid" },
    "a caller-supplied validator is ignored — the sealed one rejects the wrong chain"
  );
});

test("safe wrapper: a real chain rejection stays symbolic, never raw 29", () => {
  const verify = makeSection7Verifier({ validateBitcoinSuffix: validateSyntheticBitcoinSuffix });
  const safe = makeEvaluateSection7Safe(verify);
  const { context, bundle } = buildValidSection7Case();
  const broken = withArtifact(bundle, "beacon_suffix", (o) => (o.headers = ["f".repeat(160)]));
  assert.deepEqual(safe(context, broken), { reject: "s7_chain_invalid" });
});

test("safe wrapper: an unaccepted context throws in the relation but fails closed to raw 29", () => {
  const verify = makeSection7Verifier({ validateBitcoinSuffix: validateSyntheticBitcoinSuffix });
  const safe = makeEvaluateSection7Safe(verify);
  const { bundle } = buildValidSection7Case();
  const rawContext = { k: 8, universe_size: 256 }; // a lookalike, not minted
  assert.throws(() => verify(rawContext, bundle), /unaccepted_context/);
  assert.deepEqual(safe(rawContext, bundle), {
    fail_closed: true,
    raw_code: RAW_VERIFIER_CODES.INTERNAL_ERROR_FAIL_CLOSED,
  });
});
