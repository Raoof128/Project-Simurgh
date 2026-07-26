// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 6 — the call graph, and the vacuity that hid inside it.
//
// THE DEFECT THIS FILE EXISTS FOR (precommit_blocker, found by execution during Task 6).
//
// The first census emitted call edges only between a function and a function declared inside its
// OWN body — a shape that occurs almost nowhere in this codebase. Measured against the live
// repository: 2983 edges, of which **zero** were resolved. `buildReachability` drops unresolved
// edges from the forward graph, so the forward graph was empty, so the §2.4 adversarial role check
// could not fire on real data. It reported `violations: 0` over a graph with nothing in it.
//
// Spec §2.4 calls the mis-labelled `pure_transform` "the single highest-value attack against 5Q
// itself". Its only mechanical mitigation was silently inoperative — and it was inoperative in the
// way that reads as success. Three rounds of design review did not find it; running it did.
//
// Every test below is a red that had to exist before the green meant anything.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseJs,
  staticCensus,
  resolveSpecifier,
} from "../../../../tools/simurgh-attestation/stage5q/core/censusStatic.mjs";
import { buildReachability } from "../../../../tools/simurgh-attestation/stage5q/core/reconcile.mjs";

const file = (path, src) => ({ path, bytes: Buffer.from(src, "utf8") });
const A = "tools/simurgh-attestation/stage5a/core/a.mjs";
const B = "tools/simurgh-attestation/stage5a/core/b.mjs";

// ---------------------------------------------------------------------------------------------
// The regression that names the defect
// ---------------------------------------------------------------------------------------------

test("REGRESSION: a census of real-shaped modules has a NON-EMPTY resolved edge set", () => {
  // The single assertion that would have caught the original defect. `resolved_edges: 0` is what a
  // vacuous reachability check looks like from the outside.
  const census = staticCensus({
    files: [
      file(
        A,
        `import { helper } from "./b.mjs";\nexport function verify(x) { return helper(x); }\n`
      ),
      file(B, `export function helper(x) { return x; }\n`),
    ],
  });
  assert.ok(
    census.graph.resolved_edges > 0,
    "a graph with zero resolved edges makes every reachability check vacuously pass"
  );
});

test("a call to a top-level function in the SAME module is a resolved edge", () => {
  const { edges } = parseJs(
    file(A, `function low(x) { return x; }\nexport function high(x) { return low(x); }\n`)
  );
  const e = edges.find((x) => x.kind === "call_edge" && x.to_function_id);
  assert.ok(e, "an intra-module call must produce a resolved edge");
  assert.equal(e.from_function_id, "5a:tools/simurgh-attestation/stage5a/core/a.mjs:high");
  assert.equal(e.to_function_id, "5a:tools/simurgh-attestation/stage5a/core/a.mjs:low");
  assert.equal(e.confidence, "exact");
});

test("a call through a NAMED IMPORT resolves across modules at link time", () => {
  const census = staticCensus({
    files: [
      file(
        A,
        `import { helper } from "./b.mjs";\nexport function verify(x) { return helper(x); }\n`
      ),
      file(B, `export function helper(x) { return x; }\n`),
    ],
  });
  const e = census.edges.find(
    (x) => x.kind === "call_edge" && x.to_function_id?.endsWith("b.mjs:helper")
  );
  assert.ok(e, "a cross-module call must be linked once every file has been parsed");
  assert.equal(e.from_function_id, "5a:tools/simurgh-attestation/stage5a/core/a.mjs:verify");
  assert.equal(census.graph.linked_cross_module, 1);
});

test("a call through a NAMESPACE IMPORT resolves too", () => {
  const census = staticCensus({
    files: [
      file(
        A,
        `import * as ns from "./b.mjs";\nexport function verify(x) { return ns.helper(x); }\n`
      ),
      file(B, `export function helper(x) { return x; }\n`),
    ],
  });
  assert.ok(
    census.edges.some((x) => x.to_function_id?.endsWith("b.mjs:helper")),
    "`ns.helper()` is a call to b.mjs:helper and must not disappear behind the namespace"
  );
});

test("a call to a target OUTSIDE the closure becomes an EXPLICIT unresolved edge, never a dropped one", () => {
  // A silently dropped edge is a silently missing caller, and a missing caller is how
  // `delegated_to_attacked_caller` becomes a lie.
  const census = staticCensus({
    files: [
      file(A, `import { gone } from "./nowhere.mjs";\nexport function v() { return gone(); }\n`),
    ],
  });
  const e = census.edges.find((x) => x.kind === "call_edge" && x.to_unresolved);
  assert.ok(e, "the call survives as an unresolved edge");
  assert.match(e.to_unresolved, /^<outside-closure>/);
  assert.ok(e.to_unresolved.includes("gone"), "the unresolved edge names the symbol it wanted");
});

test("a bare-specifier call is unresolved and SAYS SO — it is not confused with a first-party miss", () => {
  const census = staticCensus({
    files: [file(A, `import { parse } from "acorn";\nexport function v(s) { return parse(s); }\n`)],
  });
  const e = census.edges.find((x) => x.kind === "call_edge" && x.to_unresolved);
  assert.ok(e);
  assert.match(e.to_unresolved, /^<bare-specifier>/);
});

test("calls to built-ins, parameters and locals are COUNTED, not silently discarded", () => {
  const census = staticCensus({
    files: [file(A, `export function v(cb) { const s = String(1); cb(s); return s; }\n`)],
  });
  assert.ok(
    census.graph.unattributed_calls >= 2,
    "String() and cb() are not edges, but the census must show it knows they happened"
  );
});

test("repeated identical calls collapse to ONE edge — the graph is a relation, not a tally", () => {
  const { edges } = parseJs(
    file(A, `function low(){}\nexport function high(){ low(); low(); low(); }\n`)
  );
  const calls = edges.filter((x) => x.kind === "call_edge" && x.to_function_id?.endsWith(":low"));
  assert.equal(calls.length, 1);
});

test("self-recursion does not emit a self-edge", () => {
  const { edges } = parseJs(file(A, `export function f(n){ return n ? f(n - 1) : 0; }\n`));
  assert.equal(
    edges.filter((x) => x.from_function_id === x.to_function_id).length,
    0,
    "a self-edge adds nothing to reachability and pollutes every path it appears on"
  );
});

// ---------------------------------------------------------------------------------------------
// resolveSpecifier — a guessed path is a fabricated edge
// ---------------------------------------------------------------------------------------------

test("resolveSpecifier walks . and .. against the importing module's directory", () => {
  assert.equal(resolveSpecifier("a/b/c.mjs", "./d.mjs"), "a/b/d.mjs");
  assert.equal(resolveSpecifier("a/b/c.mjs", "../e.mjs"), "a/e.mjs");
  assert.equal(resolveSpecifier("a/b/c/d.mjs", "../../f.mjs"), "a/f.mjs");
});

test("resolveSpecifier REFUSES bare, builtin and extensionless specifiers", () => {
  // Guessing that `./thing` means `./thing.mjs` (or `./thing/index.mjs`) would fabricate an edge,
  // and a fabricated edge is worse than a missing one: it makes a delegation claim look discharged.
  assert.equal(resolveSpecifier("a/b.mjs", "acorn"), null);
  assert.equal(resolveSpecifier("a/b.mjs", "node:fs"), null);
  assert.equal(resolveSpecifier("a/b.mjs", "./thing"), null);
  assert.equal(resolveSpecifier("a/b.mjs", "./dir/"), null);
});

// ---------------------------------------------------------------------------------------------
// The graph, once real, actually reaches
// ---------------------------------------------------------------------------------------------

test("reachability now spans modules — the property the empty graph could not have", () => {
  const census = staticCensus({
    files: [
      file(A, `import { mid } from "./b.mjs";\nexport function verifyRoot(x){ return mid(x); }\n`),
      file(B, `import { pad } from "./c.mjs";\nexport function mid(x){ return pad(x); }\n`),
      file("tools/simurgh-attestation/stage5a/core/c.mjs", `export function pad(x){ return x; }\n`),
    ],
  });
  const r = buildReachability({ members: census.members, edges: census.edges });
  const root = "5a:tools/simurgh-attestation/stage5a/core/a.mjs:verifyRoot";
  const leaf = "5a:tools/simurgh-attestation/stage5a/core/c.mjs:pad";
  assert.ok(r.isReachable(root, leaf), "two hops across three modules must be reachable");
  assert.deepEqual(r.pathFrom(root, leaf), [
    root,
    "5a:tools/simurgh-attestation/stage5a/core/b.mjs:mid",
    leaf,
  ]);
});

test("pathFrom returns null when there is no path, and never a partial one", () => {
  const members = [{ function_id: "x" }, { function_id: "y" }];
  const r = buildReachability({ members, edges: [] });
  assert.equal(r.pathFrom("x", "y"), null);
  assert.deepEqual(r.pathFrom("x", "x"), ["x"]);
});

test("pathFrom returns the SHORTEST path, so the violation a reviewer reads is the simplest one", () => {
  const members = ["a", "b", "c", "d"].map((function_id) => ({ function_id }));
  const edges = [
    { from_function_id: "a", to_function_id: "b" },
    { from_function_id: "b", to_function_id: "c" },
    { from_function_id: "c", to_function_id: "d" },
    { from_function_id: "a", to_function_id: "d" },
  ];
  const r = buildReachability({ members, edges });
  assert.deepEqual(r.pathFrom("a", "d"), ["a", "d"]);
});
