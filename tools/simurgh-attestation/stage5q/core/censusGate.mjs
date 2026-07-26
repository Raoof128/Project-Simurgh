// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the gate census (spec §2.8). This is where F001 becomes mechanical.
//
// Every gate that asserts a completeness fact is classified. THREE values, not two (gauntlet
// P1-11, P2-6): calling an unrecognised gate `manually_enumerated` because no `find` token appeared
// is a guess wearing an enum. `unclassifiable` is a census FAILURE that blocks Task 8 until a human
// classifies it.
//
// A `manually_enumerated` gate carries a drift check, and drift needs a declared UNIVERSE QUERY
// (gauntlet P1-12): a short list may be intentionally partial, and a checker cannot know what is
// missing without being told what the whole is. The query is committed and reviewable, because a
// drift check whose universe is chosen after the fact can be tuned to report zero drift.

export const ENUMERATION_STYLES = Object.freeze([
  "self_extending",
  "manually_enumerated",
  "unclassifiable",
]);

/** Tokens that make a step self-extending: it discovers its inputs rather than naming them. */
const DISCOVERY_TOKENS = [/\bfind\b/, /\bgit ls-files\b/, /\bglob\b/, /\*\.[a-z]+/];

/** A step that names concrete artifacts is manually enumerated. */
const NAMED_ARTIFACT = /\b[\w./-]+\.(lean|test\.js|mjs|py|sh)\b/g;

/**
 * Does this step assert a COMPLETENESS fact over a set?
 *
 * Running the live census showed the classifier over-triggering: `npm ci`, `cargo fmt` and
 * `apt-get install` were all landing as `unclassifiable`, which would have made 13 setup steps into
 * precommit_blockers. They are not gates at all — they claim nothing about a set — and forcing them
 * through a completeness enum would train everyone to wave `unclassifiable` through, which is worse
 * than not classifying them.
 *
 * §2.8 is about gates that assert completeness. A step that verifies, tests, proves, counts or
 * enumerates is in scope; a step that installs or configures is not.
 */
export function assertsCompleteness(run) {
  if (typeof run !== "string") return false;
  const VERBS = /\b(lean|node --test|npm (run )?test|check-e2e|census|verify|reproduce|find\b)/;
  const SETUP =
    /^\s*(npm ci|npm install|pip install|apt-get|cargo (fmt|clippy|build)|curl |sh elan|echo )/m;
  if (SETUP.test(run) && !VERBS.test(run)) return false;
  return VERBS.test(run);
}

/**
 * Classify one gate step.
 *
 * @param {{gate_id: string, source: string, run: string, universe_query?: string}} step
 */
export function classifyStep(step) {
  const run = step.run ?? "";
  if (typeof run !== "string" || run.trim() === "") {
    return { ...step, enumeration_style: "unclassifiable", reason: "empty or non-string run body" };
  }

  const named = [...run.matchAll(NAMED_ARTIFACT)].map((m) => m[0]);
  const discovers = DISCOVERY_TOKENS.some((t) => t.test(run));

  if (discovers && named.length === 0) {
    return { ...step, enumeration_style: "self_extending", enumerated_items: [] };
  }
  if (named.length > 0) {
    // Naming artifacts is the F001 shape, whether or not a discovery token also appears: a `find`
    // beside a hand-written list does not make the list self-extending.
    return { ...step, enumeration_style: "manually_enumerated", enumerated_items: named };
  }
  // No discovery token AND no named artifact: we genuinely do not know what this step enumerates.
  // Guessing here is how a latent vacuous-green gets a clean bill of health.
  return {
    ...step,
    enumeration_style: "unclassifiable",
    reason: "no discovery token and no named artifact — a human must classify this step",
  };
}

/**
 * Drift for a manually-enumerated gate.
 *
 * Returns the omitted NAMES, not a boolean: "there is drift" is not actionable, and a checker that
 * cannot say what is missing has told you almost nothing.
 */
export function driftFor({ enumerated_items, universe_items }) {
  const enumerated = new Set(enumerated_items ?? []);
  const universe = universe_items ?? [];
  const difference = universe.filter((u) => !enumerated.has(u) && !hasSuffixIn(u, enumerated));
  return {
    enumerated_count: enumerated.size,
    universe_count: universe.length,
    difference,
    drifted: difference.length > 0,
  };
}

/** A workflow may name `proofs/x/Y.lean` while the universe walk yields the same path. */
function hasSuffixIn(candidate, set) {
  for (const s of set) {
    if (candidate.endsWith(s) || s.endsWith(candidate)) return true;
  }
  return false;
}

/**
 * Build the gate census.
 *
 * A `manually_enumerated` gate WITHOUT a committed `universe_query` is itself unclassifiable: we
 * cannot check its drift, so we cannot claim it is sound.
 */
export function gateCensus({ steps }) {
  // Only completeness-asserting steps are gates. The rest are recorded as out-of-scope rather than
  // being forced through an enum that does not describe them.
  const inScope = steps.filter((s) => assertsCompleteness(s.run));
  const outOfScope = steps.filter((s) => !assertsCompleteness(s.run));
  const gates = inScope.map(classifyStep);
  const problems = [];
  for (const g of gates) {
    if (g.enumeration_style === "unclassifiable") {
      problems.push({ gate_id: g.gate_id, reason: g.reason ?? "unclassifiable" });
    }
    if (g.enumeration_style === "manually_enumerated" && !g.universe_query) {
      problems.push({
        gate_id: g.gate_id,
        reason:
          "a manually enumerated gate must carry a committed universe_query, or its drift cannot " +
          "be checked and its completeness cannot be claimed",
      });
    }
  }
  const counts = { not_a_completeness_gate: outOfScope.length };
  for (const g of gates) counts[g.enumeration_style] = (counts[g.enumeration_style] ?? 0) + 1;
  return { gates, outOfScope, problems, counts, ok: problems.length === 0 };
}
