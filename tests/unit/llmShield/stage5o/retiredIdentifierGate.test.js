// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5O §10.6 — retired_identifier_active_use_rejection.
//
// A retired identifier mentioned HISTORICALLY is permitted; the same identifier used NORMATIVELY is
// not. A plain grep cannot draw that line: it counts names and cannot read context, which is why the
// old dead-language check reported green on `closure_capsule_root` by luck of wording — every
// occurrence happened to be a declaration of its absence. A gate that passes for the wrong reason is
// in the same condition as one that fails.
//
// The REQUIRED self-test is the last case: inject the retired identifier into an ACTIVE requirement
// block and confirm the gate REJECTS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  RETIRED_IDENTIFIERS,
  classifyOccurrence,
  retiredIdentifierGate,
  OCCURRENCE_CLASSES,
} from "../../../../tools/simurgh-attestation/stage5o/node/retiredIdentifierGate.mjs";

const SPEC = fileURLToPath(
  new URL(
    "../../../../docs/superpowers/specs/2026-07-15-stage-5o-vsc-hidden-universe-equality-design.md",
    import.meta.url
  )
);

test("§10.6 the retired register names the A14 casualty", () => {
  assert.ok(RETIRED_IDENTIFIERS.includes("closure_capsule_root"));
  assert.deepEqual(
    [...OCCURRENCE_CLASSES].sort(),
    ["active_normative", "amendment_history", "explicit_absence", "negative_fixture"].sort()
  );
});

test("§10.6 PERMITTED: amendment history describing the deletion", () => {
  const line =
    "**Amendment A14 folded (amends frozen Section 5):** `closure_capsule_root` is removed.";
  assert.equal(classifyOccurrence(line, "closure_capsule_root").klass, "amendment_history");
  assert.equal(classifyOccurrence(line, "closure_capsule_root").violation, false);
});

test("§10.6 PERMITTED: an explicit absence declaration", () => {
  for (const line of [
    "`closure_capsule_root` is **absent by design** (A14).",
    "A14 (no `closure_capsule_root` prechallenge; the package capsule is post-challenge).",
    "`closure_capsule_root` was deleted and never returns.",
  ]) {
    const r = classifyOccurrence(line, "closure_capsule_root");
    assert.equal(r.violation, false, line);
    assert.equal(r.klass, "explicit_absence");
  }
});

test("§10.6 PERMITTED: a negative fixture proving rejection", () => {
  const line =
    "| S12.4 | `closure_capsule_root` present prechallenge | **reject** — retired construction |";
  const r = classifyOccurrence(line, "closure_capsule_root");
  assert.equal(r.klass, "negative_fixture");
  assert.equal(r.violation, false);
});

test("§10.6 FORBIDDEN: normative reuse in a requirement, formula, or release mapping", () => {
  const forbidden = [
    "requirement:    closure_capsule_root must bind the prechallenge subject",
    "discharge condition: build `closure_capsule_root` over the assembled package",
    "release_required_bindings = [`closure_capsule_root`]",
    'section_12.required_later_bindings = ["closure_capsule_root"]',
    "closure_capsule_root = SHA256(DOMAIN || canonicalJson(subject))",
    "owner:          closure_capsule_root",
  ];
  for (const line of forbidden) {
    const r = classifyOccurrence(line, "closure_capsule_root");
    assert.equal(r.violation, true, `should REJECT: ${line}`);
    assert.equal(r.klass, "active_normative");
  }
});

test("§10.6 the distinction a grep cannot make: same identifier, opposite verdicts", () => {
  const historical = "`closure_capsule_root` is absent by design.";
  const normative = "requirement: closure_capsule_root binds the subject";
  assert.equal(classifyOccurrence(historical, "closure_capsule_root").violation, false);
  assert.equal(classifyOccurrence(normative, "closure_capsule_root").violation, true);
  // a name-counting check cannot separate these — both contain exactly one occurrence
  const count = (s) => s.split("closure_capsule_root").length - 1;
  assert.equal(count(historical), count(normative), "a grep sees the same thing in both");
});

test("§10.6 the LIVE spec passes the gate, and passes for the RIGHT reason", () => {
  const text = readFileSync(SPEC, "utf8");
  const r = retiredIdentifierGate(text);
  assert.deepEqual(r.violations, [], JSON.stringify(r.violations, null, 2));
  // it must actually have found occurrences — a gate that finds nothing proves nothing
  assert.ok(r.occurrences.length > 0, "the gate must have inspected real occurrences");
  assert.ok(
    r.occurrences.every((o) => o.klass !== "active_normative"),
    "every occurrence must be classified, not merely counted"
  );
});

test("§10.6 REQUIRED SELF-TEST: inject the retired identifier into an ACTIVE requirement block", () => {
  const text = readFileSync(SPEC, "utf8");
  const clean = retiredIdentifierGate(text);
  assert.deepEqual(clean.violations, [], "precondition: the spec is clean before injection");

  const injected =
    text +
    "\n\n### Injected active requirement (self-test)\n\n```text\n" +
    "requirement:    closure_capsule_root\n" +
    "owner:          section 12\n" +
    "discharger:     the assembled package capsule\n" +
    "```\n";
  const dirty = retiredIdentifierGate(injected);
  assert.ok(dirty.violations.length > 0, "the gate MUST reject a normative reuse");
  assert.equal(dirty.violations[0].identifier, "closure_capsule_root");
  assert.equal(dirty.violations[0].klass, "active_normative");
  // and it must be the injection that fired, not a pre-existing line
  // exactly ONE injected line carries the identifier, so exactly one new violation
  assert.equal(dirty.violations.length, clean.violations.length + 1);
});
