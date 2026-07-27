// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 15: the seven harness mutants, and Task 16's gate seeds.
//
// §8.2: 5R's own code is not exempt. A seeded defect in the admissibility checker, the delta ledger,
// the inheritance verifier or the suppression machinery must be caught by 5R's own tests, with a
// green→red→green receipt each.
//
// Every mutant is a TEXTUAL substitution with an anchor. If the anchor is not found the seeding
// fails loudly rather than reporting a mutant that was never applied — a self-proof whose mutation
// silently no-ops is a green run that proves nothing, which is the defect this file exists to catch
// one level down.

/** N1–N6, with N5 split into its two independent failures. */
export const MUTANTS = Object.freeze([
  {
    id: "N1",
    intent: "admissibility accepts a family whose orthogonal control WAS detected",
    file: "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
    find: 'observations?.orthogonal?.verdict === "not_detected",',
    replace: "true,",
    caught_by: "tests/unit/llmShield/stage5r/admissibility.test.js",
    expected_catch: "the orthogonal condition no longer fails when the control was detected",
  },
  {
    id: "N2",
    intent: "delta ledger double-counts a cell 5Q already discharged",
    file: "tools/simurgh-attestation/stage5r/core/deltaLedger.mjs",
    find: "if (q0Discharged.has(id)) {",
    replace: "if (false) {",
    caught_by: "tests/unit/llmShield/stage5r/deltaLedger.test.js",
    expected_catch: "the empty-intersection assertion stops refusing an already-discharged id",
  },
  {
    id: "N3",
    intent: "inheritance verifier accepts a mutated 5Q digest",
    file: "tools/simurgh-attestation/stage5r/core/inherit.mjs",
    find: "if (got !== INHERITED_FILE_PINS[name]) {",
    replace: "if (false) {",
    caught_by: "tests/unit/llmShield/stage5r/inherit.test.js",
    expected_catch: "a one-byte change to an inherited file stops being refused",
  },
  {
    id: "N4",
    intent: "a safe control that is a stub the detector never reaches is accepted",
    file: "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
    find: "if (safe.exercises_detector_signal_path !== true) {",
    replace: "if (false) {",
    caught_by: "tests/unit/llmShield/stage5r/admissibility.test.js",
    expected_catch: "the not-a-stub rule stops rejecting a control that never reaches the signal",
  },
  {
    id: "N5a",
    intent: "the suppression machinery is a NO-OP: suppressing changes nothing because nothing ran",
    file: "tools/simurgh-attestation/stage5r/core/suppression.mjs",
    find: '"process exit code alone": (o) => ({ ...o, exit_code: 0 }),',
    replace: '"process exit code alone": (o) => o,',
    caught_by: "tests/unit/llmShield/stage5r/suppression.test.js",
    expected_catch: "the self-test reports the transform inert, so invariance cannot be claimed",
  },
  {
    id: "N5b",
    intent: "a family whose verdict CHANGES under suppression is admitted anyway",
    file: "tools/simurgh-attestation/stage5r/core/deltaLedger.mjs",
    find: "c?.suppression_invariant === true &&",
    replace: "true &&",
    caught_by: "tests/unit/llmShield/stage5r/deltaLedger.test.js",
    expected_catch: "clause 10 stops requiring suppression invariance on the member",
  },
  {
    id: "N6",
    intent: "a per-role admissibility silently promotes to class-wide",
    file: "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
    find: "(v) => v.admissible && v.attack_class === attackClass && v.target_security_role === role",
    replace: "(v) => v.admissible && v.attack_class === attackClass",
    caught_by: "tests/unit/llmShield/stage5r/admissibility.test.js",
    expected_catch: "THE BLADE: admissibility in one role starts answering for another",
  },
]);

/**
 * Task 16's gate seeds: G0–G7 and G10, each with a violation and the command that must refuse it.
 * G8 and G9 are absent on purpose — they are built by Tasks 23 and 26, and proving the red state of
 * a gate that does not exist yet is the P5 violation this plan already made once.
 */
export const GATE_SEEDS = Object.freeze([
  {
    gate: "G0",
    asserts: "the spec's measurements recompute",
    file: "docs/superpowers/specs/2026-07-27-stage-5r-vpf-verifiable-probe-families-design.md",
    find: "cells in those fourteen classes                      20 213",
    replace: "cells in those fourteen classes                      20 214",
    command: "node --test tests/unit/llmShield/stage5r/measurements.test.js",
  },
  {
    gate: "G1",
    asserts: "the seven inherited digests recompute and the envelope verifies roots-first",
    file: "docs/research/llm-shield/evidence/stage-5q/closure/attack-taxonomy.json",
    append: "\n",
    command: "node --test tests/unit/llmShield/stage5r/inherit.test.js",
  },
  {
    gate: "G2",
    asserts: "every published family satisfies all seven conditions",
    file: "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
    find: 'observations?.vulnerable?.verdict === "detected",',
    replace: "true,",
    command: "node --test tests/unit/llmShield/stage5r/admissibility.test.js",
  },
  {
    gate: "G3",
    asserts: "every control carries a recomputed premise and proven restoration",
    file: "tools/simurgh-attestation/stage5r/core/controls.mjs",
    find: "if (current.holds !== true) {",
    replace: "if (false) {",
    command: "node --test tests/unit/llmShield/stage5r/controls.test.js",
  },
  {
    gate: "G4",
    asserts: "no coverage_delta intersects 5Q's discharged set",
    file: "tools/simurgh-attestation/stage5r/core/deltaLedger.mjs",
    find: "if (q0Discharged.has(id)) {",
    replace: "if (false) {",
    command: "node --test tests/unit/llmShield/stage5r/deltaLedger.test.js",
  },
  {
    gate: "G5",
    asserts: "no per-role admissibility promotes to class-wide",
    file: "tools/simurgh-attestation/stage5r/core/admissibility.mjs",
    find: "(v) => v.admissible && v.attack_class === attackClass && v.target_security_role === role",
    replace: "(v) => v.admissible && v.attack_class === attackClass",
    command: "node --test tests/unit/llmShield/stage5r/admissibility.test.js",
  },
  {
    gate: "G6",
    asserts: "the seven N-mutants are detected",
    // The seed targets the RUNNER, not this file. Any anchor into the census appears twice — once
    // in the code and once in the seed quoting it — and an ambiguous anchor is refused by design.
    // The runner's catch derivation is the line whose failure would make every receipt a lie.
    file: "tools/simurgh-attestation/stage5r/node/runMutationSelfProof.mjs",
    find: "  return baselineOk && !mutatedOk && restoredOk;",
    replace: "  return true;",
    command: "node --test tests/unit/llmShield/stage5r/selfProof.test.js",
  },
  {
    gate: "G7",
    asserts: "no 5R artifact attributes a post-5Q figure to 5Q",
    file: "tools/simurgh-attestation/stage5r/core/prose.mjs",
    find: "if (percent === Q0_PUBLISHED_PERCENT) continue;",
    replace: "if (true) continue;",
    command: "node --test tests/unit/llmShield/stage5r/scanners.test.js",
  },
  {
    gate: "G10",
    asserts: "no 5R document prints a predecessor-band raw-code literal",
    file: "tools/simurgh-attestation/stage5r/core/rawCodeScan.mjs",
    find: "      if (re.test(stripped)) {",
    replace: "      if (false) {",
    command: "node --test tests/unit/llmShield/stage5r/scanners.test.js",
  },
]);

/**
 * Apply a seed to source text, failing loudly if the anchor is gone.
 *
 * @param {string} text
 * @param {{find?: string, replace?: string, append?: string, id?: string, gate?: string}} seed
 * @returns {string}
 */
export function applySeed(text, seed) {
  const name = seed.id ?? seed.gate ?? "seed";
  if (seed.append !== undefined) return `${text}${seed.append}`;
  if (!text.includes(seed.find)) {
    throw new Error(
      `${name}: anchor not found — the mutation would have silently no-opped, and a self-proof ` +
        `whose mutation never applied is a green run that proves nothing`
    );
  }
  const occurrences = text.split(seed.find).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${name}: anchor occurs ${occurrences} times; a seed must be unambiguous`);
  }
  return text.replace(seed.find, seed.replace);
}
