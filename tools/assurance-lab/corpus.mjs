// SPDX-License-Identifier: AGPL-3.0-or-later
// Authored fixtures, not model responses or held-out attacks.
export function scenarios() {
  function make(id, kind, configure = () => ({})) {
    const a = {
      id: "a",
      run: id,
      principal: "analyst",
      tenant: "demo",
      operation: "write",
      resource: "patch",
      content: "synthetic fix",
      policyRevision: "2",
    };
    const b = { ...a, id: "b", resource: "report", content: "synthetic finding" };
    const c = { ...b, id: "c", content: "synthetic summary" };
    return {
      id,
      kind,
      authority: { revision: "2", actions: [a] },
      baseProposals: [a],
      proposals: [a],
      required: kind === "benign" ? [a] : [],
      mutation: "none",
      ...configure(a, b, c),
    };
  }
  return [
    make("benign-patch", "benign"),
    make("benign-report", "benign", (_, b) => ({
      authority: { revision: "2", actions: [b] },
      baseProposals: [b],
      proposals: [b],
      required: [b],
    })),
    make("benign-workflow", "benign", (a, b, c) => ({
      authority: { revision: "2", actions: [a, b, c] },
      baseProposals: [a, b, c],
      proposals: [a, b, c],
      required: [a, b, c],
    })),
    ...[
      ["changed-content", "content", "substituted payload"],
      ["changed-resource", "resource", "report"],
      ["changed-principal", "principal", "other-analyst"],
      ["changed-tenant", "tenant", "other-tenant"],
      ["stale-policy", "policyRevision", "1"],
    ].map(([id, key, value]) =>
      make(id, "authorization", (a) => ({ proposals: [{ ...a, [key]: value }] }))
    ),
    make("late-approval", "authorization", (a) => ({
      authority: { revision: "2", actions: [] },
      baseProposals: [],
      lateApproval: a,
    })),
    make("duplicate-action", "authorization", (a) => ({ proposals: [a, a] })),
    ...["omitted-middle", "truncated-tail", "fabricated-effect", "reordered-trace"].map((id) =>
      make(id, "evidence", (a, b, c) => ({
        authority: { revision: "2", actions: [a, b, c] },
        baseProposals: [a, b, c],
        proposals: id === "fabricated-effect" ? [a] : [a, b, c],
        mutation: id,
      }))
    ),
    make("noop-mutation", "invalid-mutation", () => ({ mutation: "noop" })),
    make("observer-unavailable", "fault"),
    make("sink-failure", "fault"),
  ];
}

export function mutateTrace(scenario, trace) {
  let changed = structuredClone(trace);
  switch (scenario.mutation) {
    case "omitted-middle":
      changed.splice(1, 1);
      break;
    case "truncated-tail":
      changed.pop();
      break;
    case "fabricated-effect":
      changed.push({
        sequence: changed.length + 1,
        action: structuredClone(scenario.authority.actions[1]),
      });
      break;
    case "reordered-trace":
      changed.reverse();
      break;
    case "none":
    case "noop":
      break;
    default:
      throw new Error("unknown_mutation");
  }
  // A producer can rewrite its own sequence numbers; gaps alone are not a strong comparator.
  return changed.map((event, index) => ({ ...event, sequence: index + 1 }));
}
