// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 2 — the static census, over the FIXTURE TREE rather than the live repo.
//
// Fixtures, not the repo: a census test that reads the live tree changes its own expectations every
// time a stage adds a function, so it either breaks constantly or gets loosened until it asserts
// nothing. The live run is a separate diagnostic.
//
// The R8 census assertions live here rather than in Task 1.5, because a task may not test a module
// a later task creates (second gauntlet B2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  staticCensus,
  parseJs,
  rootFor,
  stageFor,
  PARSER,
} from "../../../../tools/simurgh-attestation/stage5q/core/censusStatic.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FIXTURE = join(ROOT, "tools/simurgh-attestation/stage5q/fixtures/r8-tree");
const load = (rel) => ({ path: rel, bytes: readFileSync(join(FIXTURE, rel)) });

const R1 = "tools/simurgh-attestation/stage5a/core/claimCore.mjs";
const R8_GATE = "tests/unit/llmShield/stage5a/claimCore.test.js";
const R8_BUILDER = "tests/unit/llmShield/stage5a/fixtureBuilder.test.js";
const R2_E2E = "tests/e2e/llmShield/stage5a/k7AllFunctions.test.js";
const NOT_R8 = "tests/unit/llmShield/stage4h/exitWrapper.test.js";

test("the parser is pinned — the version is part of the contract", () => {
  assert.equal(PARSER.name, "acorn");
  assert.equal(PARSER.version, "8.17.0");
});

test("root attribution: R1 / R2 / R8 / outside", () => {
  assert.equal(rootFor(R1), "R1");
  assert.equal(rootFor(R2_E2E), "R2");
  assert.equal(rootFor(R8_GATE), "R8");
  assert.equal(rootFor(NOT_R8), null, "stage4 unit tests are outside R8 by A1.3");
  assert.equal(stageFor(R1), "5a");
});

test("exported functions, arrow exports, internals and constants are all distinguished", () => {
  const { members } = parseJs(load(R1));
  const by = (s) => members.find((m) => m.export_name_or_internal_symbol === s);

  assert.equal(by("verifyClaim").category, "exported_function");
  assert.equal(by("verifyClaim").exported, true);
  assert.equal(by("buildClaim").category, "exported_function", "arrow-const exports count");
  assert.equal(by("check").category, "internal_function");
  assert.equal(by("check").exported, false);
  assert.equal(by("check").runtime_visible, false, "an internal is not runtime-visible");
  assert.equal(by("CLAIM_KINDS").category, "exported_constant", "frozen tables carry weight");
});

test("every member carries extraction_method — a real parse is distinguishable from a scan", () => {
  const { members } = parseJs(load(R1));
  assert.ok(members.length > 0);
  for (const m of members) assert.equal(m.extraction_method, "acorn");
});

test("R8: a gate FILE becomes a member via <file-gate> (second gauntlet B3)", () => {
  // Without this the annex that admitted 243 files would admit them into nothing: the grammar
  // excludes test() callbacks and these modules export nothing.
  const { members } = parseJs(load(R8_GATE));
  const gate = members.find((m) => m.export_name_or_internal_symbol === "<file-gate>");
  assert.ok(gate, "a unit-test file must yield a member");
  assert.equal(gate.category, "gate_definition");
  assert.equal(gate.root, "R8");
});

test("R8: a file that BUILDS fixtures is evidence_emission, not gate_definition", () => {
  const { members } = parseJs(load(R8_BUILDER));
  const gate = members.find((m) => m.export_name_or_internal_symbol === "<file-gate>");
  assert.equal(gate.category, "evidence_emission", "an emitter is not a gate");
});

test("test() and it() callbacks are NOT members", () => {
  // They are invocations of a gate, not units of it. Admitting them would inflate the universe with
  // members no attack pack could meaningfully target.
  const { members } = parseJs(load(R8_GATE));
  const anon = members.filter((m) => /^<anon@/.test(m.export_name_or_internal_symbol));
  assert.equal(anon.length, 0, "test callbacks must not become members");
});

test("import edges are emitted, and a dynamic call becomes an UNRESOLVED edge", () => {
  const src = Buffer.from(
    [
      'import { a } from "./a.mjs";',
      "export function f(o, k) { return o[k](); }",
      "export async function g(n) { return import(n); }",
      "",
    ].join("\n"),
    "utf8"
  );
  const { edges } = parseJs({ path: R1, bytes: src });

  assert.ok(edges.some((e) => e.kind === "import_edge" && e.to_unresolved === "./a.mjs"));
  // The two that matter: a computed member call and a dynamic import must PRODUCE an edge marked
  // heuristic, never vanish. A silently dropped edge is a silently missing caller.
  assert.ok(
    edges.some((e) => e.to_unresolved === "<computed-member-call>" && e.confidence === "heuristic"),
    "obj[expr]() must leave a trace"
  );
  assert.ok(
    edges.some((e) => e.to_unresolved === "<dynamic-import>" && e.confidence === "heuristic"),
    "await import(variable) must leave a trace"
  );
});

test("verifier branches become members, one per reject() emission site", () => {
  const src = Buffer.from(
    [
      "export function verify(x) {",
      '  if (!x.a) return reject("S2.C1", "identity_unresolved");',
      '  if (!x.b) return reject("S2.C3", "identity_provider_untrusted");',
      "  return { ok: true };",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
  const { members } = parseJs({ path: R1, bytes: src });
  const branches = members.filter((m) => m.category === "verifier_branch");
  assert.equal(
    branches.length,
    2,
    "one member per distinct reject() site — R6 needs these targets"
  );
  assert.ok(
    branches.some(
      (b) => b.export_name_or_internal_symbol === "reject@S2.C3/identity_provider_untrusted#1"
    )
  );
});

test("a nested function is a member, and its call edge to the outer function is exact", () => {
  const { members, edges } = parseJs(load(R1));
  const nested = members.find((m) => m.export_name_or_internal_symbol.includes(">"));
  // claimCore's `check` is top-level, so this fixture has no nested member; assert the mechanism on
  // a constructed source instead.
  const src = Buffer.from(
    "export function outer() { function inner() {} return inner; }\n",
    "utf8"
  );
  const r = parseJs({ path: R1, bytes: src });
  assert.ok(r.members.some((m) => m.export_name_or_internal_symbol === "outer>inner"));
  assert.ok(r.edges.some((e) => e.kind === "call_edge" && e.confidence === "exact"));
  assert.equal(nested, undefined);
});

test("a PARSE FAILURE is data, not a crash — an unparseable module blocks Task 8", () => {
  const broken = Buffer.from("export function ( { \n", "utf8");
  const r = parseJs({ path: R1, bytes: broken });
  assert.deepEqual(r.members, []);
  assert.ok(r.parseError, "the failure must be reported, not swallowed");
  assert.match(r.parseError.message, /.+/);
});

test("DUPLICATE function ids are a hard failure, never last-write-wins", () => {
  // Canonical sorting downstream would collapse two records into one and shrink the universe
  // invisibly. The census reports duplicates so Task 8 can refuse.
  const src = Buffer.from("export function f() {}\n", "utf8");
  const c = staticCensus({
    files: [
      { path: R1, bytes: src },
      { path: R1, bytes: src },
    ],
  });
  assert.ok(c.duplicates.length > 0, "the same path twice must surface as duplicates");
});

test("the census over the whole fixture tree yields every root", () => {
  const files = [R1, R8_GATE, R8_BUILDER, R2_E2E].map(load);
  const c = staticCensus({ files });
  const roots = new Set(c.members.map((m) => m.root));
  assert.ok(roots.has("R1"));
  assert.ok(roots.has("R8"));
  assert.ok(roots.has("R2"));
  assert.equal(c.parseErrors.length, 0);
  assert.equal(c.duplicates.length, 0);
  assert.equal(c.byId.size, c.members.length);
});
