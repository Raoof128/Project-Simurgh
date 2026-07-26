// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 12 — structured mutation adapters.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyMutation,
  mutationDigest,
  symbolContains,
  MUTATION_ADAPTERS,
  ADAPTER_IDS,
} from "../../../../tools/simurgh-attestation/stage5q/core/mutationAdapter.mjs";
import { sourceSpanDigest } from "../../../../tools/simurgh-attestation/stage5q/core/sourceDigest.mjs";

const SRC = `export function leafHash(value) {
  if (!value) throw new Error("no value");
  const tagged = sha(DOMAIN, NUL, value);
  return tagged === expected ? tagged : null;
}
export function other() {
  return 1;
}
`;

const spec = (over = {}) => ({
  mutant_id: "M3",
  adapter: "replaceCallWithConstant",
  target_file: "tools/simurgh-attestation/stage5k/core/merkle.mjs",
  target_symbol: "leafHash",
  // `to` is a CONSTANT, not another call. The kind check caught this fixture when it first read
  // `sha(value)` — which is a removeArgument mutation wearing a replaceCallWithConstant label.
  args: { from: "sha(DOMAIN, NUL, value)", to: "CONSTANT_LEAF", callee: "sha" },
  ...over,
});

const apply = (over = {}, source = SRC) =>
  applyMutation({ source, sourceBytes: Buffer.from(source, "utf8"), spec: spec(over) });

test("the adapter set is CLOSED at five, and an unknown adapter is refused", () => {
  assert.equal(ADAPTER_IDS.length, 5);
  assert.deepEqual(Object.keys(MUTATION_ADAPTERS).sort(), [...ADAPTER_IDS].sort());
  assert.throws(
    () => apply({ adapter: "patchWithSed" }),
    /adapter set is CLOSED|shell patch wearing a schema/
  );
});

// ---------------------------------------------------------------------------------------------
// The precondition digest
// ---------------------------------------------------------------------------------------------

test("a precondition digest MISMATCH refuses the mutation", () => {
  // A mutant that silently applies to drifted source proves nothing about the code committed at L2.
  assert.throws(
    () => apply({ precondition_source_digest: "f".repeat(64) }),
    /precondition_source_digest mismatch|drifted source/
  );
});

test("a MATCHING precondition digest lets it through, and both digests are reported", () => {
  const digest = sourceSpanDigest(Buffer.from(SRC, "utf8"));
  const r = apply({ precondition_source_digest: digest });
  assert.equal(r.baseline_source_digest, digest);
  assert.notEqual(r.mutated_source_digest, digest, "the mutation changed the bytes");
  assert.match(r.mutation_digest, /^[0-9a-f]{64}$/);
});

// ---------------------------------------------------------------------------------------------
// Exactly-once anchoring and no-op refusal
// ---------------------------------------------------------------------------------------------

test("an anchor occurring TWICE is refused, never applied to the first match", () => {
  // "Some site was mutated" is not a claim anyone can check, and the receipt would name a target it
  // did not touch.
  const twice = `export function leafHash(value) {
  const a = sha(DOMAIN, NUL, value);
  const b = sha(DOMAIN, NUL, value);
  return a === b;
}
`;
  assert.throws(() => apply({}, twice), /occurs 2 times|Refusing/);
});

test("an anchor that is not present is refused", () => {
  assert.throws(
    () => apply({ args: { from: "not_here(x)", to: "1", callee: "not_here" } }),
    /anchor not found/
  );
});

test("a NO-OP mutation is REFUSED — the stage's signature disease in miniature", () => {
  // Otherwise `mutation_applied: true` is recorded while nothing changed, and the detector's green
  // reads as "the mutant was reverted correctly" instead of "there was never a mutant".
  assert.throws(
    () =>
      apply({
        adapter: "weakenComparison",
        args: { from: "tagged === expected", to: "tagged === expected" },
      }),
    /did not reorder|byte-identical|no-op/i
  );
});

// ---------------------------------------------------------------------------------------------
// The anchor must fall inside the NAMED symbol
// ---------------------------------------------------------------------------------------------

test("an anchor outside the named symbol is refused — a receipt cannot name what it did not touch", () => {
  assert.throws(
    () =>
      apply({
        target_symbol: "other",
        args: { from: "sha(DOMAIN, NUL, value)", to: "CONSTANT_LEAF", callee: "sha" },
      }),
    /does not fall inside other|false receipt/
  );
});

test("symbolContains finds an anchor in the right function and not in its neighbour", () => {
  assert.equal(symbolContains(SRC, "leafHash", "sha(DOMAIN, NUL, value)"), true);
  assert.equal(symbolContains(SRC, "other", "sha(DOMAIN, NUL, value)"), false);
  assert.equal(symbolContains(SRC, "leafHash", "return 1;"), false);
  assert.equal(symbolContains(SRC, "nonexistent", "anything"), false);
});

// ---------------------------------------------------------------------------------------------
// KIND VALIDATION — what keeps five adapters five adapters
// ---------------------------------------------------------------------------------------------

test("replaceCallWithConstant refuses when the call SURVIVES the replacement", () => {
  assert.throws(
    () =>
      apply({ args: { from: "sha(DOMAIN, NUL, value)", to: "sha(DOMAIN, value)", callee: "sha" } }),
    /still calls sha|nothing was replaced/
  );
});

test("weakenComparison refuses to DELETE the comparison instead of weakening it", () => {
  assert.throws(
    () =>
      apply({
        adapter: "weakenComparison",
        args: { from: "tagged === expected", to: "true" },
      }),
    /must leave a comparison behind, not delete it/
  );
});

test("weakenComparison accepts a genuine loosening", () => {
  const r = apply({
    adapter: "weakenComparison",
    args: { from: "tagged === expected", to: "tagged == expected" },
  });
  assert.ok(r.mutated.includes("tagged == expected"));
});

test("deleteGuardClause refuses to replace a guard with NEW LOGIC", () => {
  // Otherwise `deleteGuardClause` is just "arbitrary edit", and the M-to-R bijection stops meaning
  // anything.
  assert.throws(
    () =>
      apply({
        adapter: "deleteGuardClause",
        args: { from: `if (!value) throw new Error("no value");`, to: "value = fallback();" },
      }),
    /never with new logic/
  );
});

test("deleteGuardClause accepts deletion and accepts a comment", () => {
  const guard = `if (!value) throw new Error("no value");`;
  assert.ok(
    !apply({ adapter: "deleteGuardClause", args: { from: guard, to: "" } }).mutated.includes(guard)
  );
  assert.ok(
    apply({
      adapter: "deleteGuardClause",
      args: { from: guard, to: "// guard removed" },
    }).mutated.includes("// guard removed")
  );
});

test("deleteGuardClause refuses an anchor that contains no guard at all", () => {
  assert.throws(
    () =>
      apply({
        adapter: "deleteGuardClause",
        args: { from: "const tagged = sha(DOMAIN, NUL, value);", to: "" },
      }),
    /requires a guard/
  );
});

test("removeArgument must DROP an argument, not keep or add one", () => {
  assert.throws(
    () =>
      apply({
        adapter: "removeArgument",
        args: { from: "sha(DOMAIN, NUL, value)", to: "sha(DOMAIN, NUL, value, extra)" },
      }),
    /must drop an argument/
  );
  const r = apply({
    adapter: "removeArgument",
    args: { from: "sha(DOMAIN, NUL, value)", to: "sha(value)" },
  });
  assert.ok(r.mutated.includes("sha(value)"));
});

test("swapAdjacentChecks must be a PERMUTATION — a rewrite is a different adapter", () => {
  const two = `export function verify(x) {
  checkA(x);
  checkB(x);
}
`;
  assert.throws(
    () =>
      applyMutation({
        source: two,
        sourceBytes: Buffer.from(two, "utf8"),
        spec: spec({
          adapter: "swapAdjacentChecks",
          target_symbol: "verify",
          args: { from: "  checkA(x);\n  checkB(x);", to: "  checkB(x);\n  checkC(x);" },
        }),
      }),
    /must be a PERMUTATION/
  );

  const r = applyMutation({
    source: two,
    sourceBytes: Buffer.from(two, "utf8"),
    spec: spec({
      adapter: "swapAdjacentChecks",
      target_symbol: "verify",
      args: { from: "  checkA(x);\n  checkB(x);", to: "  checkB(x);\n  checkA(x);" },
    }),
  });
  assert.ok(r.mutated.indexOf("checkB") < r.mutated.indexOf("checkA"));
});

// ---------------------------------------------------------------------------------------------
// The mutation digest describes the DESCRIPTION, not the mutated source
// ---------------------------------------------------------------------------------------------

test("mutationDigest is a pure function of the structured description", () => {
  assert.equal(mutationDigest(spec()), mutationDigest(spec()));
  assert.notEqual(mutationDigest(spec()), mutationDigest(spec({ target_symbol: "other" })));
  assert.notEqual(
    mutationDigest(spec()),
    mutationDigest(spec({ args: { from: "a", to: "b", callee: "sha" } }))
  );
});

test("args.from and args.to are required strings", () => {
  assert.throws(() => apply({ args: { callee: "sha" } }), /args.from and args.to are required/);
});
