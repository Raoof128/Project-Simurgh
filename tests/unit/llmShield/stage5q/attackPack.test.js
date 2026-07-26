// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 9 — attack-pack schema (spec §4.3) and symbolic-outcome enforcement (§12.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAttackPack,
  isAdmissible,
  PACK_FIELDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/attackPack.mjs";
import { OMISSION_REASONS } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const D = "a".repeat(64);

const pack = (over = {}) => ({
  attack_pack_id: "5q-5a-r1-01",
  target_scope: "tray-5a",
  attack_class: "R1",
  premise_receipt: { predicate_id: "violatesGrammar", fixture_digest: D },
  fixture_digests: [D],
  expected_outcomes: ["rejected_missing_key"],
  observed_outcomes: ["rejected_missing_key"],
  ...over,
});

const kinds = (p) => validateAttackPack(p).problems.map((x) => x.kind);

test("a well-formed pack validates", () => {
  const r = validateAttackPack(pack());
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
});

test("every §4.3 field is REQUIRED — an optional field in a schema gate is a suggestion", () => {
  for (const field of PACK_FIELDS) {
    const p = pack();
    delete p[field];
    assert.ok(kinds(p).includes("missing_field"), `${field} must be required`);
  }
});

// ---------------------------------------------------------------------------------------------
// The premise gate — inadmissible REGARDLESS of results
// ---------------------------------------------------------------------------------------------

test("a pack with NO premise receipt is inadmissible regardless of its results", () => {
  // The ordering matters: checking results first and premises second is how a green run buys itself
  // the benefit of the doubt.
  const perfect = pack({
    premise_receipt: null,
    expected_outcomes: ["rejected"],
    observed_outcomes: ["rejected"],
  });
  const k = kinds(perfect);
  assert.ok(k.includes("missing_premise_receipt"));

  const a = isAdmissible(perfect, { ok: true });
  assert.equal(a.admissible, false);
  assert.equal(a.reason, "schema");
});

test("a schema-valid pack whose PREMISE did not recompute is still inadmissible", () => {
  const a = isAdmissible(pack(), { ok: false });
  assert.equal(a.admissible, false);
  assert.equal(a.reason, "premise");
  assert.match(a.detail, /inadmissible even if every observed outcome matched/);
});

test("a pack naming a predicate outside the closed registry is rejected", () => {
  assert.ok(
    kinds(pack({ premise_receipt: { predicate_id: "looksFine", fixture_digest: D } })).includes(
      "unknown_predicate"
    )
  );
});

// ---------------------------------------------------------------------------------------------
// §12.4 — no raw codes
// ---------------------------------------------------------------------------------------------

test("a NUMERIC raw code in expected_outcomes is REJECTED", () => {
  // A number here pins the pack to a code Q1 may reallocate, after which the pack quietly starts
  // expecting a different failure than the one it was written for.
  const k = kinds(pack({ expected_outcomes: [474] }));
  assert.ok(k.includes("raw_code_in_outcomes"));
});

test("a NUMERIC STRING is rejected too — quoting a raw code does not make it symbolic", () => {
  assert.ok(kinds(pack({ expected_outcomes: ["474"] })).includes("raw_code_in_outcomes"));
  assert.ok(kinds(pack({ observed_outcomes: ["119"] })).includes("raw_code_in_outcomes"));
});

test("outcomes must match the symbolic grammar — no spaces, no caps, no prose", () => {
  for (const bad of ["Rejected", "rejected key", "", null, { code: 1 }]) {
    assert.ok(
      kinds(pack({ expected_outcomes: [bad] })).some((k) =>
        ["non_symbolic_outcome", "raw_code_in_outcomes"].includes(k)
      ),
      `${JSON.stringify(bad)} must be refused`
    );
  }
  assert.deepEqual(validateAttackPack(pack({ expected_outcomes: ["fail_closed_2"] })).problems, []);
});

// ---------------------------------------------------------------------------------------------
// Omission
// ---------------------------------------------------------------------------------------------

test("an omitted class carries a reason from the FROZEN SIX; free text is rejected", () => {
  const good = { attack_class: "R11", omitted: true, omission_reason: "single_runtime" };
  assert.deepEqual(validateAttackPack(good).problems, []);

  const prose = { attack_class: "R11", omitted: true, omission_reason: "not relevant here" };
  const p = validateAttackPack(prose).problems[0];
  assert.equal(p.kind, "invalid_omission_reason");
  assert.match(p.reason, /frozen six|hide/);
  for (const reason of OMISSION_REASONS) {
    assert.deepEqual(
      validateAttackPack({ attack_class: "R11", omitted: true, omission_reason: reason }).problems,
      []
    );
  }
});

test("an omitted pack cannot also REPORT observations", () => {
  const r = validateAttackPack({
    attack_class: "R11",
    omitted: true,
    omission_reason: "single_runtime",
    observed_outcomes: ["contained"],
  });
  assert.equal(r.problems[0].kind, "omission_with_results");
});

test("an omitted pack still needs a real attack class", () => {
  const r = validateAttackPack({
    omitted: true,
    omission_reason: "delegated",
    attack_class: "R99",
  });
  assert.ok(r.problems.some((p) => p.kind === "unknown_attack_class"));
});

// ---------------------------------------------------------------------------------------------
// Identity and fixtures
// ---------------------------------------------------------------------------------------------

test("a malformed pack id is rejected — ids are cited in findings forever", () => {
  for (const bad of ["pack1", "5q-5a-r17-01", "5Q-5A-R1-01", "5q-5a-r1"]) {
    assert.ok(kinds(pack({ attack_pack_id: bad })).includes("malformed_pack_id"), bad);
  }
  assert.deepEqual(
    validateAttackPack(pack({ attack_pack_id: "5q-campaign-head-r7-12" })).problems,
    []
  );
});

test("an attack class outside the frozen taxonomy is rejected", () => {
  assert.ok(kinds(pack({ attack_class: "R17" })).includes("unknown_attack_class"));
});

test("an EMPTY fixture list is rejected — a pack with no fixtures attacked nothing", () => {
  const k = kinds(pack({ fixture_digests: [] }));
  assert.ok(k.includes("empty_fixture_digests"));
});

test("a malformed fixture digest is rejected", () => {
  assert.ok(kinds(pack({ fixture_digests: ["nope"] })).includes("malformed_fixture_digest"));
});

test("an UNKNOWN field is rejected — the §4.3 record is exact", () => {
  const p = validateAttackPack(pack({ notes: "trust me" })).problems[0];
  assert.equal(p.kind, "unknown_field");
  assert.match(p.reason, /unreviewed channel/);
});

test("a fully valid pack with a recomputed premise IS admissible", () => {
  const a = isAdmissible(pack(), { ok: true });
  assert.equal(a.admissible, true);
  assert.equal(a.reason, "admitted");
});
