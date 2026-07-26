// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — census reconciliation and the reachability graph (spec §2.6, §2.7).
//
// THE PROJECTION RULE IS THE WHOLE POINT. A runtime import cannot enumerate module-private
// internals, so a blanket "present in one, absent from the other is a conflict" rule would flag
// every internal function in the repository, forever. The comparison is:
//
//     project(static_census, runtime_visible) == runtime_census
//
// Without it the first real census run has two outcomes and both are bad: it fails permanently, or
// it accumulates exceptions until exceptions are wallpaper and the gate means nothing. A
// completeness mechanism that must be routinely overridden has already failed — it just has not
// been told yet.

import { CENSUS_CONFLICT_SHAPES } from "./constants.mjs";

const SHAPE = Object.freeze({
  runtimeOnly: "runtime_visible_absent_from_static_projection",
  staticOnly: "static_export_absent_at_runtime",
  dynamic: "dynamic_export_not_represented_statically",
  disagreement: "category_or_identity_disagreement",
});

/**
 * @param {{staticMembers: object[], runtimeMembers: object[], dynamicallyDeclared?: Set<string>}} input
 */
export function reconcile({ staticMembers, runtimeMembers, dynamicallyDeclared = new Set() }) {
  // The projection: only members the static census says are runtime-visible participate.
  const projection = new Map();
  for (const m of staticMembers) {
    if (m.runtime_visible) projection.set(m.function_id, m);
  }
  const runtime = new Map(runtimeMembers.map((m) => [m.function_id, m]));

  const conflicts = [];

  for (const [id, rm] of runtime) {
    if (!projection.has(id)) {
      conflicts.push({
        shape: dynamicallyDeclared.has(id) ? SHAPE.dynamic : SHAPE.runtimeOnly,
        function_id: id,
        detail: `visible at runtime as ${rm.kind}, absent from the static projection`,
      });
    }
  }

  for (const [id, sm] of projection) {
    if (!runtime.has(id)) {
      conflicts.push({
        shape: SHAPE.staticOnly,
        function_id: id,
        detail: `statically exported (${sm.category}) but not present at runtime`,
      });
    }
  }

  for (const [id, sm] of projection) {
    const rm = runtime.get(id);
    if (!rm) continue;
    const staticIsFn = sm.category === "exported_function";
    const runtimeIsFn = rm.kind === "function";
    if (staticIsFn !== runtimeIsFn) {
      conflicts.push({
        shape: SHAPE.disagreement,
        function_id: id,
        detail: `static says ${sm.category}, runtime says ${rm.kind}`,
      });
    }
  }

  // Static-only INTERNALS are counted, never flagged. They remain fully inventoried and still
  // receive a coverage status via static reachability — they are simply outside the domain where
  // the projection comparison is meaningful.
  const staticOnlyInternals = staticMembers.filter((m) => !m.runtime_visible).length;

  return {
    ok: conflicts.length === 0,
    conflicts,
    projected: projection.size,
    runtime: runtime.size,
    static_only_internals: staticOnlyInternals,
  };
}

/** Only the four frozen shapes are producible; a fifth is a programming error, not a conflict. */
export function isKnownShape(shape) {
  return CENSUS_CONFLICT_SHAPES.includes(shape);
}

/**
 * Reachability over the typed edge graph.
 *
 * `to_unresolved` edges are carried, not dropped: a caller we could not resolve is still a caller,
 * and pretending otherwise is how `delegated_to_attacked_caller` becomes a lie.
 */
export function buildReachability({ members, edges }) {
  const forward = new Map();
  const backward = new Map();
  const unresolvedFrom = new Map();

  for (const m of members) {
    forward.set(m.function_id, new Set());
    backward.set(m.function_id, new Set());
  }
  for (const e of edges) {
    if (e.to_unresolved) {
      if (!unresolvedFrom.has(e.from_function_id)) unresolvedFrom.set(e.from_function_id, []);
      unresolvedFrom.get(e.from_function_id).push(e.to_unresolved);
      continue;
    }
    if (!forward.has(e.from_function_id)) forward.set(e.from_function_id, new Set());
    if (!backward.has(e.to_function_id)) backward.set(e.to_function_id, new Set());
    forward.get(e.from_function_id).add(e.to_function_id);
    backward.get(e.to_function_id).add(e.from_function_id);
  }

  const closure = (start, map) => {
    const seen = new Set();
    const stack = [...(map.get(start) ?? [])];
    while (stack.length) {
      const id = stack.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of map.get(id) ?? []) stack.push(next);
    }
    return seen;
  };

  return {
    reachableFrom: (id) => closure(id, forward),
    callersOf: (id) => new Set(backward.get(id) ?? []),
    transitiveCallersOf: (id) => closure(id, backward),
    isReachable: (from, to) => closure(from, forward).has(to),
    /** Callers we could not resolve. A member with these cannot claim a complete call-site list. */
    unresolvedFrom: (id) => [...(unresolvedFrom.get(id) ?? [])],
    hasUnresolved: (id) => (unresolvedFrom.get(id) ?? []).length > 0,
  };
}
