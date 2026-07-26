// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the obligation ledger, member × class (Annex A4).
//
// THE DEFECT THIS CLOSES (external gauntlet P0-5, and the most consequential of the four).
//
// The role matrix (§2.4) creates obligations per member PER CLASS, but the design recorded only
// member-level statuses and tray-level class lists. Nothing prevented one R3 pack against one
// function from discharging R3 for EVERY R3-obligated function in that tray — and nothing would
// have looked wrong. The tray report would read complete, the coverage ledger would read complete,
// every member status would be populated. A false completeness claim at exactly the granularity
// this stage exists to police.
//
// So obligations become first-class and are keyed at the CELL.
//
// THE MATRIX IS THE FULL CROSS PRODUCT. Every member is crossed with all sixteen classes, and every
// cell is explicitly `obligated` or `omitted` with a reason from the frozen six. Emitting only the
// obligated cells would make omission invisible — the absent cell and the never-considered cell
// would look identical, which is R7 (selective omission) committed by the ledger that exists to
// detect it.
//
// PACK IDS ARE DELIBERATELY ABSENT (second gauntlet B6). Pack schemas arrive in Task 9, detector
// packs in Task 12, tray and campaign packs in Tasks 14-18 — all AFTER L2. Committing pack ids here
// would either freeze empty assignments or let the supposedly immutable matrix change after the
// universe froze. The matrix commits WHAT MUST BE ATTACKED; the Task 19 overlay records WHAT
// ATTACKED IT. Those are facts from different times and they are stored apart.

import { createHash } from "node:crypto";
import { ATTACK_CLASSES, OMISSION_REASONS, SECURITY_ROLES } from "./constants.mjs";
import { requiredClasses } from "./roleAssignment.mjs";

export const OBLIGATION_DOMAIN = "simurgh.vsr.obligation.v1";
export const OBLIGATION_ROOT_DOMAIN = "simurgh.vsr.obligation-matrix.v1";

export const APPLICABILITY = Object.freeze(["obligated", "omitted"]);

/**
 * `obligation_id = SHA256( UTF8(domain) || 0x00 || function_id || 0x00 || attack_class )`
 *
 * The 0x00 separators are not decoration. Without them `("ab","c")` and `("a","bc")` hash the same
 * concatenation, and two different obligations would share one id — after which discharging either
 * would discharge both. A test asserts exactly that pair.
 */
export function obligationId({ functionId, attackClass }) {
  if (typeof functionId !== "string" || functionId.length === 0) {
    throw new Error("obligationId requires a function_id");
  }
  if (!ATTACK_CLASSES.includes(attackClass)) {
    throw new Error(
      `unknown attack_class ${JSON.stringify(attackClass)} — the taxonomy is frozen (spec §4.1)`
    );
  }
  return createHash("sha256")
    .update(Buffer.from(OBLIGATION_DOMAIN, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(functionId, "utf8"))
    .update(Buffer.from([0x00]))
    .update(Buffer.from(attackClass, "utf8"))
    .digest("hex");
}

/**
 * Why a class does not apply to a role — mechanical, from the §4.2 frozen six.
 *
 * Every omission in this stage carries a mechanical reason, never free text. Free text is where
 * "not relevant here" goes to hide, and a reason a reviewer cannot check is not a reason.
 *
 * The general rule first, then the per-class refinements that are actually true rather than merely
 * convenient.
 */
export function omissionReasonFor(role, attackClass) {
  // The two zero-obligation roles. `pure_transform` discharges by delegation (§2.4) — it is
  // reachable only from members that DO carry the obligation, and Task 6 fails closed if such a
  // member sits under a trust_decision. `imported_dependency` is the R7 boundary: it is recorded in
  // the closure, and attacking a third-party library is a different project.
  if (role === "pure_transform") return "delegated";
  if (role === "imported_dependency") return "no_trust_decision";

  // Class-specific truths that hold for any role that was not given the class.
  switch (attackClass) {
    case "R11": // cross-runtime disagreement
      // A member with no second runtime cannot disagree with one. Only parity_mirror carries R11,
      // and it carries it precisely because it HAS a second runtime.
      return "single_runtime";
    case "R12": // historical downgrade
      return "not_in_historical_closure";
    case "R8": // state aliasing, mutation-after-validation, partial commit
      return "no_persistent_state";
    case "R4": // signature, key-swap, trust-root substitution
    case "R13": // authority laundering
      return "no_trust_decision";
    case "R1": // exact-key / type confusion / malformed object
    case "R2": // unicode and canonicalisation laundering
    case "R9": // oversized operands, pathological recursion
      return "no_such_input_surface";
    default:
      // R3, R5, R6, R7, R10, R14, R15, R16 for a role that was not given them: the member makes no
      // trust decision the class could subvert. Stated as the reason it actually is, not as a
      // catch-all word.
      return "no_trust_decision";
  }
}

/**
 * Build the obligation matrix.
 *
 * @param {{ members: Array<{function_id: string}>, roles: Map<string,string>|object }} input
 */
export function generateObligations({ members, roles, taxonomy = ATTACK_CLASSES }) {
  const roleOf = roles instanceof Map ? (id) => roles.get(id) : (id) => roles[id];
  const cells = [];
  const problems = [];
  const ids = new Set(members.map((m) => m.function_id));

  for (const member of members) {
    const role = roleOf(member.function_id);
    if (!SECURITY_ROLES.includes(role)) {
      problems.push({
        function_id: member.function_id,
        kind: "unknown_role",
        reason: "every closure member carries exactly one frozen role before the matrix is built",
      });
      continue;
    }
    const obligated = new Set(requiredClasses(role));
    for (const attackClass of taxonomy) {
      const isObligated = obligated.has(attackClass);
      cells.push({
        obligation_id: obligationId({ functionId: member.function_id, attackClass }),
        function_id: member.function_id,
        attack_class: attackClass,
        applicability: isObligated ? "obligated" : "omitted",
        omission_reason: isObligated ? null : omissionReasonFor(role, attackClass),
      });
    }
  }

  problems.push(...validateCells(cells, ids));

  // Canonical order before the root, so the root is a fact about the CONTENT and not about the
  // order members happened to be walked in.
  cells.sort((a, b) => a.obligation_id.localeCompare(b.obligation_id));
  const duplicate = firstDuplicate(cells.map((c) => c.obligation_id));
  if (duplicate) {
    problems.push({
      obligation_id: duplicate,
      kind: "duplicate_obligation_id",
      reason: "two cells share one id; discharging either would discharge both",
    });
  }

  return {
    cells,
    problems,
    ok: problems.length === 0,
    obligation_matrix_root: createHash("sha256")
      .update(Buffer.from(OBLIGATION_ROOT_DOMAIN, "utf8"))
      .update(Buffer.from([0x00]))
      .update(Buffer.from(JSON.stringify(cells), "utf8"))
      .digest("hex"),
  };
}

/** Cell-level validation. Exported so a reviewer can run it against a committed matrix file. */
export function validateCells(cells, closureIds) {
  const problems = [];
  for (const cell of cells) {
    if (!APPLICABILITY.includes(cell.applicability)) {
      problems.push({
        obligation_id: cell.obligation_id,
        kind: "unknown_applicability",
        reason: "applicability is obligated | omitted; there is no third value",
      });
      continue;
    }
    if (cell.applicability === "omitted") {
      if (!OMISSION_REASONS.includes(cell.omission_reason)) {
        problems.push({
          obligation_id: cell.obligation_id,
          function_id: cell.function_id,
          attack_class: cell.attack_class,
          kind: "invalid_omission_reason",
          reason:
            "every omission carries a reason from the §4.2 frozen six. Free text is where " +
            "'not relevant here' goes to hide, and a reason a reviewer cannot check is not a reason.",
        });
      }
    } else if (cell.omission_reason != null) {
      problems.push({
        obligation_id: cell.obligation_id,
        function_id: cell.function_id,
        kind: "contradictory_cell",
        reason: "a cell cannot be obligated AND carry an omission reason",
      });
    }
    if (closureIds && !closureIds.has(cell.function_id)) {
      problems.push({
        obligation_id: cell.obligation_id,
        function_id: cell.function_id,
        kind: "member_outside_closure",
        reason: "an obligation for a member the closure does not contain discharges nothing",
      });
    }
  }
  return problems;
}

function firstDuplicate(values) {
  const seen = new Set();
  for (const v of values) {
    if (seen.has(v)) return v;
    seen.add(v);
  }
  return null;
}

/**
 * The independent count. A test that recomputes the expected cell total by calling the generator
 * merely agrees with the code; this walks the role table directly.
 */
export function expectedCellCounts({ members, roles }) {
  const roleOf = roles instanceof Map ? (id) => roles.get(id) : (id) => roles[id];
  let obligated = 0;
  for (const m of members) obligated += requiredClasses(roleOf(m.function_id)).length;
  return {
    total: members.length * ATTACK_CLASSES.length,
    obligated,
    omitted: members.length * ATTACK_CLASSES.length - obligated,
  };
}
