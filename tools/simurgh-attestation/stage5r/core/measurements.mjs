// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 3 (gate G0): recompute every measurement the spec publishes.
//
// The spec's §1.2 and §7.4 make numeric claims about the predecessor's mutation evidence, and
// 5R-F001 is one of them. A stage whose blade is "one seeded test is not evidence" cannot publish
// figures nobody re-derives, so every number is computed here from the inherited closure, obligation
// matrix and mutation receipts, and then compared against what the document actually says.
//
// The comparison is the half that is easy to get wrong. Checking that a number appears SOMEWHERE in
// the spec is not agreement: a document can contain the right value in one place and a stale one in
// another, and the check would pass on the first match. So every claim is matched by a LABELLED
// pattern, every occurrence of that pattern is collected, and all of them must equal the computed
// value. Zero occurrences is a failure too — a claim the gate cannot find is a claim the gate is not
// checking.
//
// Honest limit, stated rather than implied: this checks labelled occurrences, not every appearance
// of the digits anywhere in the prose. A bare number written in an unlabelled sentence is outside
// the pattern and outside the gate.

/** Round-half-up to one decimal place, in integer arithmetic. */
export function tenths(numerator, denominator) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0) {
    throw new RangeError("tenths: integer numerator and positive integer denominator required");
  }
  return Math.floor((numerator * 1000 + Math.floor(denominator / 2)) / denominator);
}

/** The eleven under-supported classes, frozen by §5.3. */
export const UNDER_SUPPORTED = Object.freeze([
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "R10",
  "R11",
  "R12",
  "R13",
  "R14",
]);

/** The five classes 5Q did attack. */
export const ATTACKED = Object.freeze(["R1", "R8", "R9", "R15", "R16"]);

const byClassNumber = (a, b) => Number(a.slice(1)) - Number(b.slice(1));

/**
 * Recompute every published measurement from the inherited evidence.
 *
 * @param {{closure: object, matrix: object, receipts: object}} evidence parsed JSON
 * @returns {object} the measurement set
 */
export function measure({ closure, matrix, receipts }) {
  const members = Array.isArray(closure) ? closure : (closure.members ?? []);
  const roleOf = new Map(members.map((m) => [m.function_id, m.security_role]));

  const roleHistogram = {};
  for (const m of members) {
    roleHistogram[m.security_role] = (roleHistogram[m.security_role] ?? 0) + 1;
  }

  const obligatedByClassRole = {};
  const pairs = new Set();
  let obligatedTotal = 0;
  for (const cell of matrix.cells) {
    if (cell.applicability !== "obligated") continue;
    obligatedTotal += 1;
    const role = roleOf.get(cell.function_id) ?? "UNKNOWN";
    obligatedByClassRole[cell.attack_class] ??= {};
    obligatedByClassRole[cell.attack_class][role] =
      (obligatedByClassRole[cell.attack_class][role] ?? 0) + 1;
    pairs.add(`${cell.attack_class}|${role}`);
  }
  const classTotal = (c) => Object.values(obligatedByClassRole[c] ?? {}).reduce((a, b) => a + b, 0);

  const discharged = new Set(receipts.classes_discharged ?? []);
  const cellIndex = new Map(matrix.cells.map((c) => [`${c.function_id}|${c.attack_class}`, c]));

  // Mutation reach, at both strengths: any mutant, and mutants whose class was actually discharged.
  const rolesReachedAny = new Set();
  const rolesReachedDischarged = new Set();
  let testedCells = 0;
  let dischargedClassCells = 0;
  let receiptsOnOmitted = 0;
  for (const r of receipts.receipts ?? []) {
    const role = roleOf.get(r.target_function_id);
    rolesReachedAny.add(role);
    const cell = cellIndex.get(`${r.target_function_id}|${r.attack_class}`);
    if (cell && cell.applicability !== "obligated") receiptsOnOmitted += 1;
    if (!discharged.has(r.attack_class)) continue;
    rolesReachedDischarged.add(role);
    testedCells += obligatedByClassRole[r.attack_class]?.[role] ?? 0;
    dischargedClassCells += classTotal(r.attack_class);
  }

  // The four populated roles no mutant reached, and what was nonetheless discharged over them.
  const classesByRole = {};
  for (const cell of matrix.cells) {
    if (cell.applicability !== "obligated") continue;
    const role = roleOf.get(cell.function_id) ?? "UNKNOWN";
    (classesByRole[role] ??= new Set()).add(cell.attack_class);
  }
  const unreached = {};
  let unreachedMembers = 0;
  let unreachedObligations = 0;
  let unreachedDischarged = 0;
  for (const role of Object.keys(roleHistogram)) {
    if (rolesReachedAny.has(role)) continue;
    const classes = [...(classesByRole[role] ?? [])].sort(byClassNumber);
    const yes = classes.filter((c) => discharged.has(c));
    unreached[role] = { members: roleHistogram[role], classes, discharged: yes };
    unreachedMembers += roleHistogram[role];
    unreachedObligations += classes.length;
    unreachedDischarged += yes.length;
  }

  const underSupportedCells = UNDER_SUPPORTED.reduce((a, c) => a + classTotal(c), 0);
  const attackedCells = ATTACKED.reduce((a, c) => a + classTotal(c), 0);
  const universePairs = [...pairs].filter((p) => UNDER_SUPPORTED.includes(p.split("|")[0]));
  const universeRoles = new Set(universePairs.map((p) => p.split("|")[1]));

  return {
    member_count: members.length,
    role_histogram: roleHistogram,
    populated_roles: Object.keys(roleHistogram).length,
    obligated_cells: obligatedTotal,
    under_supported_cells: underSupportedCells,
    attacked_cells: attackedCells,
    class_totals: Object.fromEntries(
      Object.keys(obligatedByClassRole)
        .sort(byClassNumber)
        .map((c) => [c, classTotal(c)])
    ),
    obligated_by_class_role: obligatedByClassRole,
    classes_discharged: [...discharged].sort(byClassNumber),
    mutation_tested_cells: testedCells,
    discharged_class_cells: dischargedClassCells,
    mutation_tested_tenths: tenths(testedCells, dischargedClassCells),
    receipts_on_omitted: receiptsOnOmitted,
    roles_reached_any: [...rolesReachedAny].sort(),
    roles_reached_discharged: [...rolesReachedDischarged].sort(),
    unreached_roles: unreached,
    unreached_members: unreachedMembers,
    unreached_obligations: unreachedObligations,
    unreached_obligations_discharged: unreachedDischarged,
    family_universe_pairs: universePairs.length,
    family_universe_roles: [...universeRoles].sort(),
    a8_formal_statement_cells:
      (roleHistogram.formal_statement ?? 0) * (classesByRole.formal_statement?.size ?? 0),
  };
}

/** Strip the separators the spec uses inside numbers: `15 301` and `15,301` are one token. */
export function normaliseNumbers(text) {
  let out = String(text);
  for (let i = 0; i < 4; i += 1) out = out.replace(/(\d)[  ,](\d)/g, "$1$2");
  return out;
}

/**
 * The labelled claims the spec makes, each with the measurement that must equal every occurrence.
 *
 * @param {object} m output of measure()
 * @returns {Array<{id: string, pattern: RegExp, expected: string}>}
 */
export function claims(m) {
  return [
    { id: "member_count", pattern: /member_count\s+(\d+)/g, expected: String(m.member_count) },
    {
      id: "mutation_tested_cells",
      pattern: /cells lying in the role a mutant actually tested\s+(\d+)/g,
      expected: String(m.mutation_tested_cells),
    },
    {
      id: "discharged_class_cells",
      pattern: /cells in those fourteen classes\s+(\d+)/g,
      expected: String(m.discharged_class_cells),
    },
    {
      id: "mutation_tested_percent",
      pattern: /fraction of the discharged area mutation-tested\s+([\d.]+)%/g,
      expected: (m.mutation_tested_tenths / 10).toFixed(1),
    },
    {
      id: "under_supported_cells",
      pattern: /obligation matrix;\s*(\d+) of the (?:\d+) obligated cells/g,
      expected: String(m.under_supported_cells),
    },
    {
      id: "obligated_cells",
      pattern: /obligation matrix;\s*(?:\d+) of the (\d+) obligated cells/g,
      expected: String(m.obligated_cells),
    },
    {
      id: "attacked_cells",
      pattern: /—\s*total\s*\n?\s*(\d+) cells and are \*\*not\*\*/g,
      expected: String(m.attacked_cells),
    },
    {
      id: "family_universe_pairs",
      pattern: /yields \*\*(\d+) families\*\*/g,
      expected: String(m.family_universe_pairs),
    },
    {
      id: "a8_cells",
      pattern: /for \*\*(\d+) inherited cells\*\*/g,
      expected: String(m.a8_formal_statement_cells),
    },
    {
      id: "unreached_members",
      pattern: /—\s*(\d+) closure members\s*—/g,
      expected: String(m.unreached_members),
    },
    {
      id: "unreached_obligations",
      pattern: /carry \*\*(\d+)\*\* \(role, class\) obligations/g,
      expected: String(m.unreached_obligations),
    },
    {
      id: "unreached_discharged",
      pattern: /and \*\*(\d+)\*\* were discharged class-wide/g,
      expected: String(m.unreached_obligations_discharged),
    },
    {
      id: "receipts_on_omitted",
      pattern: /\*\*And (six) mutants were seeded into cells the matrix marks `omitted`/g,
      expected: m.receipts_on_omitted === 6 ? "six" : String(m.receipts_on_omitted),
    },
  ];
}

/**
 * Check every labelled claim against the recomputed measurements.
 *
 * @param {string} specText
 * @param {object} m output of measure()
 * @returns {{ok: boolean, results: Array<object>, failures: Array<object>}}
 */
export function checkSpecClaims(specText, m) {
  const text = normaliseNumbers(specText);
  const results = [];
  const failures = [];
  for (const claim of claims(m)) {
    const found = [...text.matchAll(claim.pattern)].map((x) => x[1]);
    if (found.length === 0) {
      const r = { id: claim.id, ok: false, reason: "no labelled occurrence found in the spec" };
      results.push(r);
      failures.push(r);
      continue;
    }
    const wrong = found.filter((v) => v !== claim.expected);
    if (wrong.length > 0) {
      const r = {
        id: claim.id,
        ok: false,
        reason: `spec says ${[...new Set(found)].join(", ")}; evidence says ${claim.expected}`,
      };
      results.push(r);
      failures.push(r);
      continue;
    }
    results.push({ id: claim.id, ok: true, occurrences: found.length, value: claim.expected });
  }
  return { ok: failures.length === 0, results, failures };
}
