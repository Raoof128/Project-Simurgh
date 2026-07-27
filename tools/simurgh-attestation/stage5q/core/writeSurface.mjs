// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — Task 1.2 — the Q0 write-surface verifier.
//
// Spec §6.1 declares the Q0 write surface exhaustive. This module enforces it. Without enforcement
// the declaration is a comment, and Matrix 1's claim of a "pre-commit path guard" was a false
// completeness claim in the coverage matrix of a stage about false completeness claims.
//
// TWO LEVELS OF CHECK, because paths alone are not enough (second gauntlet B1):
//
//   checkPaths()                 is this path writable at all?
//   checkPackageJsonMutation()   package.json is path-permitted, but only for its `scripts` key
//                                and ONE pinned devDependency. Without this, "I only touched
//                                package.json" would cover swapping a crypto library.
//
// The verifier is pure: it takes paths and objects, never reads git or the filesystem. The driver
// in node/checkWriteSurface.mjs does the I/O. That keeps the rule unit-testable and keeps the
// module inside 5Q's own deterministic parity surface.

/** The pinned parser. Its exact version enters the closure as an `imported_dependency`. */
export const PINNED_DEV_DEPENDENCY = Object.freeze({ name: "acorn", version: "8.17.0" });

/** The single CI file 5Q may add (spec §14.3). */
export const PERMITTED_WORKFLOW = ".github/workflows/stage-5q-checks.yml";

/** The two named 5Q scripts (spec §6.1, second gauntlet P0-14). */
export const PERMITTED_SCRIPTS = Object.freeze([
  "scripts/check-stage5q-proofs.sh",
  "scripts/reproduce-llm-shield-stage5q.sh",
]);

/**
 * The exhaustive Q0 write surface, verbatim from spec §6.1.
 *
 * `mutation` records what may change at that path, so the allowlist scopes edits rather than merely
 * permitting files.
 */
export const Q0_WRITE_ALLOWLIST = Object.freeze(
  [
    { match: /^tools\/simurgh-attestation\/stage5q\//, mutation: "any" },
    { match: /^tests\/(unit|e2e)\/llmShield\/stage5q\//, mutation: "any" },
    { match: /^proofs\/stage5q\//, mutation: "any" },
    { match: /^docs\/research\/llm-shield\/evidence\/stage-5q\//, mutation: "any" },
    { match: /^docs\/superpowers\/(specs|plans)\/2026-07-26-stage-5q-/, mutation: "any" },
    { match: /^scripts\/check-stage5q-proofs\.sh$/, mutation: "any" },
    { match: /^scripts\/reproduce-llm-shield-stage5q\.sh$/, mutation: "any" },
    // NAMED IN §6.1 BEFORE THE FILE EXISTED. That ordering is the whole difference between this
    // entry and the one unrepaired violation this stage carries: the 5P raw-code census test was
    // widened first and named afterwards, which L5 forbids, so it stays a declared violation
    // instead of becoming retroactively legal. Same rule, both directions, both visible.
    { match: /^docs\/research\/llm-shield\/STAGE_5Q_CLOSEOUT\.md$/, mutation: "any" },
    { match: /^\.github\/workflows\/stage-5q-checks\.yml$/, mutation: "any" },
    { match: /^package\.json$/, mutation: "scripts-and-pinned-dep" },
    { match: /^package-lock\.json$/, mutation: "pinned-dep-delta" },
    { match: /^\.prettierignore$/, mutation: "additive-stage5q-lines" },
  ].map(Object.freeze)
);

/**
 * The unrepaired §6.1 violations Stage 5Q carries, declared ONCE and by PATH.
 *
 * `tests/unit/llmShield/stage5p/rawCodeCensus.test.js` was widened by two lines so the 5Q spec and
 * plan may cite raw code 474 when stating where 5P's band closed — the case 5P's own ruling names
 * ("widen the approved list, never weaken the band regex"). It was widened FIRST and named
 * AFTERWARDS, which is the ordering L5 forbids, so amending §6.1 to legalise it is not available.
 * It stays a declared violation.
 *
 * DECLARED BY SET, NEVER BY COUNT. A count lets a second violation hide behind a repaired first
 * one. And declared HERE rather than in the workflow, so the CI gate names no individual file:
 * a 5Q gate that enumerated its own exceptions would be F001 one level down, inside the stage that
 * froze F001 as evidence.
 */
export const DECLARED_VIOLATIONS = Object.freeze([
  "tests/unit/llmShield/stage5p/rawCodeCensus.test.js",
]);

/**
 * Compare an observed violation set against the declaration.
 *
 * Returns `undeclared` (new violations — a failure) and `repaired` (declared ones that no longer
 * occur — reported, because a declaration that outlives its violation is stale).
 */
export function compareToDeclared(violationPaths) {
  const observed = [...new Set(violationPaths)].sort();
  const undeclared = observed.filter((p) => !DECLARED_VIOLATIONS.includes(p));
  const repaired = DECLARED_VIOLATIONS.filter((p) => !observed.includes(p));
  return { ok: undeclared.length === 0, observed, undeclared, repaired };
}

/** Paths that must produce a SPECIFIC reason, because a generic refusal would under-explain. */
const NAMED_REFUSALS = Object.freeze([
  {
    match: /^\.github\/workflows\/stage-4-lean-proofs\.yml$/,
    reason:
      "this workflow is F001's live premise and is frozen evidence during Q0 (spec §14.2) — " +
      "repairing it is Q1's job, and editing it now destroys the finding it demonstrates",
  },
  {
    match: /^tools\/simurgh-attestation\/stage5[a-p]\//,
    reason:
      "attacked stage code is read-only during Q0 and is inside the committed closure (spec §6.1) — " +
      "a campaign that can edit its own target measures nothing",
  },
  {
    match: /^tests\/unit\/llmShield\/stage5[a-p]\//,
    reason: "stage-5 unit gates are closure members under Annex A1 root R8 and are read-only",
  },
  {
    match: /^proofs\/stage5[a-p]\//,
    reason: "prior-stage proofs are closure members and are read-only during Q0",
  },
  {
    match: /^scripts\/reproduce-llm-shield-stage5[a-p]\.sh$/,
    reason: "prior-stage reproduce scripts are closure members and are read-only during Q0",
  },
  {
    match: /^\.github\/workflows\//,
    reason:
      "workflows are closure members (root R5); only stage-5q-checks.yml may be added, and its " +
      "shape is frozen before L2",
  },
]);

/**
 * Check a set of changed repo-relative paths against the Q0 write surface.
 *
 * @param {string[]} changedPaths POSIX-separated, repo-relative
 * @returns {{ ok: boolean, checked: number, violations: Array<{path: string, reason: string}> }}
 */
export function checkPaths(changedPaths) {
  if (!Array.isArray(changedPaths)) {
    throw new TypeError("write surface: changedPaths must be an array");
  }
  const violations = [];
  for (const raw of changedPaths) {
    const path = String(raw).split("\\").join("/");
    if (Q0_WRITE_ALLOWLIST.some((e) => e.match.test(path))) continue;

    const named = NAMED_REFUSALS.find((n) => n.match.test(path));
    violations.push({
      path,
      reason: named
        ? named.reason
        : "outside the exhaustive Q0 write surface declared in spec §6.1 — if this path is " +
          "genuinely needed, name it in the spec first; 'obviously intended' is not a permission",
    });
  }
  // `checked` is reported so that ok===true over an empty set is never mistaken for a guard that
  // did not run. A verifier that cannot say how much it examined has told you nothing.
  return { ok: violations.length === 0, checked: changedPaths.length, violations };
}

const depSections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

/**
 * Check that a package.json edit stayed inside its permitted mutation.
 *
 * Permitted: adding/updating entries under `scripts`, and adding exactly the pinned devDependency.
 * Refused: removing a script, any other dependency add/remove/change, and the pinned dependency at
 * any version other than the exact pin — a range is not a pin, and the parser's version is committed
 * into the closure.
 *
 * @param {object} before parsed package.json before the edit
 * @param {object} after  parsed package.json after the edit
 */
export function checkPackageJsonMutation(before, after) {
  const violations = [];
  // PARSED OBJECTS, AND A STRING IS REFUSED RATHER THAN COERCED. Handed the raw JSON text, every
  // lookup below reads `undefined` off a string, every section compares empty-to-empty, and the
  // checker returns `{ok: true}` for a package.json that added an arbitrary dependency. A gate that
  // answers "nothing wrong" when it was given the wrong type is a gate that fails open, which is
  // the R16 class this stage attacks in other people's code. Found by K7-A's adapter.
  for (const [label, value] of [
    ["before", before],
    ["after", after],
  ]) {
    if (typeof value === "string") {
      throw new TypeError(
        `checkPackageJsonMutation: ${label} must be the PARSED package.json, not its text — ` +
          "a string silently compares as empty and the check returns ok"
      );
    }
  }
  const b = before ?? {};
  const a = after ?? {};

  // scripts may gain or change entries, but never lose one.
  const bScripts = b.scripts ?? {};
  const aScripts = a.scripts ?? {};
  for (const key of Object.keys(bScripts)) {
    if (!Object.hasOwn(aScripts, key)) {
      violations.push({
        path: `package.json:scripts.${key}`,
        reason: "an existing script was removed",
      });
    }
  }

  // dependency sections may differ by exactly the pinned devDependency, and nothing else.
  for (const section of depSections) {
    const bs = b[section] ?? {};
    const as = a[section] ?? {};
    const keys = new Set([...Object.keys(bs), ...Object.keys(as)]);
    for (const key of keys) {
      if (bs[key] === as[key]) continue;

      const isPinnedAddition =
        section === "devDependencies" &&
        key === PINNED_DEV_DEPENDENCY.name &&
        bs[key] === undefined &&
        as[key] === PINNED_DEV_DEPENDENCY.version;

      if (isPinnedAddition) continue;

      violations.push({
        path: `package.json:${section}.${key}`,
        reason:
          key === PINNED_DEV_DEPENDENCY.name
            ? `the parser must be pinned EXACTLY at ${PINNED_DEV_DEPENDENCY.version}; a range is ` +
              "not a pin, and this version is committed into the closure"
            : "package.json is permitted only for its scripts key and the one pinned devDependency",
      });
    }
  }

  return { ok: violations.length === 0, violations };
}
