// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — delegation validation (spec §2.7).
//
// `delegated_to_attacked_caller` is the only one of the four coverage statuses that discharges a
// member WITHOUT attacking it. That makes it the softest, and the place a coverage ratio goes to
// die. Three ways it fails quietly, all handled here:
//
//   THE VACUOUS CASE.  "All of my callers were attacked" is trivially TRUE when there are no
//   callers, and a checker written as `callers.every(isAttacked)` returns true for the empty list
//   without being asked. Zero call sites is a hard failure, checked before anything else.
//
//   THE CYCLE.  A delegates to B, B delegates to A. Every member has a caller, every caller has a
//   status, and nothing anywhere has been attacked. A naive resolver either recurses forever or —
//   worse — memoises the in-progress node as discharged and returns a clean bill of health.
//
//   THE INCOMPLETE LIST.  A member whose caller list is known to be partial cannot claim that all
//   of its callers were attacked. This is why the census records unresolved call edges rather than
//   dropping them: a silently dropped edge is a silently missing caller, and a missing caller is
//   exactly how this status becomes a lie.
//
// ONE unattacked caller is enough to invalidate. This is not a majority vote — a status is a claim
// about every path into the member, and one unexercised path falsifies it.

import { COVERAGE_STATUSES } from "./constants.mjs";

/** Closed vocabulary. A fifth kind is a programming error, not a new sort of problem. */
export const DELEGATION_PROBLEM_KINDS = Object.freeze([
  "missing_callsite",
  "unattacked_caller",
  "cycle",
  "incomplete_caller_list",
  "unknown_status",
]);

const DELEGATED = "delegated_to_attacked_caller";
const DISCHARGING = "attacked_pass";

/**
 * @param {{
 *   members: Array<{function_id: string}>,
 *   statuses: Map<string,string>,
 *   callers: Map<string,string[]>,
 *   unresolvedCallers?: Map<string,string[]>
 * }} input
 */
export function validateDelegation({ members, statuses, callers, unresolvedCallers = new Map() }) {
  const problems = [];
  const ids = new Set(members.map((m) => m.function_id));

  // Every member carries exactly one status from the frozen four. A member with no status is not
  // "probably fine"; it is uncovered, and this is the last place that can still be said out loud.
  for (const m of members) {
    const status = statuses.get(m.function_id);
    if (!COVERAGE_STATUSES.includes(status)) {
      problems.push({
        function_id: m.function_id,
        kind: "unknown_status",
        status: status ?? null,
        reason:
          "coverage status must be one of the frozen four (spec §2.7); an absent or unrecognised " +
          "status is uncovered, not covered",
      });
    }
  }

  // WHITE = unvisited, GREY = on the current stack, BLACK = settled. GREY is the cycle detector:
  // meeting a node that is still on the stack means the delegation chain closed on itself.
  const colour = new Map();
  const settled = new Map();
  const stack = [];

  /** Does `id` discharge the member below it? */
  const resolves = (id) => {
    if (!ids.has(id)) return false; // a caller outside the closure vouches for nothing
    const status = statuses.get(id);
    if (status === DISCHARGING) return true;
    if (status !== DELEGATED) return false; // finding_frozen and mechanically_unreachable do not
    if (settled.has(id)) return settled.get(id);

    if (colour.get(id) === "grey") {
      // Close the cycle and flag every member on it. Flagging only the entry point would leave the
      // rest of the ring looking discharged by a member that is itself undischarged.
      const from = stack.indexOf(id);
      const ring = stack.slice(from);
      for (const node of ring) {
        if (!problems.some((p) => p.function_id === node && p.kind === "cycle")) {
          problems.push({
            function_id: node,
            kind: "cycle",
            cycle_path: [...ring, id],
            reason:
              "delegation closed on itself: every member in this ring points at another member " +
              "in the ring, so nothing in it has been attacked and nothing in it is discharged",
          });
        }
        settled.set(node, false);
      }
      return false;
    }

    colour.set(id, "grey");
    stack.push(id);
    const ok = checkOne(id);
    stack.pop();
    colour.set(id, "black");
    if (!settled.has(id)) settled.set(id, ok);
    return settled.get(id);
  };

  /** Validate one delegating member, recording its own problems. */
  const checkOne = (id) => {
    const list = callers.get(id) ?? [];
    const unresolved = unresolvedCallers.get(id) ?? [];

    if (list.length === 0) {
      problems.push({
        function_id: id,
        kind: "missing_callsite",
        reason:
          "delegation with zero named call sites is vacuous: 'all zero of my callers were " +
          "attacked' is trivially true and discharges nothing",
      });
      return false;
    }
    if (unresolved.length > 0) {
      problems.push({
        function_id: id,
        kind: "incomplete_caller_list",
        unresolved: [...unresolved],
        reason:
          "the caller list is known to be partial, so 'all of my callers were attacked' cannot " +
          "be established. An unresolved call edge is a caller we could not name.",
      });
      return false;
    }

    let ok = true;
    for (const caller of list) {
      if (resolves(caller)) continue;
      // A caller flagged only as part of a cycle has already produced its own problem; do not also
      // report it here, or one ring yields two rows per member.
      const inCycle = problems.some((p) => p.function_id === caller && p.kind === "cycle");
      if (!inCycle) {
        problems.push({
          function_id: id,
          kind: "unattacked_caller",
          caller,
          caller_status: ids.has(caller) ? (statuses.get(caller) ?? null) : null,
          reason:
            "one unattacked caller is enough. A coverage status is a claim about every path into " +
            "the member, and this path has not been exercised.",
        });
      }
      ok = false;
    }
    return ok;
  };

  for (const m of members) {
    if (statuses.get(m.function_id) !== DELEGATED) continue;
    if (colour.get(m.function_id) === "black") continue;
    resolves(m.function_id);
  }

  return { ok: problems.length === 0, problems };
}

/**
 * Convenience: build the caller inputs from a reachability graph.
 *
 * `hasUnresolved` is carried through deliberately — it is the whole reason `buildReachability`
 * keeps unresolved edges instead of discarding them.
 */
export function delegationInputsFrom(reachability, members) {
  const callers = new Map();
  const unresolvedCallers = new Map();
  for (const m of members) {
    callers.set(m.function_id, [...reachability.callersOf(m.function_id)]);
    const u = reachability.unresolvedFrom(m.function_id);
    if (u.length > 0) unresolvedCallers.set(m.function_id, u);
  }
  return { callers, unresolvedCallers };
}
