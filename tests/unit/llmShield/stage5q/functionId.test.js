// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 2 — member identity and the collision-safe symbol grammar.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeFunctionId,
  parseFunctionId,
  symbol,
  isPositionallyKeyed,
  FILE_GATE_SYMBOL,
} from "../../../../tools/simurgh-attestation/stage5q/core/functionId.mjs";

test("round-trips", () => {
  const id = makeFunctionId({
    stageId: "5p",
    modulePath: "tools/simurgh-attestation/stage5p/core/identityLattice.mjs",
    symbol: "compareStrength",
  });
  assert.equal(id, "5p:tools/simurgh-attestation/stage5p/core/identityLattice.mjs:compareStrength");
  assert.deepEqual(parseFunctionId(id), {
    stageId: "5p",
    modulePath: "tools/simurgh-attestation/stage5p/core/identityLattice.mjs",
    symbol: "compareStrength",
  });
});

test("a module path containing ':' is REFUSED, not escaped", () => {
  // An ambiguous id is worse than a refused one: the ambiguity only surfaces on collision.
  assert.throws(() => makeFunctionId({ stageId: "5a", modulePath: "a:b.mjs", symbol: "f" }), /':'/);
});

test("the qualified grammar separates units that share a bare name", () => {
  // Two nested `check` helpers, two `verify` methods, two anonymous callbacks — a bare-name scheme
  // merges each pair into one member and silently shrinks the universe.
  const ids = new Set([
    symbol.top("check"),
    symbol.nested("verifyClaim", "check"),
    symbol.nested("buildClaim", "check"),
    symbol.instanceMethod("Bank", "verify"),
    symbol.staticMethod("Bank", "verify"),
    symbol.property("policy", "verify"),
    symbol.anonymous(10, 3),
    symbol.anonymous(20, 3),
    symbol.default(),
    symbol.verifierBranch("S2.C3", "identity_provider_untrusted", 1),
    symbol.fileGate(),
  ]);
  assert.equal(ids.size, 11, "every qualified symbol must be distinct");
});

test("the SAME (check, outcome) pair at two sites yields two DISTINCT ids", () => {
  // Proved necessary by running the census on the live repo: stage5p/section2Verifier.mjs emits
  // reject("S2.C2","resolver_binding_invalid") from three sites with different reasons. Keying by
  // the pair alone merged three attack targets into one.
  const a = symbol.verifierBranch("S2.C2", "resolver_binding_invalid", 1);
  const b = symbol.verifierBranch("S2.C2", "resolver_binding_invalid", 2);
  assert.notEqual(a, b);
  assert.equal(b, "reject@S2.C2/resolver_binding_invalid#2");
});

test("a verifier-branch symbol without an ordinal is REFUSED", () => {
  assert.throws(() => symbol.verifierBranch("S2.C2", "x"), /ordinal/);
  assert.throws(() => symbol.verifierBranch("S2.C2", "x", 0), /ordinal/);
});

test("a verifier-branch symbol survives parsing even though it contains a dot and a slash", () => {
  const id = makeFunctionId({
    stageId: "5p",
    modulePath: "tools/simurgh-attestation/stage5p/core/section2Verifier.mjs",
    symbol: symbol.verifierBranch("S2.C3", "identity_provider_untrusted", 1),
  });
  assert.equal(parseFunctionId(id).symbol, "reject@S2.C3/identity_provider_untrusted#1");
});

test("<file-gate> exists so R8 can admit files with no callable exports (2nd gauntlet B3)", () => {
  // R8 admits 243 stage-5 unit-test files. The grammar excludes test()/it() callbacks and those
  // modules export nothing, so without a file-level symbol the required members could not be
  // emitted with a valid id at all. Admitting a file while excluding every unit inside it is not a
  // position.
  assert.equal(FILE_GATE_SYMBOL, "<file-gate>");
  const id = makeFunctionId({
    stageId: "5p",
    modulePath: "tests/unit/llmShield/stage5p/rawCodeCensus.test.js",
    symbol: symbol.fileGate(),
  });
  assert.equal(parseFunctionId(id).symbol, "<file-gate>");
});

test("positionally-keyed symbols are FLAGGED as weak finding anchors", () => {
  // The honest limitation: inserting a sibling above an anonymous unit mints a new id. A finding
  // against one must also record its enclosing named member.
  assert.equal(isPositionallyKeyed(symbol.anonymous(120, 7)), true);
  assert.equal(isPositionallyKeyed(symbol.top("verifyClaim")), false);
  assert.equal(isPositionallyKeyed(symbol.fileGate()), false);
});

test("missing parts are refused rather than defaulted", () => {
  assert.throws(() => makeFunctionId({ stageId: "5a", modulePath: "x.mjs", symbol: "" }));
  assert.throws(() => makeFunctionId({ stageId: "", modulePath: "x.mjs", symbol: "f" }));
});

test("a malformed id throws rather than returning partial parts", () => {
  assert.throws(() => parseFunctionId("no-separators-here"), /malformed/);
  assert.throws(() => parseFunctionId("5a:only-one"), /malformed/);
});
