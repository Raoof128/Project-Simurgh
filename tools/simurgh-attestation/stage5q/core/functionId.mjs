// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — member identity (spec §2.5, gauntlet P1-4, second gauntlet B3).
//
//     function_id = "<stage_id>:<module_path>:<symbol>"
//
// THE STABILITY CLAIM, STATED EXACTLY AS STRONGLY AS IT IS TRUE:
//
//   `function_id` is stable across source-body edits and reformatting WHILE the stage, module path
//   and symbol remain unchanged. A path move or symbol rename creates a NEW function id. A
//   succession hint may relate the two but never transfers identity automatically.
//
// Claiming more than that would be a false completeness claim inside a stage about false
// completeness claims.
//
// The symbol is a QUALIFIED path, not a bare name, because bare names collide: two nested helpers
// called `check`, two classes with a `verify` method, three anonymous callbacks. A colliding id
// silently merges two members into one, which shrinks the universe without anyone noticing.

/** Separator. A module path containing this character would make the id ambiguous, so it is barred. */
const SEP = ":";

/** The file itself, as a member. Annex A1's R8 admits files that contain no callable exports. */
export const FILE_GATE_SYMBOL = "<file-gate>";

/**
 * Build a qualified symbol.
 *
 *   foo                        top-level
 *   Klass#method               instance method
 *   Klass.staticMethod         static method
 *   obj.key                    object-literal property
 *   outer>inner                nested function
 *   default                    default export
 *   reject@S2.C3/outcome       verifier branch, keyed by its two string arguments
 *   <anon@L120C7>              anonymous, keyed by 1-based line/column
 *   <file-gate>                the file itself
 */
export const symbol = Object.freeze({
  top: (name) => name,
  instanceMethod: (klass, name) => `${klass}#${name}`,
  staticMethod: (klass, name) => `${klass}.${name}`,
  property: (obj, key) => `${obj}.${key}`,
  nested: (outer, inner) => `${outer}>${inner}`,
  default: () => "default",
  // ORDINAL IS MANDATORY, not optional. Running the census against the live repo proved that the
  // same (check_id, outcome) pair fires at MULTIPLE distinct sites — stage5p/section2Verifier.mjs
  // has three `reject("S2.C2","resolver_binding_invalid", ...)` calls with different reasons. That
  // is 5P's own "nine codes, eleven emission sites" finding biting this grammar: keying a branch by
  // the pair alone silently merged three targets into one, which is exactly the universe-shrinking
  // collision `makeFunctionId` refuses elsewhere.
  //
  // The ordinal is ALWAYS present, including #1, so appending a later site does not renumber
  // earlier ones. Honest cost, same class as anonymous units: inserting a site ABOVE an existing
  // one with the same pair shifts the ordinals below it.
  verifierBranch: (checkId, outcome, ordinal) => {
    if (!Number.isInteger(ordinal) || ordinal < 1) {
      throw new Error("verifier branch symbols require a 1-based ordinal; the pair alone collides");
    }
    return `reject@${checkId}/${outcome}#${ordinal}`;
  },
  anonymous: (line, column) => `<anon@L${line}C${column}>`,
  fileGate: () => FILE_GATE_SYMBOL,
});

/**
 * @param {{stageId: string, modulePath: string, symbol: string}} parts
 * @returns {string}
 */
export function makeFunctionId({ stageId, modulePath, symbol: sym }) {
  if (!stageId || !modulePath || !sym) {
    throw new Error("function id: stageId, modulePath and symbol are all required");
  }
  if (String(modulePath).includes(SEP)) {
    // Rejected rather than escaped: an ambiguous id is worse than a refused one, because the
    // ambiguity only surfaces when two members happen to collide.
    throw new Error(`function id: module path must not contain '${SEP}': ${modulePath}`);
  }
  if (String(stageId).includes(SEP)) {
    throw new Error(`function id: stage id must not contain '${SEP}': ${stageId}`);
  }
  return `${stageId}${SEP}${modulePath}${SEP}${sym}`;
}

/**
 * Parse an id back into parts.
 *
 * The symbol may itself contain `:` (a verifier branch keyed on a check id could), so the split is
 * bounded to the first two separators rather than being greedy.
 */
export function parseFunctionId(id) {
  const first = id.indexOf(SEP);
  const second = id.indexOf(SEP, first + 1);
  if (first === -1 || second === -1) {
    throw new Error(`function id: malformed, expected stage:path:symbol — got ${id}`);
  }
  return {
    stageId: id.slice(0, first),
    modulePath: id.slice(first + 1, second),
    symbol: id.slice(second + 1),
  };
}

/** True when the symbol is positionally keyed and therefore a poor finding anchor. */
export function isPositionallyKeyed(sym) {
  return /^<anon@L\d+C\d+>$/.test(sym);
}
