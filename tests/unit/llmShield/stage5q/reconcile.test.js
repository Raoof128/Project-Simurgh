// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 5 — reconciliation over the PROJECTION, and the reachability graph.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reconcile,
  buildReachability,
  isKnownShape,
} from "../../../../tools/simurgh-attestation/stage5q/core/reconcile.mjs";

const sm = (id, opts = {}) => ({
  function_id: id,
  category: opts.category ?? "exported_function",
  runtime_visible: opts.runtime_visible ?? true,
});
const rm = (id, kind = "function") => ({ function_id: id, kind });

test("a static-only INTERNAL is NOT a conflict — this is the projection rule", () => {
  // Under the naive rule this test fails and every internal in the repo is flagged forever.
  const r = reconcile({
    staticMembers: [
      sm("a:b:f"),
      sm("a:b:helper", { runtime_visible: false, category: "internal_function" }),
    ],
    runtimeMembers: [rm("a:b:f")],
  });
  assert.equal(r.ok, true, JSON.stringify(r.conflicts));
  assert.equal(r.static_only_internals, 1, "it is COUNTED, just not flagged");
});

test("a runtime-visible export absent from the static projection IS a conflict", () => {
  const r = reconcile({ staticMembers: [], runtimeMembers: [rm("a:b:ghost")] });
  assert.equal(r.ok, false);
  assert.equal(r.conflicts[0].shape, "runtime_visible_absent_from_static_projection");
});

test("a statically exported symbol absent at runtime IS a conflict", () => {
  const r = reconcile({ staticMembers: [sm("a:b:dead")], runtimeMembers: [] });
  assert.equal(r.conflicts[0].shape, "static_export_absent_at_runtime");
});

test("a dynamic export not represented statically gets its own shape", () => {
  const r = reconcile({
    staticMembers: [],
    runtimeMembers: [rm("a:b:dyn")],
    dynamicallyDeclared: new Set(["a:b:dyn"]),
  });
  assert.equal(r.conflicts[0].shape, "dynamic_export_not_represented_statically");
});

test("a category disagreement on a symbol present in both IS a conflict", () => {
  const r = reconcile({
    staticMembers: [sm("a:b:x", { category: "exported_constant" })],
    runtimeMembers: [rm("a:b:x", "function")],
  });
  assert.equal(r.conflicts[0].shape, "category_or_identity_disagreement");
});

test("only the four frozen shapes exist", () => {
  assert.equal(isKnownShape("runtime_visible_absent_from_static_projection"), true);
  assert.equal(isKnownShape("a_fifth_shape"), false);
});

test("reachability: callers, transitive callers, and unresolved edges are CARRIED", () => {
  const members = ["a", "b", "c"].map((id) => ({ function_id: id }));
  const edges = [
    { from_function_id: "a", to_function_id: "b" },
    { from_function_id: "b", to_function_id: "c" },
    { from_function_id: "a", to_unresolved: "<computed-member-call>" },
  ];
  const g = buildReachability({ members, edges });
  assert.deepEqual([...g.callersOf("b")], ["a"]);
  assert.equal(g.isReachable("a", "c"), true, "transitive reachability");
  assert.equal(g.isReachable("c", "a"), false);
  // The one that matters for delegation: an unresolved caller is still a caller.
  assert.equal(g.hasUnresolved("a"), true);
  assert.deepEqual(g.unresolvedFrom("a"), ["<computed-member-call>"]);
  assert.equal(g.hasUnresolved("b"), false);
});

test("a cycle in the graph does not hang the closure walk", () => {
  const g = buildReachability({
    members: [{ function_id: "a" }, { function_id: "b" }],
    edges: [
      { from_function_id: "a", to_function_id: "b" },
      { from_function_id: "b", to_function_id: "a" },
    ],
  });
  assert.equal(g.isReachable("a", "b"), true);
  assert.equal(g.isReachable("b", "a"), true);
});
