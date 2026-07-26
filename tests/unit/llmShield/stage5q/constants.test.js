// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — the frozen constant tables.
//
// These are the vocabularies every later task keys off: closure roots, attack classes, security
// roles, coverage statuses, omission reasons, mutants. They carry no logic, so the tests here are
// about SHAPE and CLOSEDNESS — an open enum is not an enum, and a table that can silently grow is
// how a completeness claim stops being one.
//
// The load-bearing test is the mutant bijection. Spec §7.1 requires one mutant per attack class and
// forbids a cross-class detection from discharging a class it was not seeded for; without a
// bijection asserted here, one noisy mutant could make a quarter of the taxonomy look tested.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_ID,
  STAGE5_STAGE_IDS,
  CLOSURE_ROOTS,
  ATTACK_CLASSES,
  SECURITY_ROLES,
  COVERAGE_STATUSES,
  OMISSION_REASONS,
  CENSUS_CONFLICT_SHAPES,
  DISCOVERED_BY,
  SEVERITIES,
  MUTANT_IDS,
  MUTANT_PRIMARY_CLASS,
  PREDICATE_REGISTRY,
  DOMAIN,
  REQUIRED_CLASSES_BY_ROLE,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const frozen = (v) => Object.isFrozen(v);

test("stage identity", () => {
  assert.equal(STAGE_ID, "5q");
  assert.equal(STAGE5_STAGE_IDS.length, 16, "5a..5p is sixteen stages");
  assert.deepEqual(STAGE5_STAGE_IDS[0], "5a");
  assert.deepEqual(STAGE5_STAGE_IDS[15], "5p");
  assert.ok(frozen(STAGE5_STAGE_IDS));
});

test("closure roots R1-R8 — R8 present from the first census (Annex A1)", () => {
  // Annex A1 added R8 and the second gauntlet moved it to Task 1.5, BEFORE any census runs. If R8
  // were missing here every downstream census would be built over the wrong universe.
  assert.equal(CLOSURE_ROOTS.length, 8);
  const ids = CLOSURE_ROOTS.map((r) => r.id);
  assert.deepEqual(ids, ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"]);
  const r8 = CLOSURE_ROOTS.find((r) => r.id === "R8");
  assert.match(r8.pattern, /tests\/unit\/llmShield\/stage5/, "R8 admits stage-5 unit-level gates");
  assert.ok(CLOSURE_ROOTS.every(frozen), "each root record is frozen");
});

test("the attack taxonomy is exactly R1-R16 and closed", () => {
  assert.equal(ATTACK_CLASSES.length, 16);
  assert.deepEqual(ATTACK_CLASSES[0], "R1");
  assert.deepEqual(ATTACK_CLASSES[15], "R16");
  assert.ok(frozen(ATTACK_CLASSES));
});

test("security roles are the eleven of §2.4", () => {
  assert.equal(SECURITY_ROLES.length, 11);
  for (const r of [
    "trust_decision",
    "completeness_claim",
    "canonicalisation",
    "code_allocation",
    "pure_transform",
    "imported_dependency",
  ]) {
    assert.ok(SECURITY_ROLES.includes(r), `missing role ${r}`);
  }
});

test("exactly four coverage statuses — no covered_by_tests, no probably_safe", () => {
  assert.equal(COVERAGE_STATUSES.length, 4, "L1 admits four statuses and no others");
  assert.deepEqual([...COVERAGE_STATUSES].sort(), [
    "attacked_pass",
    "delegated_to_attacked_caller",
    "finding_frozen",
    "mechanically_unreachable",
  ]);
  for (const forbidden of ["covered_by_tests", "probably_safe", "helper_only", "pending"]) {
    assert.ok(!COVERAGE_STATUSES.includes(forbidden), `${forbidden} must not be a status`);
  }
});

test("omission reasons are the frozen six of §4.2 — free text is not an option", () => {
  assert.equal(OMISSION_REASONS.length, 6);
  assert.ok(OMISSION_REASONS.includes("delegated"));
  assert.ok(OMISSION_REASONS.includes("no_trust_decision"));
});

test("census conflict shapes are exactly the four of §2.6", () => {
  // A static-only internal is NOT a conflict; that is the projection rule, and the absence of a
  // fifth shape is what stops the census acquiring exceptions until exceptions are wallpaper.
  assert.equal(CENSUS_CONFLICT_SHAPES.length, 4);
});

test("discovered_by is closed — the harness can never re-credit a human discovery", () => {
  assert.deepEqual([...DISCOVERED_BY].sort(), [
    "external",
    "pre_stage_design_review",
    "stage5q_q0_attack_pack",
  ]);
});

test("severities are claim-relative, not CVSS", () => {
  assert.deepEqual([...SEVERITIES].sort(), [
    "assurance_only",
    "claim_falsifying",
    "claim_narrowing",
    "hygiene",
  ]);
});

test("MUTANT_PRIMARY_CLASS is a BIJECTION onto the attack classes", () => {
  // The anti-noisy-mutant rule, made mechanical (§7.1). M4 plausibly trips R1, R3, R5 and R16
  // detectors; without one-to-one primaries, seeding it once would make a quarter of the taxonomy
  // appear tested. Cross-class detections are secondary observations and discharge nothing.
  assert.equal(MUTANT_IDS.length, 16);
  assert.equal(Object.keys(MUTANT_PRIMARY_CLASS).length, 16);

  // total: every mutant maps somewhere
  for (const m of MUTANT_IDS) {
    assert.ok(MUTANT_PRIMARY_CLASS[m], `${m} has no primary class`);
    assert.ok(ATTACK_CLASSES.includes(MUTANT_PRIMARY_CLASS[m]), `${m} maps outside the taxonomy`);
  }
  // injective: no two mutants share a primary class
  const targets = MUTANT_IDS.map((m) => MUTANT_PRIMARY_CLASS[m]);
  assert.equal(new Set(targets).size, 16, "two mutants share a primary class");
  // surjective: every class is someone's primary
  for (const c of ATTACK_CLASSES) {
    assert.ok(targets.includes(c), `attack class ${c} has no seeded mutant`);
  }
  // and unpadded ids, matching the M*.json filenames (gauntlet m1)
  assert.ok(MUTANT_IDS.includes("M1"), "ids are unpadded: M1, never M01");
  assert.ok(!MUTANT_IDS.includes("M01"));
});

test("the premise predicate registry covers every named pack (second gauntlet B8)", () => {
  // A six-predicate registry could not express the premises the sixteen trays and three campaigns
  // actually need, so a pack would have had no way to prove its premise at all.
  assert.ok(PREDICATE_REGISTRY.length >= 15, "registry too small for the planned packs");
  for (const p of [
    "contradicts",
    "signatureValidWrongObject",
    "trustRootSubstituted",
    "firstFailureInverted",
    "executionFabricated",
    "quorumNotDistinct",
    "appendOrderViolated",
    "authorityFromUntrusted",
    "temporalWindowMismatch",
    "mutuallyExclusive",
  ]) {
    assert.ok(PREDICATE_REGISTRY.includes(p), `predicate ${p} missing`);
  }
});

test("required classes: the four full-obligation roles get the whole matrix", () => {
  for (const role of [
    "trust_decision",
    "completeness_claim",
    "canonicalisation",
    "code_allocation",
  ]) {
    assert.deepEqual(
      [...REQUIRED_CLASSES_BY_ROLE[role]].sort(),
      [...ATTACK_CLASSES].sort(),
      `${role} must carry the full applicable matrix`
    );
  }
  // pure_transform carries none by default — it discharges by delegation, and §2.4's adversarial
  // check is what stops that being an escape hatch.
  assert.deepEqual(REQUIRED_CLASSES_BY_ROLE.pure_transform, []);
});

test("an unknown role has NO entry — lookups fail closed rather than defaulting", () => {
  assert.equal(REQUIRED_CLASSES_BY_ROLE.definitely_not_a_role, undefined);
});

test("every domain tag is versioned and namespaced", () => {
  for (const [key, value] of Object.entries(DOMAIN)) {
    // Digits are legal inside a segment name (`k7`); the first draft of this regex forbade them and
    // failed on a correct constant. Fix the test, not the data.
    assert.match(value, /^simurgh\.vsr\.[a-z0-9-]+\.v\d+$/, `domain ${key} is malformed: ${value}`);
  }
  assert.equal(DOMAIN.sourceSpan, "simurgh.vsr.source-span.v1");
  assert.equal(DOMAIN.obligation, "simurgh.vsr.obligation.v1");
  // Distinctness matters more than shape: two objects sharing a tag defeats domain separation.
  const tags = Object.values(DOMAIN);
  assert.equal(new Set(tags).size, tags.length, "two domains share a tag");
});

test("every exported collection is frozen", () => {
  for (const c of [
    STAGE5_STAGE_IDS,
    CLOSURE_ROOTS,
    ATTACK_CLASSES,
    SECURITY_ROLES,
    COVERAGE_STATUSES,
    OMISSION_REASONS,
    CENSUS_CONFLICT_SHAPES,
    DISCOVERED_BY,
    SEVERITIES,
    MUTANT_IDS,
    MUTANT_PRIMARY_CLASS,
    PREDICATE_REGISTRY,
    DOMAIN,
    REQUIRED_CLASSES_BY_ROLE,
  ]) {
    assert.ok(frozen(c), "a mutable vocabulary is not a vocabulary");
  }
});
