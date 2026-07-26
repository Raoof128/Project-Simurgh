// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 14 — the generic attack-pack families.
//
// Every family here was chosen because its finding condition is observable WITHOUT a positive
// control. These tests are mostly about the other half of that promise: that a family which cannot
// establish anything says so, rather than counting a throw as a refusal.
//
// The fail-open family produced two different classes of FALSE FINDING on its first two runs. Both
// are pinned below, because a false finding spends exactly the credibility this whole apparatus
// exists to build, and a regression that reintroduces one must fail here rather than in an
// attestation.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAMILIES,
  familiesFor,
  dischargeFor,
  isAcceptShaped,
  isRefusalShaped,
  firstParameterName,
  suppliesOwnDefault,
  deepNest,
  ATTACKABLE_CLASSES,
  DISCHARGING_OUTCOMES,
  FINDING_OUTCOMES,
} from "../../../../tools/simurgh-attestation/stage5q/core/probeFamilies.mjs";
import { ATTACK_CLASSES } from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const family = (id) => FAMILIES.find((f) => f.family_id === id);
const run = (id, value) => family(id).run({ value });

// ------------------------------------------------------------------------------------------------
// The contract.
// ------------------------------------------------------------------------------------------------

test("every family names a frozen attack class", () => {
  for (const f of FAMILIES) assert.ok(ATTACK_CLASSES.includes(f.attack_class), f.family_id);
});

test("the families attack FIVE of sixteen classes, and the gap is not hidden", () => {
  // Claiming R3 or R4 from a generic probe would be the fake completeness this stage polices. The
  // number is asserted so that widening it is a deliberate act with a test change attached.
  assert.equal(ATTACKABLE_CLASSES.length, 5);
  assert.ok(ATTACKABLE_CLASSES.length < ATTACK_CLASSES.length);
});

test("only outcomes that measured something discharge", () => {
  for (const outcome of ["established_nothing", "not_applicable", "probe_errored"]) {
    assert.equal(dischargeFor(outcome), null, outcome);
  }
  for (const outcome of DISCHARGING_OUTCOMES) assert.equal(dischargeFor(outcome), "attacked_pass");
  for (const outcome of FINDING_OUTCOMES) assert.equal(dischargeFor(outcome), "finding_frozen");
});

test("fail-open is role-gated; the call-property families are not", () => {
  // A family that reads a return value as a verdict may only run where producing a verdict is the
  // job. The others observe the call itself, so the member's role does not change what they see.
  assert.deepEqual(family("fail-open").roles, ["trust_decision", "completeness_claim"]);
  for (const id of ["argument-aliasing", "prototype-pollution", "determinism"]) {
    assert.equal(family(id).roles, undefined);
  }
  const forCanon = familiesFor("exported_function", "canonicalisation").map((f) => f.family_id);
  assert.equal(forCanon.includes("fail-open"), false);
  assert.equal(forCanon.includes("argument-aliasing"), true);
});

// ------------------------------------------------------------------------------------------------
// frozen-constant (R8).
// ------------------------------------------------------------------------------------------------

test("a deeply frozen constant passes", () => {
  const inner = Object.freeze({ a: 1 });
  const r = run("frozen-constant", Object.freeze({ inner }));
  assert.equal(r.outcome, "refused_as_expected");
});

test("a SHALLOW freeze is a finding, and names the writable paths", () => {
  const r = run("frozen-constant", Object.freeze({ registry: {} }));
  assert.equal(r.outcome, "unexpectedly_mutated");
  assert.match(r.detail, /\$\.registry/);
});

test("the frozen-constant premise is shaped for omitsMember and is recomputable", () => {
  const r = run("frozen-constant", Object.freeze({ registry: {}, ok: Object.freeze({}) }));
  // universe = every reachable node; produced = the frozen ones. Their difference IS the finding,
  // and a verifier recomputes it without ever seeing the constant.
  assert.ok(r.premise.universe.length > r.premise.produced.length);
  assert.ok(r.premise.universe.includes("$.registry"));
  assert.equal(r.premise.produced.includes("$.registry"), false);
});

test("a primitive is not_applicable, never a pass", () => {
  // The attack does not reach it. That is different from the target withstanding the attack, and
  // recording it as a pass would discharge a cell nothing was done to.
  assert.equal(run("frozen-constant", 42).outcome, "not_applicable");
  assert.equal(dischargeFor(run("frozen-constant", "s").outcome), null);
});

// ------------------------------------------------------------------------------------------------
// argument-aliasing (R8).
// ------------------------------------------------------------------------------------------------

test("a function that mutates its argument is a finding", () => {
  const r = run("argument-aliasing", (o) => {
    o.injected = true;
  });
  assert.equal(r.outcome, "unexpectedly_mutated");
  assert.deepEqual(
    r.premise.vectors.map((v) => v.subject),
    ["caller_argument", "caller_argument"]
  );
});

test("a function that THROWS without mutating still passes — the premise is the call", () => {
  const r = run("argument-aliasing", () => {
    throw new TypeError("nope");
  });
  assert.equal(r.outcome, "refused_as_expected");
  assert.equal(r.premise.invoked, true);
  assert.match(r.premise.threw, /nope/);
});

// ------------------------------------------------------------------------------------------------
// prototype-pollution (R1).
// ------------------------------------------------------------------------------------------------

test("a function that copies __proto__ onto Object.prototype is a finding", () => {
  const r = run("prototype-pollution", (o) => {
    // The naive merge that makes this class of bug real.
    for (const k of Object.keys(o)) {
      if (k === "__proto__") Object.assign(Object.prototype, o[k]);
    }
  });
  assert.equal(r.outcome, "unexpectedly_accepted");
  // And the probe cleaned up after itself: a probe that leaves the prototype polluted has changed
  // the environment every later probe runs in.
  assert.equal({}.simurgh5qPolluted, undefined);
});

test("an ordinary function leaves Object.prototype alone", () => {
  const r = run("prototype-pollution", (o) => Object.keys(o).length);
  assert.equal(r.outcome, "refused_as_expected");
  assert.equal(r.premise.payload_carries_own_proto_key, true);
});

// ------------------------------------------------------------------------------------------------
// determinism (R15).
// ------------------------------------------------------------------------------------------------

test("a function that disagrees with itself is a finding", () => {
  let n = 0;
  const r = run("determinism", () => n++);
  assert.equal(r.outcome, "unexpectedly_accepted");
});

test("two identical THROWS are agreement, not a finding", () => {
  const r = run("determinism", () => {
    throw new Error("same every time");
  });
  assert.equal(r.outcome, "accepted_as_expected");
  assert.equal(r.premise.first, "threw");
});

// ------------------------------------------------------------------------------------------------
// pathological-operand (R9).
// ------------------------------------------------------------------------------------------------

test("deepNest builds iteratively — the PROBE must not be what blows the stack", () => {
  const deep = deepNest(20000);
  let n = 0;
  let node = deep;
  while (node.next) {
    node = node.next;
    n += 1;
  }
  assert.equal(n, 20000);
});

test("a target that recurses to death is recorded as stack_exhausted, not as a probe error", () => {
  const r = run("pathological-operand", function walk(o) {
    return o && typeof o === "object" ? walk(o.next) : 0;
  });
  assert.equal(r.outcome, "refused_as_expected");
  assert.ok(r.observations.some((o) => o.outcome === "stack_exhausted"));
});

// ------------------------------------------------------------------------------------------------
// fail-open (R16) — and the two false findings it produced before these tests existed.
// ------------------------------------------------------------------------------------------------

test("returning an accept shape for undefined is a finding", () => {
  // Deliberately phrased WITHOUT `x === undefined` or `!x`: those are the body-default patterns the
  // family withdraws on, and the first version of this test tripped its own guard.
  const r = run("fail-open", (x) => ({ ok: true, seen: String(x) }));
  assert.equal(r.outcome, "unexpectedly_accepted");
});

test("a THROW establishes NOTHING — this is where vacuity would hide", () => {
  // A function that rejects everything throws on this input too. Counting that as a pass is the
  // vacuous discharge F001 is made of.
  const r = run("fail-open", () => {
    throw new Error("always");
  });
  assert.equal(r.outcome, "established_nothing");
  assert.equal(dischargeFor(r.outcome), null);
});

test("FALSE FINDING 1: a function that ignores its argument establishes nothing", () => {
  // `measureLaneACensus(undefined)` returns `{ok: true}` because it reads pinned files and never
  // looks at its argument. The first version of this family called that fail-open. There is no
  // accept, because there is no input surface.
  const r = run("fail-open", (_ignored) => ({ census: "computed from disk", ok: true }));
  assert.equal(r.outcome, "established_nothing");
  assert.match(r.detail, /does not read its argument/);
});

test("FALSE FINDING 2: `undefined` selects a default, so it is not an impossible input", () => {
  // Declared arity 0 — a defaulted first parameter.
  const defaulted = (spec = "the real spec") => ({ measured: spec, ok: true });
  assert.equal(defaulted.length, 0);
  assert.equal(run("fail-open", defaulted).outcome, "established_nothing");

  // And the same default written inside the body, where Function.length cannot see it.
  const bodyDefault = function measure(specText) {
    const spec = specText ?? "the real spec";
    return { measured: spec, ok: true };
  };
  assert.equal(bodyDefault.length, 1);
  const r = run("fail-open", bodyDefault);
  assert.equal(r.outcome, "established_nothing");
  assert.match(r.detail, /supplies its own default/);
});

test("the body-default heuristic only ever WITHDRAWS a claim", () => {
  // Being wrong can make this family claim less than it might have, never more. That is the
  // correct direction for a heuristic to fail in, and it is asserted rather than assumed.
  assert.equal(suppliesOwnDefault("function f(a){ const x = a ?? 1; }", "a"), true);
  assert.equal(suppliesOwnDefault("function f(a){ if (!a) return null; }", "a"), true);
  assert.equal(suppliesOwnDefault("function f(a){ return a.b; }", "a"), false);
  // A different parameter's default must not withdraw this parameter's finding.
  assert.equal(suppliesOwnDefault("function f(a, b){ const y = b ?? 2; return a.k; }", "a"), false);
});

test("firstParameterName handles the shapes this codebase actually uses", () => {
  assert.equal(firstParameterName("function f(a, b) {}"), "a");
  assert.equal(firstParameterName("(a) => a"), "a");
  assert.equal(firstParameterName("a => a"), "a");
  assert.equal(firstParameterName("function f(a = 1) {}"), "a");
  // Destructured: no name, and destructuring `undefined` throws by construction, so `null` here
  // must not be read as "there is no parameter".
  assert.equal(firstParameterName("function f({ a, b }) {}"), null);
  assert.equal(firstParameterName("function f() {}"), null);
});

test("accept and refusal shapes are not each other's negation", () => {
  assert.equal(isAcceptShaped(null), true);
  assert.equal(isAcceptShaped({ ok: true }), true);
  assert.equal(isRefusalShaped({ ok: false }), true);
  assert.equal(isRefusalShaped(296), true);
  // A plain object is neither, and must not be forced into one of them.
  assert.equal(isAcceptShaped({ some: "value" }), false);
  assert.equal(isRefusalShaped({ some: "value" }), false);
});

// ------------------------------------------------------------------------------------------------
// The committed pack results.
// ------------------------------------------------------------------------------------------------

test("no pack result discharges a cell from an outcome that established nothing", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const path = "docs/research/llm-shield/evidence/stage-5q/packs/all-pack-results.json";
  if (!existsSync(path)) return;
  const j = JSON.parse(readFileSync(path, "utf8"));
  for (const d of j.discharges) {
    assert.ok(
      dischargeFor(d.observed_outcome) === d.discharge_status,
      `${d.function_id} ${d.attack_class}: ${d.observed_outcome} -> ${d.discharge_status}`
    );
  }
  // And every finding carries the fixture a verifier needs to recompute it.
  for (const d of j.discharges.filter((x) => x.discharge_status === "finding_frozen")) {
    assert.ok(d.premise_fixture, `${d.function_id} has a finding with no premise fixture`);
  }
});
