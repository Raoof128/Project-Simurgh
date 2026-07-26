// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — security-role assignment and the adversarial role check (spec §2.4).
//
// §2.4 is blunt about what this file is: "The role assignment is adversarial input. A member
// mis-labelled `pure_transform` escapes the matrix — this is the single highest-value attack
// against 5Q itself." Everything below exists to make that escape hard to take and impossible to
// take quietly.
//
// THREE MECHANISMS, IN ORDER OF STRENGTH.
//
//  1. STRUCTURAL. No pattern rule may assign a zero-obligation role. `pure_transform` and
//     `imported_dependency` — derived from the obligation table, not hand-listed — can only be
//     reached through EXACT_ID_ROLE_ASSIGNMENTS, a flat list of function ids a reviewer reads end
//     to end. One regex can escalate a thousand members; none can exempt them.
//
//  2. GRAPH-CHECKED. A member declared `pure_transform` that is reachable from a `trust_decision`
//     member fails closed, and the violation carries the call path. Role is a claim about the
//     code, and the graph is the code.
//
//  3. NO EXCEPTIONS AT ALL IN Q0 (plan, gauntlet P0-8). The spec permits "a signed, member-specific
//     exception" while naming no schema, signer, key, signature profile, validity period, member
//     binding or path binding — a field literally called `signed: true` would have satisfied the
//     prose. Q0 is stricter than the frozen spec, which is always allowed. Exception-shaped fields
//     are REFUSED rather than ignored: an ignored field lets the author believe they cleared the
//     violation.
//
// WHY THE FILE IS AN ARRAY AND NOT A MAP. A JSON object keyed by function_id makes a duplicate,
// contradictory assignment undetectable — JSON.parse keeps the last silently. In a stage about
// false completeness claims, a format that can hide a second answer is not an acceptable format.

import { SECURITY_ROLES, REQUIRED_CLASSES_BY_ROLE, ATTACK_CLASSES } from "./constants.mjs";

/**
 * Roles that carry NO attack obligation, derived from the frozen table.
 *
 * Derived, never hand-listed: if a future role were given an empty class list it would fall under
 * the exact-id restriction automatically instead of quietly becoming a second escape hatch.
 */
export const ZERO_OBLIGATION_ROLES = Object.freeze(
  SECURITY_ROLES.filter((r) => REQUIRED_CLASSES_BY_ROLE[r].length === 0)
);

/** Fields that would express an exception. Named so they can be REFUSED, not ignored. */
const EXCEPTION_FIELDS = Object.freeze([
  "exception",
  "signed",
  "signed_exception",
  "waiver",
  "exempt",
  "override",
]);

/**
 * The §2.4 obligation lookup.
 *
 * `REQUIRED_CLASSES_BY_ROLE` deliberately has no default branch, so an unknown role yields
 * `undefined` rather than `[]`. This function turns that into a throw: a typo must never read as
 * "no obligations".
 */
export function requiredClasses(role) {
  const classes = REQUIRED_CLASSES_BY_ROLE[role];
  if (!Array.isArray(classes)) {
    throw new Error(
      `unknown security_role ${JSON.stringify(role)} — roles are a closed vocabulary (spec §2.4); ` +
        `an unknown role is never defaulted, because a default here is zero obligations`
    );
  }
  return [...classes];
}

/**
 * Members assigned a zero-obligation role, by exact id.
 *
 * EMPTY IN Q0, and that is a position rather than an oversight. There certainly ARE pure string
 * helpers in this closure; assigning them zero obligation is what costs something if it is wrong,
 * and over-obligation cannot produce a false green. Q1 may narrow individual members here, one line
 * at a time, under review — which is the only way the hatch opens at all.
 *
 * @type {Record<string, string>}   function_id -> role
 */
export const EXACT_ID_ROLE_ASSIGNMENTS = Object.freeze({});

/**
 * The committed rule table. ORDERED; first match wins.
 *
 * Each rule names an id (citable in a finding forever), a matcher, a role and the reason. A rule
 * without a stated reason is a heuristic pretending to be a policy, so `rationale` is enforced by
 * test.
 *
 * Matchers are deliberately coarse and structural — category, root, directory, module basename —
 * because the strong guarantee comes from mechanism 1 and 2 above, not from the precision of this
 * table. A rule that is too broad OVER-obligates, which is safe. A rule cannot under-obligate,
 * because no rule may reach a zero-obligation role.
 */
export const ROLE_RULES = Object.freeze(
  [
    // ---- category-determined: these are facts from the census, not guesses ----
    {
      id: "CAT-LEAN",
      category: "lean_theorem",
      role: "formal_statement",
      rationale:
        "a Lean theorem states a claim; the question asked of it is whether it states the one the prose claims",
    },
    {
      id: "CAT-PY",
      category: "python_mirror",
      role: "parity_mirror",
      rationale:
        "a Python mirror exists to agree with the Node implementation; divergence is its only interesting failure",
    },
    {
      id: "CAT-SH",
      category: "shell_step",
      role: "orchestration",
      rationale: "a shell function wires steps together and makes no trust decision of its own",
    },
    {
      id: "CAT-GATE",
      category: "gate_definition",
      role: "completeness_claim",
      rationale:
        "a test-file or e2e gate asserts a fact about a SET, which is the completeness surface the stage exists to police",
    },
    {
      id: "CAT-EMIT",
      category: "evidence_emission",
      role: "evidence_emission",
      rationale:
        "a fixture builder produces the evidence later claims rest on; vacuity and fabrication are its risks",
    },
    {
      id: "CAT-VBRANCH",
      category: "verifier_branch",
      role: "trust_decision",
      rationale:
        "a verifier reject branch IS the trust decision; a branch that never fires is a false green",
    },

    // ---- module-determined, by basename. Order matters: trust before everything. ----
    {
      id: "MOD-SIGN",
      basename:
        /(signature|signing|sign|keys?|ed25519|dleq|voprf|ots|rekor|sigstore|tsa|notary|witness|anchor|quorum)/i,
      role: "trust_decision",
      rationale: "signature, key and external-anchor modules decide whether something is trusted",
    },
    {
      id: "MOD-VERIFY",
      basename:
        /(verif|verify|attest|trust|resolver|independen|charter|authority|principal|identity|consent|delegat|custody)/i,
      role: "trust_decision",
      rationale:
        "verification, authority and delegation modules answer 'may this be believed', the definition of a trust decision",
    },
    {
      id: "MOD-CANON",
      basename: /(canonical|digest|hash|merkle|leaf|encode|codec|serial|normalis|normaliz)/i,
      role: "canonicalisation",
      rationale: "one byte of drift here invalidates every signature above it (spec §2.4)",
    },
    {
      id: "MOD-CODES",
      basename:
        /(rawcode|raw-code|codeallocat|code-allocat|exitcode|exit-code|exitmap|exitWrapper)/i,
      role: "code_allocation",
      rationale:
        "raw-code collision or shadowing is a silent misreport, invisible in every green run",
    },
    {
      id: "MOD-COMPLETE",
      basename:
        /(census|coverage|complete|universe|closure|scope|manifest|panel|inventory|ledger|registry|adequacy|totality)/i,
      role: "completeness_claim",
      rationale:
        "censuses, coverage gates and universe commitments are the moat itself (spec §2.4)",
    },
    {
      id: "MOD-SCHEMA",
      basename: /(schema|shape|grammar|validat|check|constraint|invariant|guard|gate)/i,
      role: "schema_gate",
      rationale: "exact-key and grammar enforcement; a loosened key set is an unnoticed widening",
    },
    {
      id: "MOD-PARITY",
      basename: /(portable|parity|mirror|browser)/i,
      role: "parity_mirror",
      rationale: "a portable or browser mirror must agree byte for byte with its Node original",
    },
    {
      id: "MOD-EMIT",
      basename:
        /(fixture|corpus|build-|generate|emit|report|projection|render|capsule|narrative|bundle|artifact|receipt|evidence|summary)/i,
      role: "evidence_emission",
      rationale: "builders and generators carry vacuity and fabrication risk (spec §2.4)",
    },
    {
      id: "MOD-CONST",
      basename: /^constants\.mjs$/,
      role: "completeness_claim",
      rationale:
        "a frozen vocabulary IS a universe commitment; a value added after results are known is how a coverage ratio stops meaning anything",
    },

    // ---- directory-determined, for anything the basename rules did not claim ----
    {
      id: "DIR-NODE",
      pathRe: /\/(node|lanea|laneb|lanec)\//i,
      role: "orchestration",
      rationale:
        "driver and lane wiring: CLI argument handling, file I/O and process control (spec §2.4)",
    },
    {
      id: "DIR-BROWSER",
      pathRe: /\/browser\//i,
      role: "parity_mirror",
      rationale: "the browser surface exists to mirror Node; divergence is the failure",
    },
    {
      id: "DIR-PROOFS",
      pathRe: /^proofs\//,
      role: "formal_statement",
      rationale: "everything under proofs/ states a theorem",
    },
    {
      id: "DIR-SCRIPTS",
      pathRe: /^scripts\//,
      role: "orchestration",
      rationale: "reproduce and build scripts sequence steps",
    },
    {
      id: "DIR-TESTHELPER",
      pathRe: /^tests\/(unit|e2e)\/llmShield\//,
      role: "evidence_emission",
      rationale:
        "a helper inside a gate file constructs the fixtures and assertions the gate rests on, so it carries the gate's fabrication risk rather than none at all",
    },

    // ---- last resort for R1 code the table did not otherwise claim ----
    {
      id: "ROOT-R1",
      root: "R1",
      role: "schema_gate",
      rationale:
        "an unclaimed member of the attestation tooling is treated as enforcing structure until a narrower rule is written for it; over-obligation is the safe direction",
    },
  ].map(Object.freeze)
);

/** Does one rule match one member? */
function matches(rule, member) {
  if (rule.category && member.category !== rule.category) return false;
  if (rule.root && member.root !== rule.root) return false;
  const path = member.module_path ?? "";
  if (rule.basename) {
    const base = path.slice(path.lastIndexOf("/") + 1);
    if (!rule.basename.test(base)) return false;
  }
  if (rule.pathRe && !rule.pathRe.test(path)) return false;
  return Boolean(rule.category || rule.root || rule.basename || rule.pathRe);
}

/** The FIRST matching rule, or null. */
export function ruleFor(member) {
  for (const rule of ROLE_RULES) {
    if (matches(rule, member)) return rule;
  }
  return null;
}

/**
 * Mechanism 1, mechanised: no pattern rule may assign a zero-obligation role.
 *
 * This is the structural mitigation and it is checked, not merely intended.
 */
export function validateRuleTable(rules) {
  const problems = [];
  const seen = new Set();
  for (const rule of rules) {
    if (ZERO_OBLIGATION_ROLES.includes(rule.role)) {
      problems.push({
        rule_id: rule.id,
        reason:
          `rule assigns the zero-obligation role ${rule.role} by pattern. One regex would remove ` +
          `every matching member from the obligation matrix while every report still read ` +
          `complete. Zero-obligation roles are reachable only through EXACT_ID_ROLE_ASSIGNMENTS.`,
      });
    }
    if (!SECURITY_ROLES.includes(rule.role)) {
      problems.push({ rule_id: rule.id, reason: `unknown role ${rule.role}` });
    }
    if (seen.has(rule.id)) problems.push({ rule_id: rule.id, reason: "duplicate rule id" });
    seen.add(rule.id);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * The generated skeleton entry for one member (`--emit-role-skeleton`).
 *
 * Never hand-authored from nothing (gauntlet P1-13): for ~2,500 members the totality rules are
 * mechanical, and a hand-written file is where an omission hides. Every entry records its `basis`,
 * so a reviewer can see which assignments rest on a census fact, which on a coarse rule, and which
 * on nothing at all.
 */
export function skeletonFor(member) {
  const exact = EXACT_ID_ROLE_ASSIGNMENTS[member.function_id];
  if (exact) {
    return {
      function_id: member.function_id,
      security_role: exact,
      basis: "exact_id",
      needs_review: false,
    };
  }
  const rule = ruleFor(member);
  if (rule) {
    return {
      function_id: member.function_id,
      security_role: rule.role,
      basis: `rule:${rule.id}`,
      needs_review: false,
    };
  }
  // No rule matched. The placeholder is a REAL role so the file stays well-formed, but the entry
  // blocks Task 6 until a human either writes a rule or assigns the member directly.
  return {
    function_id: member.function_id,
    security_role: "completeness_claim",
    basis: "no_rule_matched",
    needs_review: true,
  };
}

/**
 * Assign and check roles.
 *
 * @param {{members: object[], declared: object[], reachability: object|null}} input
 */
export function assignRoles({ members, declared, reachability }) {
  const violations = [];
  const byId = new Map(members.map((m) => [m.function_id, m]));
  const assigned = new Map();
  const seen = new Set();

  for (const d of declared) {
    const id = d.function_id;
    const member = byId.get(id);

    if (!member) {
      violations.push({
        function_id: id,
        declared: d.security_role,
        kind: "unknown_function_id",
        reason: "a role was declared for a member outside the committed closure",
      });
      continue;
    }
    if (seen.has(id)) {
      violations.push({
        function_id: id,
        declared: d.security_role,
        kind: "duplicate_declaration",
        reason:
          "exactly one role per member; a second declaration is a contradiction, not an update",
      });
      continue;
    }
    seen.add(id);

    for (const field of EXCEPTION_FIELDS) {
      if (Object.hasOwn(d, field)) {
        violations.push({
          function_id: id,
          declared: d.security_role,
          kind: "exception_field_prohibited",
          field,
          reason:
            "Q0 admits no exceptions (plan, gauntlet P0-8). This field is refused rather than " +
            "ignored, because an ignored field would let its author believe the violation cleared.",
        });
      }
    }

    if (!SECURITY_ROLES.includes(d.security_role)) {
      violations.push({
        function_id: id,
        declared: d.security_role,
        kind: "unknown_role",
        reason:
          "security_role is a closed vocabulary (spec §2.4); unknown values are never defaulted",
      });
      continue;
    }
    if (d.needs_review === true) {
      violations.push({
        function_id: id,
        declared: d.security_role,
        kind: "needs_review_unresolved",
        basis: d.basis,
        reason: "an unreviewed skeleton entry is not an assignment; Task 6 fails while any remains",
      });
    }
    assigned.set(id, d.security_role);
  }

  for (const m of members) {
    if (!seen.has(m.function_id)) {
      violations.push({
        function_id: m.function_id,
        declared: null,
        kind: "unassigned_member",
        reason: "every committed member carries exactly one role (L1); silence is not a role",
      });
    }
  }

  // ---- Mechanism 2: the graph check. §2.4's named attack. ----
  if (reachability) {
    const trustDecisions = [...assigned.entries()]
      .filter(([, role]) => role === "trust_decision")
      .map(([id]) => id);

    for (const [id, role] of assigned) {
      if (role !== "pure_transform") continue;
      const callers = reachability.transitiveCallersOf(id);
      const attacker = trustDecisions.find((t) => callers.has(t));
      if (!attacker) continue;
      violations.push({
        function_id: id,
        declared: role,
        root: byId.get(id)?.root ?? null,
        kind: "pure_transform_reachable_from_trust_decision",
        path: reachability.pathFrom(attacker, id) ?? [attacker, id],
        reason:
          "a member declared pure_transform is reachable from a trust_decision member. Role is a " +
          "claim about the code and the graph is the code (spec §2.4). Q0 has no exception " +
          "mechanism: fix the role, or the reachability path is the argument that the code is wrong.",
      });
    }
  }

  return { ok: violations.length === 0, assigned, violations };
}

/** Convenience for later tasks: the obligation set for an assignment map. */
export function obligationsFor(assigned) {
  const out = new Map();
  for (const [id, role] of assigned) out.set(id, requiredClasses(role));
  return out;
}

/** Re-exported so callers need not reach into constants for the class list. */
export const ALL_ATTACK_CLASSES = ATTACK_CLASSES;
