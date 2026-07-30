// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 8 — the two disjoint taxonomies.
//
// §3.4 makes accidental counting STRUCTURALLY impossible rather than procedurally discouraged. The
// two enumerations share no member, so there is no value an external anchor can carry that a quorum
// tally would recognise as a witness-operator class. A reviewer does not have to trust that nobody
// summed them; they can check that the sum is unrepresentable.
//
// Both enumerations are pinned as SETS against the spec (Q1-F002) — a count agrees with itself while
// two members swap places.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXTERNAL_ANCHOR_CLASS,
  HONEST_DEFAULT_OPERATOR_CLASS,
  WITNESS_OPERATOR_CLASS,
  classOf,
} from "../../../../tools/simurgh-attestation/stage5s/core/classes.mjs";

const SPEC = "docs/superpowers/specs/2026-07-28-stage-5s-vwq-verifiable-witness-quorum-design.md";

/** Parse the two-column §3.4 block. The spec is authority; this file is a transcription of it. */
function taxonomiesFromSpec() {
  const spec = readFileSync(SPEC, "utf8");
  const section = spec.slice(spec.indexOf("### 3.4 Two taxonomies"), spec.indexOf("### 3.5 "));
  const open = section.indexOf("```text") + "```text".length;
  const fence = section.slice(open, section.indexOf("```", open));
  const rows = fence
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s{2,}/));
  const [header, ...members] = rows;
  return {
    header,
    witness: members.map((r) => r[0]),
    anchor: members.map((r) => r[1]),
  };
}

test("[5s-t8] both taxonomies are the exact SETS §3.4 freezes, compared both ways", () => {
  const spec = taxonomiesFromSpec();
  assert.deepEqual(spec.header, ["witness_operator_class", "external_anchor_class"]);

  for (const [name, actual, expected] of [
    ["witness_operator_class", WITNESS_OPERATOR_CLASS, spec.witness],
    ["external_anchor_class", EXTERNAL_ANCHOR_CLASS, spec.anchor],
  ]) {
    const have = new Set(actual);
    const want = new Set(expected);
    assert.deepEqual(
      [...have].filter((v) => !want.has(v)),
      [],
      `${name}: members present but not in the spec`
    );
    assert.deepEqual(
      [...want].filter((v) => !have.has(v)),
      [],
      `${name}: members in the spec but not present`
    );
  }
});

test("[5s-t8] the intersection is empty — the two can never be summed by accident", () => {
  const anchors = new Set(EXTERNAL_ANCHOR_CLASS);
  const shared = WITNESS_OPERATOR_CLASS.filter((v) => anchors.has(v));
  assert.deepEqual(shared, [], `taxonomies overlap on: ${shared}`);
});

test("[5s-t8] classOf assigns every member to exactly one taxonomy, and strangers to neither", () => {
  for (const v of WITNESS_OPERATOR_CLASS) assert.equal(classOf(v), "witness_operator");
  for (const v of EXTERNAL_ANCHOR_CLASS) assert.equal(classOf(v), "external_anchor");
  for (const v of ["", "witness", "rfc_3161", null, undefined, 3, {}]) {
    assert.equal(classOf(v), null, `classOf guessed a taxonomy for ${JSON.stringify(v)}`);
  }
});

test("[5s-t8] `unresolved` is the honest default, and it is a witness-operator class", () => {
  // §3.4: it establishes nothing, and it is 5P's actual recorded outcome. A default of
  // `distinct_operator_self_asserted` would assert independence the project has never demonstrated.
  assert.equal(HONEST_DEFAULT_OPERATOR_CLASS, "unresolved");
  assert.ok(WITNESS_OPERATOR_CLASS.includes(HONEST_DEFAULT_OPERATOR_CLASS));
});

test("[5s-t8] both enumerations are frozen", () => {
  assert.ok(Object.isFrozen(WITNESS_OPERATOR_CLASS));
  assert.ok(Object.isFrozen(EXTERNAL_ANCHOR_CLASS));
});
