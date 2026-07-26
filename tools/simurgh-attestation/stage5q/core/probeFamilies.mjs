// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the generic attack-pack families (Task 14's missing `packs/stage5X/*`).
//
// EVERY FAMILY HERE IS CHOSEN FOR ONE PROPERTY: IT NEEDS NO POSITIVE CONTROL.
//
// The obvious way to attack 1033 targets mechanically is to call each one with malformed input and
// count a throw as a refusal. That is F001 wearing a new hat. A function that throws on EVERYTHING —
// including its own valid input — throws on garbage too, and "it threw" would discharge a cell
// without measuring anything. Establishing a positive control generically means synthesising a
// valid input for a function whose signature nobody recorded, and a synthesised input that fails to
// be accepted is indistinguishable from a function that accepts nothing.
//
// So the families below are the ones whose FINDING CONDITION is observable without ever knowing
// what a valid call looks like:
//
//   frozen-constant       R8   an exported constant that can be mutated is shared mutable state.
//                              Reachable by reading, not by calling. No control needed.
//
//   argument-aliasing     R8   a function that mutates the object it was handed has aliased its
//                              caller's state — and it is still mutation whether the call was
//                              accepted or refused. No control needed.
//
//   prototype-pollution   R1   after the call, Object.prototype must be untouched. A polluted
//                              prototype is global and is a finding regardless of the return value.
//
//   determinism           R15  the same input twice must give the same answer. Two refusals that
//                              disagree are as much a defect as two acceptances that do.
//
//   pathological-operand  R9   deeply nested and very large operands must terminate. A hang or an
//                              unrecoverable crash is a finding; a refusal is a pass; and neither
//                              requires knowing the valid shape.
//
//   fail-open             R16  a structurally impossible input must not produce an ACCEPT-SHAPED
//                              answer. This is the one family that reads the return value, and it
//                              reads it in the safe direction: `null`/`true`/`{ok:true}` for
//                              `undefined` is fail-open no matter what the valid shape is. A throw
//                              or a refusal-shape is NOT counted as a pass here, because that is
//                              where the vacuity would hide — it is counted as ESTABLISHING
//                              NOTHING.
//
// Six families, six classes. The other ten classes are NOT attacked by this pass and their cells
// stay undischarged, which the coverage ledger reports as the number it is. Claiming R3 or R4 from
// a generic probe would be the fake completeness this stage exists to police.

export const PROBE_OUTCOMES = Object.freeze([
  "refused_as_expected",
  "accepted_as_expected",
  "unexpectedly_accepted",
  "unexpectedly_mutated",
  "established_nothing",
  "not_applicable",
  "probe_errored",
]);

/** Outcomes that mean the probe genuinely measured the target and it held. */
export const DISCHARGING_OUTCOMES = Object.freeze(["refused_as_expected", "accepted_as_expected"]);

/** Outcomes that mint a finding. */
export const FINDING_OUTCOMES = Object.freeze(["unexpectedly_accepted", "unexpectedly_mutated"]);

/**
 * Is this return value ACCEPT-shaped?
 *
 * The codebase convention is that a checker returns `null` when nothing is wrong and a raw code or
 * a problem object when something is. So `null` is the most common accept, which is exactly why
 * `undefined` returning `null` is worth catching.
 */
export function isAcceptShaped(value) {
  if (value === null || value === undefined || value === true) return true;
  if (typeof value === "object" && value.ok === true) return true;
  return false;
}

/** Is it REFUSAL-shaped? Deliberately not the negation: many values are neither. */
export function isRefusalShaped(value) {
  if (value === false) return true;
  if (typeof value === "number" && value !== 0) return true;
  if (value && typeof value === "object") {
    if (value.ok === false) return true;
    if (value.refused === true) return true;
    for (const key of ["code", "raw", "reason", "kind", "problems", "refusal_reason"]) {
      if (Object.hasOwn(value, key)) return true;
    }
  }
  return false;
}

/** Structural clone for the before/after comparison, tolerant of things structuredClone refuses. */
function snapshot(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

const result = (outcome, detail, premise, over = {}) => ({ outcome, detail, premise, ...over });

/**
 * The first parameter's NAME, or null when it is destructured, absent or unparseable.
 *
 * A destructured parameter has no name, and destructuring `undefined` throws by construction — so
 * `null` here is the honest answer and the caller must not read it as "no parameter".
 */
export function firstParameterName(source) {
  const text = String(source);
  // `function f(a, b)`, `f(a, b)` (method shorthand), `(a, b) =>`, `a =>`.
  const arrowBare = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/.exec(text);
  if (arrowBare) return arrowBare[1];
  const open = text.indexOf("(");
  if (open === -1) return null;
  let depth = 0;
  let close = -1;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    else if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close === -1) return null;
  const first = text
    .slice(open + 1, close)
    .split(",")[0]
    .trim();
  if (first === "" || first.startsWith("{") || first.startsWith("[") || first.startsWith("..."))
    return null;
  const name = first.split("=")[0].trim();
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : null;
}

/**
 * Does the body supply its own default for that parameter?
 *
 * A HEURISTIC, and it is used in exactly one direction: to WITHDRAW a fail-open finding, never to
 * create one. `function f(spec) { const x = spec ?? readTheRealThing(); }` declares arity 1, so
 * `Function.length` cannot see the default — but `undefined` still means "use the default" and is
 * not a malformed input. Being wrong here can only make this family claim LESS than it might have,
 * which is the correct direction for a heuristic to fail in.
 */
export function suppliesOwnDefault(source, paramName) {
  if (!paramName) return false;
  const p = paramName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`\\b${p}\\s*\\?\\?`),
    new RegExp(`\\b${p}\\s*\\|\\|`),
    new RegExp(`\\b${p}\\s*===?\\s*undefined`),
    new RegExp(`typeof\\s+${p}\\s*===?\\s*["'\`]undefined`),
    new RegExp(`\\bif\\s*\\(\\s*!\\s*${p}\\s*\\)`),
  ];
  return patterns.some((re) => re.test(String(source)));
}

/**
 * A deeply-nested object `depth` levels down, built iteratively.
 *
 * Built with a loop rather than recursion on purpose: a recursive builder would blow the stack
 * inside the PROBE, and the probe crashing is not the target failing.
 */
export function deepNest(depth) {
  let node = { leaf: true };
  for (let i = 0; i < depth; i += 1) node = { next: node };
  return node;
}

export const FAMILIES = Object.freeze([
  {
    family_id: "frozen-constant",
    attack_class: "R8",
    categories: ["exported_constant"],
    intent: "an exported constant that any importer can mutate is shared mutable state",
    /**
     * @param {{value: unknown}} subject
     */
    run({ value }) {
      if (value === null || typeof value !== "object") {
        // A primitive cannot be aliased. Recorded as inapplicable rather than as a pass: it is not
        // that the target withstood the attack, it is that the attack does not reach it.
        return result("not_applicable", `${typeof value} is not aliasable`, {
          value_type: typeof value,
        });
      }
      const unfrozen = [];
      const allPaths = new Set();
      const seen = new Set();
      const walk = (node, path) => {
        if (node === null || typeof node !== "object" || seen.has(node)) return;
        seen.add(node);
        allPaths.add(path);
        if (!Object.isFrozen(node)) unfrozen.push(path);
        for (const key of Object.keys(node)) walk(node[key], `${path}.${key}`);
      };
      walk(value, "$");
      // Shaped for `omitsMember` (spec §4.4). `Object.freeze(X)` is a COMPLETENESS CLAIM about the
      // object graph under X, and a shallow freeze is that claim covering some of its universe.
      // `universe` is every reachable node; `produced` is the frozen ones; the difference is the
      // finding, recomputable by a verifier that never saw the constant.
      const frozenPaths = [...allPaths].filter((p) => !unfrozen.includes(p));
      const premise = {
        is_object: true,
        nodes_walked: seen.size,
        top_level_frozen: Object.isFrozen(value),
        universe: [...allPaths],
        produced: frozenPaths,
      };
      if (unfrozen.length === 0) {
        return result("refused_as_expected", `deeply frozen across ${seen.size} node(s)`, premise);
      }
      return result(
        "unexpectedly_mutated",
        `${unfrozen.length} reachable node(s) are writable: ${unfrozen.slice(0, 3).join(", ")}`,
        premise
      );
    },
  },

  {
    family_id: "argument-aliasing",
    attack_class: "R8",
    categories: ["exported_function"],
    intent: "a function must not mutate the object it was handed, accepted or refused",
    run({ value: fn }) {
      if (typeof fn !== "function") {
        return result("not_applicable", "target is not callable", { callable: false });
      }
      const arg = {
        probe: "5q-aliasing",
        nested: { list: [1, 2, 3], flag: true },
        digest: "a".repeat(64),
      };
      const before = snapshot(arg);
      let threw = null;
      try {
        fn(arg);
      } catch (error) {
        threw = String(error?.message ?? error).slice(0, 120);
      }
      const after = snapshot(arg);
      // THE PREMISE IS THE CALL, NOT THE ACCEPTANCE. The function was invoked with an object it
      // could have mutated; whether it liked the object is beside the point.
      const premise = { invoked: true, threw, argument_snapshotted: before !== null };
      if (before === null) {
        return result("probe_errored", "the argument could not be snapshotted", premise);
      }
      if (before === after) {
        return result(
          "refused_as_expected",
          threw ? "refused without mutating its argument" : "did not mutate its argument",
          premise
        );
      }
      // Shaped for `contradicts`: one subject, two conflicting readings of it, taken either side
      // of a single call. The verifier recomputes the contradiction without ever calling anything.
      return result(
        "unexpectedly_mutated",
        "the caller's object changed during the call",
        {
          ...premise,
          vectors: [
            { subject: "caller_argument", snapshot: before },
            { subject: "caller_argument", snapshot: after },
          ],
        },
        { before, after }
      );
    },
  },

  {
    family_id: "prototype-pollution",
    attack_class: "R1",
    categories: ["exported_function"],
    intent: "a malformed object must not be able to reach Object.prototype",
    run({ value: fn }) {
      if (typeof fn !== "function") {
        return result("not_applicable", "target is not callable", { callable: false });
      }
      // JSON.parse, not a literal: an object literal's `__proto__` sets the prototype instead of
      // creating an own property, so the literal version would hand the function a perfectly
      // ordinary object and prove nothing.
      const payload = JSON.parse('{"__proto__":{"simurgh5qPolluted":"yes"},"a":1}');
      const cleanBefore = {}.simurgh5qPolluted === undefined;
      let threw = null;
      try {
        fn(payload);
      } catch (error) {
        threw = String(error?.message ?? error).slice(0, 120);
      }
      const polluted = {}.simurgh5qPolluted !== undefined;
      if (polluted) delete Object.prototype.simurgh5qPolluted;
      const premise = {
        invoked: true,
        payload_carries_own_proto_key: Object.hasOwn(payload, "__proto__"),
        prototype_clean_before: cleanBefore,
        threw,
      };
      if (!premise.payload_carries_own_proto_key || !cleanBefore) {
        return result("probe_errored", "the payload or the environment was not clean", premise);
      }
      return polluted
        ? result("unexpectedly_accepted", "the call polluted Object.prototype", premise)
        : result("refused_as_expected", "Object.prototype untouched", premise);
    },
  },

  {
    family_id: "determinism",
    attack_class: "R15",
    categories: ["exported_function"],
    intent: "the same input twice must give the same answer, refusal included",
    run({ value: fn }) {
      if (typeof fn !== "function") {
        return result("not_applicable", "target is not callable", { callable: false });
      }
      const call = () => {
        try {
          return { kind: "returned", value: snapshot(fn({ probe: "5q-determinism", n: 1 })) };
        } catch (error) {
          return { kind: "threw", value: String(error?.message ?? error).slice(0, 200) };
        }
      };
      const a = call();
      const b = call();
      const premise = { invoked_twice: true, first: a.kind, second: b.kind };
      if (a.kind !== b.kind || a.value !== b.value) {
        return result(
          "unexpectedly_accepted",
          `two identical calls disagreed: ${a.kind}/${b.kind}`,
          premise,
          { first: String(a.value).slice(0, 120), second: String(b.value).slice(0, 120) }
        );
      }
      return result("accepted_as_expected", `both calls ${a.kind} identically`, premise);
    },
  },

  {
    family_id: "pathological-operand",
    attack_class: "R9",
    categories: ["exported_function"],
    intent: "deeply nested and very large operands must terminate rather than hang or crash",
    run({ value: fn }) {
      if (typeof fn !== "function") {
        return result("not_applicable", "target is not callable", { callable: false });
      }
      const operands = [
        // 50 000, not 5 000. At five thousand a recursive walker returns normally — Node's default
        // stack takes roughly eleven thousand frames — so the "pathological" operand was not
        // pathological, and every R9 cell it discharged was discharged by an operand no deeper than
        // ordinary data. The probe's own unit test is what caught it: a target written to recurse
        // to death walked the whole thing and returned 0.
        { label: "deep_nesting_50000", build: () => deepNest(50_000) },
        { label: "long_string_1mb", build: () => ({ s: "x".repeat(1024 * 1024) }) },
        {
          label: "cyclic",
          build: () => {
            const o = { a: 1 };
            o.self = o;
            return o;
          },
        },
      ];
      const observations = [];
      for (const operand of operands) {
        try {
          fn(operand.build());
          observations.push({ operand: operand.label, outcome: "returned" });
        } catch (error) {
          // A RangeError from the target's own recursion is a real observation, not a probe error:
          // the operand reached a recursive path and exhausted the stack. It terminated, which is
          // what this family asks. It is recorded by name so a reader can tell it apart.
          observations.push({
            operand: operand.label,
            outcome: error instanceof RangeError ? "stack_exhausted" : "threw",
            message: String(error?.message ?? error).slice(0, 90),
          });
        }
      }
      // Reaching here at all IS the result: the call returned control. A hang is caught by the
      // runner's timeout, outside this function, and lands as a finding there.
      return result(
        "refused_as_expected",
        `${observations.length} pathological operands all terminated`,
        { invoked: true, operands_tried: observations.length },
        { observations }
      );
    },
  },

  {
    family_id: "fail-open",
    attack_class: "R16",
    categories: ["exported_function"],
    // ------------------------------------------------------------------------------------------
    // ROLE-GATED, because this family reads a return value AS A VERDICT.
    //
    // That reading is only valid where producing a verdict is the function's job. Run against the
    // canonicalisation role it produced eight identical false findings in one pass:
    // `canonicalJson(undefined)` returns `undefined` — which is what `JSON.stringify(undefined)`
    // does — and the family called it "an accept-shaped value". There is no accept. There is no
    // verdict. A transform that produces no output has not decided anything, and describing it as
    // failing open is a claim about a decision nobody made.
    //
    // `code_allocation` is excluded for the same reason: an allocator returns a code, not a ruling.
    // ------------------------------------------------------------------------------------------
    roles: ["trust_decision", "completeness_claim"],
    intent: "a structurally impossible input must not produce an ACCEPT-shaped answer",
    run({ value: fn }) {
      if (typeof fn !== "function") {
        return result("not_applicable", "target is not callable", { callable: false });
      }

      // ------------------------------------------------------------------------------------
      // `undefined` IS ONLY AN ATTACK AGAINST A FUNCTION WITH A REQUIRED PARAMETER.
      //
      // `Function.length` counts the parameters before the first one carrying a default. At zero,
      // the function either takes no arguments or its first parameter is defaulted — and for a
      // defaulted parameter, passing `undefined` is the DOCUMENTED WAY TO ASK FOR THE DEFAULT, not
      // a malformed input. `measureSection1Census(spec = readTheRealSpec())` returns `{ok: true}`
      // for `undefined` because it measured the real spec, exactly as written.
      //
      // The first version of this family reported that as fail-open. It is the second false
      // finding this family produced in one afternoon, and both came from the same mistake:
      // asserting that an input was impossible without checking whether the function said so.
      // ------------------------------------------------------------------------------------
      const source = fn.toString();
      const paramName = firstParameterName(source);
      const bodyDefault = suppliesOwnDefault(source, paramName);
      if (fn.length === 0 || bodyDefault) {
        return result(
          "established_nothing",
          fn.length === 0
            ? "the first parameter is absent or defaulted, so `undefined` requests the default " +
                "rather than presenting an impossible input"
            : `the body supplies its own default for '${paramName}', so \`undefined\` selects it`,
          {
            callable: true,
            declared_arity: fn.length,
            body_default_for: bodyDefault ? paramName : null,
          }
        );
      }

      // `undefined` is the least valid thing there is. Nothing has this shape.
      let returned;
      let threw = null;
      try {
        returned = fn(undefined);
      } catch (error) {
        threw = String(error?.message ?? error).slice(0, 120);
      }

      // ------------------------------------------------------------------------------------
      // THE ARGUMENT-SENSITIVITY CONTROL, and it caught this family lying on its first run.
      //
      // `measureSection1Census(undefined)` returns `{ …, ok: true }`. So does
      // `measureLaneACensus(undefined)`, and `verifyRekorCeremonyOffline(undefined)`. The first
      // version of this family reported all three as fail-open findings. They are not: those
      // functions IGNORE their argument and read pinned files from disk. They have no input
      // surface, so "a structurally impossible input produced an accept" is a sentence about an
      // input nothing ever read.
      //
      // A false finding is the worst thing this stage can emit — it spends exactly the credibility
      // the whole apparatus exists to build. So the family now proves the return value DEPENDS on
      // the argument before it is allowed to draw a conclusion from one: call again with a
      // structurally different junk value, and if the answer is byte-identical, the argument is
      // not read and this family establishes nothing.
      // ------------------------------------------------------------------------------------
      let second;
      let secondThrew = null;
      try {
        second = fn({ simurgh5qUnrelated: true, n: 987654 });
      } catch (error) {
        secondThrew = String(error?.message ?? error).slice(0, 120);
      }
      const argumentIsRead =
        threw !== secondThrew || snapshot(returned) !== snapshot(second) || threw !== null;

      const premise = {
        invoked_with: "undefined",
        threw,
        returned: snapshot(returned),
        argument_is_read: argumentIsRead,
      };

      if (!argumentIsRead) {
        return result(
          "established_nothing",
          "two structurally different arguments gave a byte-identical answer: the function does " +
            "not read its argument, so it has no input surface for this class",
          premise
        );
      }

      if (threw !== null) {
        // A THROW ESTABLISHES NOTHING HERE, and saying so is the whole reason this family is safe
        // to run without a positive control. A function that throws on every input throws on this
        // one; counting that as a pass is exactly the vacuous discharge F001 is made of.
        return result(
          "established_nothing",
          "threw — which a function that rejects everything also does",
          premise
        );
      }
      if (isAcceptShaped(returned)) {
        return result(
          "unexpectedly_accepted",
          `returned an accept-shaped value (${JSON.stringify(returned)}) for undefined`,
          premise
        );
      }
      if (isRefusalShaped(returned)) {
        return result("refused_as_expected", "returned a refusal shape for undefined", premise);
      }
      return result(
        "established_nothing",
        `returned a value that is neither accept- nor refusal-shaped: ${String(snapshot(returned)).slice(0, 90)}`,
        premise
      );
    },
  },
]);

/**
 * The families that apply to a member, by category AND role.
 *
 * A family with no `roles` key applies to every role — those families measure a property of the
 * call itself (did it mutate its argument, did it pollute the prototype, did it terminate, did it
 * agree with itself) rather than reading the answer, so the member's job does not change what they
 * observe. `roles` is present only where the family interprets the return value.
 */
export function familiesFor(category, role = null) {
  return FAMILIES.filter(
    (f) => f.categories.includes(category) && (!f.roles || !role || f.roles.includes(role))
  );
}

/** The classes this pass can attack at all. Everything else stays undischarged, by design. */
export const ATTACKABLE_CLASSES = Object.freeze([...new Set(FAMILIES.map((f) => f.attack_class))]);

/**
 * Turn a probe outcome into a discharge status, or into nothing.
 *
 * `established_nothing`, `not_applicable` and `probe_errored` all return null. Three different
 * reasons to have learned nothing, none of them a status: a cell nobody measured must look
 * different from a cell that held.
 */
export function dischargeFor(outcome) {
  if (DISCHARGING_OUTCOMES.includes(outcome)) return "attacked_pass";
  if (FINDING_OUTCOMES.includes(outcome)) return "finding_frozen";
  return null;
}
