// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Tasks 19 and 20: the target sets, and the per-cell probe.
//
// THE PROBE SET IS EVERY CELL IN THE PAIR (Ruling 1). All 582 cells of R3 × completeness_claim, all
// 17 of R12 × code_allocation, and so on for the other six — 2 406 cells across T1. A family
// discharges the cells its probe actually reached, never the size of its pair, so every cell in an
// attempted pair carries a terminal state and the ones the probe could not conclude about are named
// rather than absent.
//
// WHAT THIS PROBE CAN AND CANNOT CONCLUDE, STATED BEFORE ANY RESULT.
//
// The probe is STATIC: it reads a member's committed bytes, locates the member's own span, and
// evaluates the family's single declared signal over it. It does not execute the member, and it must
// not — §2.4 forbids importing stage5{a..q} code in the primary worktree and Ruling 5 forbids writing
// to the inherited tree even temporarily.
//
// The consequence is arithmetic, not rhetorical. Clause 10 of the discharge predicate requires the
// class-specific outcome to be MATCHED ON THIS MEMBER, and a static reading of a member's shape
// cannot demonstrate an outcome that was never executed. So a static probe cannot discharge a cell,
// and the coverage delta this campaign can produce is bounded above by zero. That is the honest
// result and it is declared here, in the code that produces it, rather than discovered in a ledger
// afterwards and explained away.
//
// What the campaign does produce is a measurement: for every cell in every attempted pair, whether
// the member's bytes still match the inherited pin, whether the family's signal path exists there at
// all, and whether the defect shape is present. A member where the signal fires is a CANDIDATE
// FINDING for adjudication, never an automatic discharge.

import { readFileSync } from "node:fs";
import { join, extname } from "node:path";
import { evaluateSignal } from "./signals.mjs";
import { extractMemberSpan, inheritedSourceDigest, LANGUAGE_OF } from "./memberSource.mjs";
import { classifyCell } from "./deltaLedger.mjs";

const CLOSURE = "docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json";
const MATRIX = "docs/research/llm-shield/evidence/stage-5q/closure/obligation-matrix.json";

/**
 * Load the inherited closure and obligation matrix, indexed for the campaign.
 *
 * @param {string} root
 * @returns {{members: Map<string,object>, cellsByPair: Map<string, Array<object>>}}
 */
export function loadInheritedTargets(root) {
  const closure = JSON.parse(readFileSync(join(root, CLOSURE), "utf8"));
  const matrix = JSON.parse(readFileSync(join(root, MATRIX), "utf8"));
  const members = new Map(closure.members.map((m) => [m.function_id, m]));
  const cellsByPair = new Map();
  for (const cell of matrix.cells) {
    if (cell.applicability !== "obligated") continue;
    const member = members.get(cell.function_id);
    if (!member) continue;
    const key = `${cell.attack_class}|${member.security_role}`;
    if (!cellsByPair.has(key)) cellsByPair.set(key, []);
    cellsByPair.get(key).push({
      obligation_id: cell.obligation_id,
      function_id: cell.function_id,
    });
  }
  // Sorted so the campaign's cell order is a property of the data, not of the matrix's file order.
  for (const list of cellsByPair.values()) {
    list.sort((a, b) => (a.obligation_id < b.obligation_id ? -1 : 1));
  }
  return { members, cellsByPair };
}

/**
 * Attach each family's target cell set — every obligated cell of its pair.
 *
 * @param {Array<object>} corpus
 * @param {{cellsByPair: Map<string, Array<object>>}} targets
 * @returns {Array<object>}
 */
export function attachTargets(corpus, targets) {
  return corpus.map((f) => {
    const key = `${f.record.attack_class}|${f.record.target_security_role}`;
    const cells = targets.cellsByPair.get(key) ?? [];
    if (cells.length !== f.record.inherited_5q_obligation_cells) {
      throw new Error(
        `${f.id}: the record claims ${f.record.inherited_5q_obligation_cells} obligated cells, ` +
          `the inherited matrix has ${cells.length} — the pair is not what the record says it is`
      );
    }
    return { ...f, cells, obligationIds: cells.map((c) => c.obligation_id) };
  });
}

/**
 * Probe one cell: one member, one declared signal, read-only.
 *
 * @param {{root: string, cell: object, member: object, family: object, familyAdmissible: boolean,
 *          fileCache: Map<string, {text: string|null, digest: string|null}>}} input
 * @returns {object} the cell record, already carrying its terminal state
 */
export function probeCell({ root, cell, member, family, familyAdmissible, fileCache }) {
  const signalId = family.record.detector_signal;
  const base = {
    obligation_id: cell.obligation_id,
    function_id: cell.function_id,
    probe_family_id: family.id,
    attack_class: family.record.attack_class,
    target_security_role: family.record.target_security_role,
    declared_signal: signalId,
    probe_kind: "static_signal",
    family_admissible: familyAdmissible,
    obligation_in_committed_pair: true,
    already_discharged: false,
    restoration_valid: true, // nothing was written: a read-only probe restores by construction
  };

  if (!familyAdmissible) {
    return { ...base, ...classifyCell({ ...base, family_admissible: false }) };
  }

  let file = fileCache.get(member.module_path);
  if (file === undefined) {
    try {
      const bytes = readFileSync(join(root, member.module_path));
      file = { text: bytes.toString("utf8"), digest: inheritedSourceDigest(bytes) };
    } catch {
      file = { text: null, digest: null };
    }
    fileCache.set(member.module_path, file);
  }

  const language = LANGUAGE_OF[extname(member.module_path)] ?? "unknown";
  const digestMatches = file.digest === member.source_digest;

  const record = {
    ...base,
    module_path: member.module_path,
    member_language: language,
    member_source_digest_matches: digestMatches,
    execution_completed: false,
    deterministic: false,
    schema_valid: true,
    premise_applies: false,
    verdict: "not_probed",
    observed_signal: null,
    committed_detector_signal: signalId,
    signal_evidence_verified: false,
    // A static reading cannot demonstrate an outcome that was never executed. This is false for every
    // cell in this campaign, by construction rather than by result, and clause 10 needs it true.
    class_specific_outcome_matched: false,
    suppression_invariant: true,
  };

  if (file.text === null) {
    return {
      ...record,
      unprobed_reason: "unsupported_target_shape",
      ...classifyCell({ ...record, unprobed_reason: "unsupported_target_shape" }),
    };
  }
  if (!digestMatches) {
    // The member moved since 5Q pinned it. A probe of different bytes is a probe of a different
    // member, and saying otherwise would launder a drift into a result.
    const moved = { ...record, unprobed_reason: "unsupported_target_shape" };
    return { ...moved, ...classifyCell(moved) };
  }
  if (language !== family.binding.language) {
    const wrongLanguage = { ...record, unprobed_reason: "unsupported_target_shape" };
    return { ...wrongLanguage, ...classifyCell(wrongLanguage) };
  }

  const span = extractMemberSpan({
    text: file.text,
    symbol: member.export_name_or_internal_symbol,
    language,
  });
  if (!span.ok) {
    const unlocatable = { ...record, unprobed_reason: "unsupported_target_shape" };
    return { ...unlocatable, ...classifyCell(unlocatable) };
  }

  // Twice, and compared: clause 5 wants determinism demonstrated, not assumed.
  const first = evaluateSignal(signalId, span.span);
  const second = evaluateSignal(signalId, span.span);
  const deterministic = JSON.stringify(first) === JSON.stringify(second);

  const probed = {
    ...record,
    execution_completed: true,
    deterministic,
    premise_applies: first.applies,
    verdict: first.verdict,
    observed_signal: signalId,
    signal_evidence_verified: first.verdict === "detected" && first.evidence.length > 0,
    signal_evidence: first.verdict === "detected" ? first.evidence : "",
    span_bytes: Buffer.byteLength(span.span, "utf8"),
    candidate_finding: first.verdict === "detected",
    not_discharged_reason: first.applies
      ? first.verdict === "detected"
        ? "class_outcome_not_demonstrated"
        : "defect_signal_absent"
      : undefined,
  };
  return { ...probed, ...classifyCell(probed) };
}

/**
 * Tally cell states, so the campaign's summary is computed from the records rather than narrated.
 *
 * @param {Array<object>} cells
 * @returns {object}
 */
export function tallyCells(cells) {
  const byState = {};
  const byReason = {};
  for (const c of cells) {
    byState[c.state] = (byState[c.state] ?? 0) + 1;
    if (c.reason) byReason[c.reason] = (byReason[c.reason] ?? 0) + 1;
  }
  return {
    total: cells.length,
    by_state: Object.fromEntries(
      Object.keys(byState)
        .sort()
        .map((k) => [k, byState[k]])
    ),
    by_reason: Object.fromEntries(
      Object.keys(byReason)
        .sort()
        .map((k) => [k, byReason[k]])
    ),
    candidate_findings: cells.filter((c) => c.candidate_finding).length,
  };
}
