// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — frozen vocabularies.
//
// Every table here is CLOSED. Later tasks look values up; none of them may add one. An open enum is
// not an enum, and a vocabulary that can grow after results are known is how a coverage ratio stops
// meaning anything (L2).
//
// No logic lives in this module. It is data, so that a reviewer can read the stage's entire
// vocabulary in one file and check it against the spec without executing anything.

/** This stage. */
export const STAGE_ID = "5q";

/** The sixteen stages under attack, 5A..5P. */
export const STAGE5_STAGE_IDS = Object.freeze([
  "5a",
  "5b",
  "5c",
  "5d",
  "5e",
  "5f",
  "5g",
  "5h",
  "5i",
  "5j",
  "5k",
  "5l",
  "5m",
  "5n",
  "5o",
  "5p",
]);

/**
 * Closure roots — spec §2.1 plus Annex A1's R8.
 *
 * R8 is present from the FIRST census (Task 1.5), not bolted on later: 243 unit-test files carry
 * stage-5's unit-level gates, and a census built without them would author the graph and the role
 * file over the wrong universe.
 */
export const CLOSURE_ROOTS = Object.freeze(
  [
    { id: "R1", pattern: "tools/simurgh-attestation/stage5{a..p}/**", kinds: [".mjs", ".py"] },
    { id: "R2", pattern: "tests/e2e/llmShield/stage5{a..p}/**", kinds: [".js"] },
    { id: "R3", pattern: "proofs/stage5{a..p}/*.lean", kinds: [".lean"] },
    { id: "R4", pattern: "scripts/reproduce-llm-shield-stage5{a..p}.sh", kinds: [".sh"] },
    { id: "R5", pattern: ".github/workflows/**", kinds: [".yml"] },
    { id: "R6", pattern: "package.json:scripts", kinds: [".json"] },
    { id: "R7", pattern: "<static import closure of R1, first-party only>", kinds: [".mjs"] },
    { id: "R8", pattern: "tests/unit/llmShield/stage5{a..p}/**", kinds: [".js"] },
  ].map(Object.freeze)
);

/** The frozen attack taxonomy, spec §4.1. Identifiers are citable in findings forever. */
export const ATTACK_CLASSES = Object.freeze([
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R8",
  "R9",
  "R10",
  "R11",
  "R12",
  "R13",
  "R14",
  "R15",
  "R16",
]);

/** Security roles, spec §2.4. The first four carry the full applicable matrix. */
export const SECURITY_ROLES = Object.freeze([
  "trust_decision",
  "completeness_claim",
  "canonicalisation",
  "code_allocation",
  "evidence_emission",
  "schema_gate",
  "parity_mirror",
  "formal_statement",
  "orchestration",
  "pure_transform",
  "imported_dependency",
]);

/**
 * Coverage statuses, spec §2.7 — exactly four.
 *
 * There is deliberately no `covered_by_tests`, no `probably_safe`, no `helper_only` and no
 * `pending`. A member whose status cannot be established fails the census closed; it does not get a
 * comfortable word.
 */
export const COVERAGE_STATUSES = Object.freeze([
  "attacked_pass",
  "finding_frozen",
  "mechanically_unreachable",
  "delegated_to_attacked_caller",
]);

/** Why an attack class may be omitted for a member, spec §4.2. Free text is not permitted. */
export const OMISSION_REASONS = Object.freeze([
  "no_such_input_surface",
  "no_trust_decision",
  "no_persistent_state",
  "single_runtime",
  "not_in_historical_closure",
  "delegated",
]);

/**
 * The four real census conflicts, spec §2.6.
 *
 * A static-only internal is NOT here, and that absence is the projection rule: a runtime import
 * cannot enumerate module-private functions, so treating their absence as a conflict would flag
 * every internal in the repository forever.
 */
export const CENSUS_CONFLICT_SHAPES = Object.freeze([
  "runtime_visible_absent_from_static_projection",
  "static_export_absent_at_runtime",
  "dynamic_export_not_represented_statically",
  "category_or_identity_disagreement",
]);

/** Who found a finding, spec §5.1. Closed so the harness can never re-credit a human discovery. */
export const DISCOVERED_BY = Object.freeze([
  "pre_stage_design_review",
  "stage5q_q0_attack_pack",
  "external",
]);

/** Severity is claim-relative, spec §5.3 — it measures which signed claim a finding weakens. */
export const SEVERITIES = Object.freeze([
  "claim_falsifying",
  "claim_narrowing",
  "assurance_only",
  "hygiene",
]);

/** Defect vocabulary by phase (second gauntlet B4). The ledger does not exist until Task 10. */
export const DEFECT_KINDS = Object.freeze([
  "precommit_blocker",
  "pre_stage_finding_candidate",
  "q0_finding",
]);

/** Seeded mutants, spec §7.1. Unpadded, matching the M*.json filenames exactly. */
export const MUTANT_IDS = Object.freeze([
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7",
  "M8",
  "M9",
  "M10",
  "M11",
  "M12",
  "M13",
  "M14",
  "M15",
  "M16",
]);

/**
 * One mutant per attack class — a BIJECTION, and the bijection is the point.
 *
 * A cross-class detection is a secondary observation and discharges nothing. Without one-to-one
 * primaries a single noisy mutant (M4 plausibly trips R1, R3, R5 and R16 detectors) would make a
 * quarter of the taxonomy appear tested by one seeding.
 */
export const MUTANT_PRIMARY_CLASS = Object.freeze({
  M1: "R1",
  M2: "R2",
  M3: "R3",
  M4: "R4",
  M5: "R5",
  M6: "R6",
  M7: "R7",
  M8: "R8",
  M9: "R9",
  M10: "R10",
  M11: "R11",
  M12: "R12",
  M13: "R13",
  M14: "R14",
  M15: "R15",
  M16: "R16",
});

/**
 * Closed premise-predicate registry (second gauntlet B8).
 *
 * The first six were all a draft carried, which could not express the premises the sixteen trays and
 * three campaigns actually require — a pack would have had no way to prove its premise at all.
 * Adding a predicate is an annex, never an inline addition.
 */
export const PREDICATE_REGISTRY = Object.freeze([
  "contradicts",
  "violatesGrammar",
  "exceedsCeiling",
  "replaysAcross",
  "omitsMember",
  "divergesAcrossRuntimes",
  "signatureValidWrongObject",
  "trustRootSubstituted",
  "firstFailureInverted",
  "executionFabricated",
  "quorumNotDistinct",
  "appendOrderViolated",
  "authorityFromUntrusted",
  "temporalWindowMismatch",
  "mutuallyExclusive",
]);

/** Domain-separation tags. Distinct per object: a shared tag defeats the separation. */
export const DOMAIN = Object.freeze({
  sourceSpan: "simurgh.vsr.source-span.v1",
  frozenBlock: "simurgh.vsr.frozen-block.v1",
  closure: "simurgh.vsr.closure.v1",
  tags: "simurgh.vsr.tags.v1",
  taxonomy: "simurgh.vsr.taxonomy.v1",
  historical: "simurgh.vsr.historical.v1",
  obligation: "simurgh.vsr.obligation.v1",
  ledger: "simurgh.vsr.ledger.v1",
  mutation: "simurgh.vsr.mutation.v1",
  pack: "simurgh.vsr.pack.v1",
  premise: "simurgh.vsr.premise.v1",
  coverage: "simurgh.vsr.coverage.v1",
  results: "simurgh.vsr.results.v1",
  edges: "simurgh.vsr.edges.v1",
  roles: "simurgh.vsr.roles.v1",
  campaign: "simurgh.vsr.campaign.v1",
  k7: "simurgh.vsr.k7.v1",
  reproduce: "simurgh.vsr.reproduce.v1",
  transition: "simurgh.vsr.transition.v1",
});

const FULL_MATRIX = ATTACK_CLASSES;

/**
 * Attack obligation by role, spec §2.4.
 *
 * `pure_transform` carries none BY DEFAULT — it discharges by delegation. That is only safe because
 * §2.4's adversarial check fails closed when a `pure_transform` member is reachable from a
 * `trust_decision` member, which is what stops the role becoming an escape hatch.
 *
 * There is no default branch: an unknown role yields `undefined`, and callers fail closed rather
 * than silently inheriting a permissive matrix.
 */
export const REQUIRED_CLASSES_BY_ROLE = Object.freeze({
  trust_decision: FULL_MATRIX,
  completeness_claim: FULL_MATRIX,
  canonicalisation: FULL_MATRIX,
  code_allocation: FULL_MATRIX,
  evidence_emission: Object.freeze(["R1", "R2", "R7", "R8", "R10", "R15"]),
  schema_gate: Object.freeze(["R1", "R2", "R3", "R7", "R8", "R16"]),
  parity_mirror: Object.freeze(["R2", "R3", "R11"]),
  formal_statement: Object.freeze(["R7", "R10"]),
  orchestration: Object.freeze(["R9", "R16"]),
  pure_transform: Object.freeze([]),
  imported_dependency: Object.freeze([]),
});
