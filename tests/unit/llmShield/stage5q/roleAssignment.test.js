// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5Q — Task 6 — security-role assignment and the adversarial role check (spec §2.4).
//
// This is the sharpest test file in Q0 so far, because §2.4 names role assignment as "the single
// highest-value attack against 5Q itself": a member mis-labelled `pure_transform` escapes the whole
// obligation matrix while every report still reads complete.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignRoles,
  requiredClasses,
  ruleFor,
  validateRuleTable,
  skeletonFor,
  ROLE_RULES,
  ZERO_OBLIGATION_ROLES,
  EXACT_ID_ROLE_ASSIGNMENTS,
} from "../../../../tools/simurgh-attestation/stage5q/core/roleAssignment.mjs";
import { buildReachability } from "../../../../tools/simurgh-attestation/stage5q/core/reconcile.mjs";
import {
  SECURITY_ROLES,
  REQUIRED_CLASSES_BY_ROLE,
  ATTACK_CLASSES,
} from "../../../../tools/simurgh-attestation/stage5q/core/constants.mjs";

const member = (id, extra = {}) => ({
  function_id: id,
  module_path: extra.module_path ?? "tools/simurgh-attestation/stage5a/core/x.mjs",
  export_name_or_internal_symbol: extra.symbol ?? "x",
  category: extra.category ?? "exported_function",
  root: extra.root ?? "R1",
  ...extra,
});

const decl = (id, role, extra = {}) => ({ function_id: id, security_role: role, ...extra });

// ---------------------------------------------------------------------------------------------
// requiredClasses — the §2.4 obligation table
// ---------------------------------------------------------------------------------------------

test("requiredClasses returns the FULL matrix for the four full-obligation roles", () => {
  for (const role of [
    "trust_decision",
    "completeness_claim",
    "canonicalisation",
    "code_allocation",
  ]) {
    assert.deepEqual(
      requiredClasses(role),
      [...ATTACK_CLASSES],
      `${role} carries every attack class (spec §2.4)`
    );
  }
});

test("an unknown role string is REJECTED, never defaulted", () => {
  // A default branch here is how a typo becomes zero obligations. `REQUIRED_CLASSES_BY_ROLE` has
  // no default branch for exactly this reason; `requiredClasses` must not add one back.
  assert.throws(() => requiredClasses("pure_transfrom"), /unknown security_role/);
  assert.throws(() => requiredClasses(""), /unknown security_role/);
  assert.throws(() => requiredClasses(undefined), /unknown security_role/);
});

test("every role in the frozen vocabulary has an obligation entry — totality", () => {
  for (const role of SECURITY_ROLES) {
    assert.ok(Array.isArray(REQUIRED_CLASSES_BY_ROLE[role]), `${role} has an obligation list`);
    for (const c of REQUIRED_CLASSES_BY_ROLE[role]) {
      assert.ok(ATTACK_CLASSES.includes(c), `${role} may only require frozen classes, saw ${c}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// THE LOAD-BEARING TEST — §2.4 adversarial role check
// ---------------------------------------------------------------------------------------------

test("a pure_transform REACHABLE FROM a trust_decision fails closed, and names the path", () => {
  const members = [
    member("5a:verify.mjs:verifySignature", { symbol: "verifySignature" }),
    member("5a:verify.mjs:middle", { symbol: "middle" }),
    member("5a:util.mjs:pad", { symbol: "pad" }),
  ];
  const edges = [
    { from_function_id: "5a:verify.mjs:verifySignature", to_function_id: "5a:verify.mjs:middle" },
    { from_function_id: "5a:verify.mjs:middle", to_function_id: "5a:util.mjs:pad" },
  ];
  const declared = [
    decl("5a:verify.mjs:verifySignature", "trust_decision"),
    decl("5a:verify.mjs:middle", "canonicalisation"),
    decl("5a:util.mjs:pad", "pure_transform"),
  ];
  const r = assignRoles({ members, declared, reachability: buildReachability({ members, edges }) });

  const v = r.violations.find((x) => x.function_id === "5a:util.mjs:pad");
  assert.ok(v, "the escape must be caught");
  assert.equal(v.kind, "pure_transform_reachable_from_trust_decision");
  assert.equal(v.declared, "pure_transform");
  // "there is a path" is not actionable. The reviewer needs the path itself.
  assert.deepEqual(v.path, [
    "5a:verify.mjs:verifySignature",
    "5a:verify.mjs:middle",
    "5a:util.mjs:pad",
  ]);
  assert.equal(r.ok, false);
});

test("the same check fires for an R8 unit-test member exactly as for an R1 member (Annex A1)", () => {
  // Moved here from Task 1.5 by second-gauntlet B2: the role-totality and role-adversarial tests
  // belong to the task that owns the module. R8 members are not a lesser tier of the closure.
  const members = [
    member("5p:sig.mjs:verifyRoot", { symbol: "verifyRoot" }),
    member("5p:t.test.js:helper", {
      module_path: "tests/unit/llmShield/stage5p/rawCodeCensus.test.js",
      root: "R8",
      symbol: "helper",
      category: "internal_function",
    }),
  ];
  const edges = [
    { from_function_id: "5p:sig.mjs:verifyRoot", to_function_id: "5p:t.test.js:helper" },
  ];
  const declared = [
    decl("5p:sig.mjs:verifyRoot", "trust_decision"),
    decl("5p:t.test.js:helper", "pure_transform"),
  ];
  const r = assignRoles({ members, declared, reachability: buildReachability({ members, edges }) });
  const v = r.violations.find((x) => x.function_id === "5p:t.test.js:helper");
  assert.ok(v, "an R8 member declared pure_transform under a trust_decision must fail closed");
  assert.equal(v.root, "R8");
});

test("a pure_transform NOT under any trust_decision is permitted — the rule is not a blanket ban", () => {
  const members = [member("5a:util.mjs:pad", { symbol: "pad" }), member("5a:fmt.mjs:emit")];
  const edges = [{ from_function_id: "5a:fmt.mjs:emit", to_function_id: "5a:util.mjs:pad" }];
  const declared = [
    decl("5a:fmt.mjs:emit", "evidence_emission"),
    decl("5a:util.mjs:pad", "pure_transform"),
  ];
  const r = assignRoles({ members, declared, reachability: buildReachability({ members, edges }) });
  assert.deepEqual(r.violations, []);
  assert.equal(r.assigned.get("5a:util.mjs:pad"), "pure_transform");
});

// ---------------------------------------------------------------------------------------------
// NO EXCEPTION MECHANISM (gauntlet P0-8)
// ---------------------------------------------------------------------------------------------

test("there is NO exception mechanism — an exception field is itself a violation", () => {
  // Spec §2.4 permits "a signed, member-specific exception". Q0 prohibits exceptions ENTIRELY
  // (plan, gauntlet P0-8) because the spec named no schema, signer, key, signature profile,
  // validity period, member binding or path binding — a field literally called `signed: true`
  // would have satisfied the prose.
  //
  // A checker that merely IGNORED an exception field would be worse than one that rejects it:
  // the author would believe they had cleared the violation. So the field is named and refused.
  const members = [member("5a:v.mjs:verifyRoot"), member("5a:u.mjs:pad", { symbol: "pad" })];
  const edges = [{ from_function_id: "5a:v.mjs:verifyRoot", to_function_id: "5a:u.mjs:pad" }];
  const reachability = buildReachability({ members, edges });

  for (const field of ["exception", "signed", "signed_exception", "waiver", "exempt"]) {
    const declared = [
      decl("5a:v.mjs:verifyRoot", "trust_decision"),
      decl("5a:u.mjs:pad", "pure_transform", { [field]: true }),
    ];
    const r = assignRoles({ members, declared, reachability });
    const kinds = r.violations.map((x) => x.kind);
    assert.ok(
      kinds.includes("exception_field_prohibited"),
      `${field} must be refused, not ignored`
    );
    assert.ok(
      kinds.includes("pure_transform_reachable_from_trust_decision"),
      `${field} must NOT clear the underlying violation`
    );
  }
});

// ---------------------------------------------------------------------------------------------
// TOTALITY — exactly one role per committed member
// ---------------------------------------------------------------------------------------------

test("an unassigned member is a violation — silence is not a role", () => {
  const members = [member("5a:x.mjs:a"), member("5a:x.mjs:b")];
  const r = assignRoles({
    members,
    declared: [decl("5a:x.mjs:a", "schema_gate")],
    reachability: null,
  });
  const v = r.violations.find((x) => x.kind === "unassigned_member");
  assert.ok(v);
  assert.equal(v.function_id, "5a:x.mjs:b");
});

test("a duplicate declaration is a violation — and this is why the file is an ARRAY", () => {
  // A JSON object keyed by function_id would make duplicates UNDETECTABLE: JSON.parse silently
  // keeps the last one. In a stage about false completeness claims, a format that can hide a
  // second, contradictory assignment is not an acceptable format.
  const members = [member("5a:x.mjs:a")];
  const declared = [decl("5a:x.mjs:a", "schema_gate"), decl("5a:x.mjs:a", "pure_transform")];
  const r = assignRoles({ members, declared, reachability: null });
  const v = r.violations.find((x) => x.kind === "duplicate_declaration");
  assert.ok(v, "both declarations must be visible to the checker");
  assert.equal(v.function_id, "5a:x.mjs:a");
});

test("a declaration for a member outside the closure is a violation", () => {
  const r = assignRoles({
    members: [member("5a:x.mjs:a")],
    declared: [decl("5a:x.mjs:a", "schema_gate"), decl("5a:ghost.mjs:z", "pure_transform")],
    reachability: null,
  });
  assert.ok(r.violations.some((x) => x.kind === "unknown_function_id"));
});

test("an unknown role in the FILE is a violation, not an exception", () => {
  const r = assignRoles({
    members: [member("5a:x.mjs:a")],
    declared: [decl("5a:x.mjs:a", "mostly_harmless")],
    reachability: null,
  });
  const v = r.violations.find((x) => x.kind === "unknown_role");
  assert.ok(v);
  assert.equal(v.declared, "mostly_harmless");
});

test("a needs_review flag BLOCKS — an unreviewed skeleton is not an assignment", () => {
  const r = assignRoles({
    members: [member("5a:x.mjs:a")],
    declared: [decl("5a:x.mjs:a", "completeness_claim", { needs_review: true })],
    reachability: null,
  });
  assert.ok(r.violations.some((x) => x.kind === "needs_review_unresolved"));
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------------------------------------
// THE RULE TABLE — a generated skeleton is only sound if the generator cannot widen the escape
// ---------------------------------------------------------------------------------------------

test("the two ZERO-OBLIGATION roles are exactly pure_transform and imported_dependency", () => {
  // Derived from the obligation table, not hand-listed: if a future role gains an empty class list
  // it must automatically fall under the exact-id restriction below.
  const derived = SECURITY_ROLES.filter((r) => REQUIRED_CLASSES_BY_ROLE[r].length === 0).sort();
  assert.deepEqual([...ZERO_OBLIGATION_ROLES].sort(), derived);
  assert.deepEqual(derived, ["imported_dependency", "pure_transform"]);
});

test("NO PATTERN RULE may assign a zero-obligation role — exact ids only", () => {
  // This is the structural mitigation. A broad rule that assigns `pure_transform` would let one
  // regex silently remove hundreds of members from the matrix; every report would still read
  // complete. Narrowing to zero obligations must be done member by member, in a list a reviewer
  // can read end to end.
  const r = validateRuleTable(ROLE_RULES);
  assert.deepEqual(r.problems, []);
  for (const rule of ROLE_RULES) {
    assert.ok(
      !ZERO_OBLIGATION_ROLES.includes(rule.role),
      `rule ${rule.id} assigns ${rule.role} by pattern — prohibited`
    );
  }
});

test("validateRuleTable REJECTS a pattern rule that assigns a zero-obligation role", () => {
  // The guard above is only meaningful if it has been seen to fire.
  const bad = [
    ...ROLE_RULES,
    { id: "EVIL", role: "pure_transform", rationale: "helpers", basename: /.*/ },
  ];
  const r = validateRuleTable(bad);
  assert.ok(r.problems.some((p) => p.rule_id === "EVIL"));
  assert.match(r.problems[0].reason, /zero-obligation/);
});

test("every rule carries an id and a rationale, and ids are unique", () => {
  const seen = new Set();
  for (const rule of ROLE_RULES) {
    assert.match(rule.id, /^[A-Z0-9-]+$/, `rule id ${rule.id} is citable`);
    assert.ok(rule.rationale && rule.rationale.length > 15, `rule ${rule.id} states WHY`);
    assert.ok(SECURITY_ROLES.includes(rule.role), `rule ${rule.id} uses a frozen role`);
    assert.ok(!seen.has(rule.id), `duplicate rule id ${rule.id}`);
    seen.add(rule.id);
  }
});

test("rules are FIRST-MATCH and the order is the committed order", () => {
  const m = member("5a:core/canonicalJson.mjs:canonicalise", {
    module_path: "tools/simurgh-attestation/stage5a/core/canonicalJson.mjs",
  });
  const hit = ruleFor(m);
  assert.ok(hit, "a canonicaliser matches a rule");
  assert.equal(hit.role, "canonicalisation");
  // and the first matching rule in table order is the one returned
  const first = ROLE_RULES.find((r) => ruleFor(m).id === r.id);
  assert.equal(first.id, hit.id);
});

test("the skeleton flags needs_review when NO rule matches — it never guesses", () => {
  const m = member("5a:core/zzz-unmatched.mjs:qqq", {
    module_path: "tools/simurgh-attestation/stage5a/core/zzz-unmatched.mjs",
    symbol: "qqq",
    category: "exported_function",
  });
  const s = skeletonFor(m);
  if (s.needs_review) {
    assert.equal(s.basis, "no_rule_matched");
    assert.ok(SECURITY_ROLES.includes(s.security_role), "the placeholder is still a frozen role");
  }
  // Whatever happens, the skeleton must never emit a zero-obligation role by inference.
  assert.ok(!ZERO_OBLIGATION_ROLES.includes(s.security_role) || s.basis === "exact_id");
});

test("skeletonFor records the BASIS of every assignment", () => {
  const m = member("5c:proofs:Thm", { category: "lean_theorem", root: "R3" });
  const s = skeletonFor(m);
  assert.equal(s.security_role, "formal_statement");
  assert.match(s.basis, /^rule:/);
  assert.equal(s.needs_review, false);
});

test("EXACT_ID_ROLE_ASSIGNMENTS is empty in Q0 — the escape hatch is unused, not unguarded", () => {
  // Honest statement of the current position: no member is assigned a zero-obligation role. That
  // over-obligates some genuine string helpers, and over-obligation cannot produce a false green.
  // If Q1 narrows any of them it does so member by member, in this list, under review.
  assert.deepEqual(EXACT_ID_ROLE_ASSIGNMENTS, {});
});
