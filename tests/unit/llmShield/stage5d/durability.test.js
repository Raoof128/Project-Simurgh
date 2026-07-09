// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5D VARL — durability classifier (plan Task 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDurability,
  CLOSURE_RULE_KINDS,
  DURABLE_PREDICATES,
} from "../../../../tools/simurgh-attestation/stage5d/core/durability.mjs";

test("rung1 closure is brittle (homoglyph table + per-cent rewrite)", () => {
  assert.equal(classifyDurability({ rule_kinds: CLOSURE_RULE_KINDS["v1->v3"] }), "brittle");
});

test("rung2 closure is durable (pure property strip)", () => {
  assert.equal(classifyDurability({ rule_kinds: CLOSURE_RULE_KINDS["v3->v4"] }), "durable");
});

test("a single enumeration rule taints an otherwise-durable set", () => {
  assert.equal(
    classifyDurability({ rule_kinds: ["combining_marks", "default_ignorable", "homoglyph_table"] }),
    "brittle"
  );
});

test("empty / missing rule_kinds → brittle (fail closed)", () => {
  assert.equal(classifyDurability({}), "brittle");
  assert.equal(classifyDurability({ rule_kinds: [] }), "brittle");
});

test("a pure-property hardening is durable", () => {
  assert.equal(classifyDurability({ rule_kinds: DURABLE_PREDICATES.slice() }), "durable");
});
