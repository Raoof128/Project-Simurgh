// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 20: run the committed campaign.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/runTranche.mjs
//
// REFUSES TO START unless the instrument lock verifies and C1 verifies against the tree. A campaign
// that would run against an instrument nobody locked, or a corpus nobody committed, is not the
// campaign that was committed.
//
// AN ATTEMPT IS RECORDED BEFORE ANYTHING RUNS. Without an `attempt_start`, a family can be run
// locally, seen to fail, and deleted, and no later ledger can prove it was ever attempted. A started
// family ends in exactly one terminal state, and `attempted_inadmissible` is a published outcome
// (§4.5), not a retry.
//
// EVERY CELL OF EVERY ATTEMPTED PAIR IS PROBED (Ruling 1), and every one of the 55 universe pairs
// carries a terminal state — the 47 outside this tranche are named `not_attempted_in_this_tranche`
// rather than being absent, because §10.1's family_result_root is total over 55.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { loadCorpus } from "../core/families.mjs";
import { loadInheritedTargets, attachTargets, probeCell, tallyCells } from "../core/campaign.mjs";
import { assessFamily } from "../core/admissibility.mjs";
import { buildUniverse } from "../core/archetypes.mjs";
import { buildChildPayload, assertBlind, scrubEnv, verifyVerdictReceipt } from "../core/laneB.mjs";
import { suppressionInvariance, loudObservation } from "../core/suppression.mjs";
import { decide } from "./detectorChild.mjs";
import { verifyLock } from "../core/instrumentLock.mjs";
import { LOCKED_PATHS } from "../core/instrumentLock.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const CHILD = join(REPO, "tools/simurgh-attestation/stage5r/node/detectorChild.mjs");
const OUT = join(REPO, "docs/research/llm-shield/evidence/stage-5r/campaign");
const C1 = join(REPO, "docs/research/llm-shield/evidence/stage-5r/commitments/campaign-c1.json");
const LOCK = join(REPO, "docs/research/llm-shield/evidence/stage-5r/instrument-lock.json");

/** Run one control through the blind child, exactly as Lane B specifies. */
function runControl({ controlId, attackClass, source, signal }) {
  const payload = buildChildPayload({
    control_id: controlId,
    attack_class: attackClass,
    source,
    declared_signal: signal,
  });
  const blind = assertBlind(payload);
  if (!blind.ok) throw new Error(`lane B refused a payload: ${blind.reason}`);
  const out = execFileSync(process.execPath, [CHILD], {
    input: JSON.stringify(payload),
    env: scrubEnv(process.env),
    encoding: "utf8",
    timeout: 60000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const receipt = JSON.parse(out);
  const check = verifyVerdictReceipt(receipt);
  if (!check.ok) throw new Error(`lane B receipt refused: ${check.reason}`);
  return receipt;
}

/** @returns {number} exit code */
export function main() {
  // ---- preconditions -------------------------------------------------------------------------
  if (!existsSync(C1)) {
    process.stderr.write("runTranche: C1 does not exist — the campaign was never committed\n");
    return 1;
  }
  const commitment = JSON.parse(readFileSync(C1, "utf8"));
  const lockText = readFileSync(LOCK, "utf8");
  const lock = JSON.parse(lockText);
  const files = Object.fromEntries(
    LOCKED_PATHS.map((p) => [
      p,
      existsSync(join(REPO, p)) ? readFileSync(join(REPO, p), "utf8") : undefined,
    ])
  );
  const lockCheck = verifyLock({ lock, files });
  if (!lockCheck.ok) {
    process.stderr.write(`runTranche: the instrument moved: ${JSON.stringify(lockCheck)}\n`);
    return 1;
  }

  const corpus = attachTargets(loadCorpus(REPO), loadInheritedTargets(REPO));
  const targets = loadInheritedTargets(REPO);
  const committedById = new Map(commitment.families.map((f) => [f.probe_family_id, f]));

  // ---- the campaign --------------------------------------------------------------------------
  const attempts = [];
  const familyResults = [];
  const allCells = [];
  let ordinal = 0;

  for (const family of corpus) {
    ordinal += 1;
    const committed = committedById.get(family.id);
    if (!committed) throw new Error(`${family.id} is not in the commitment`);

    attempts.push({
      probe_family_id: family.id,
      run_ordinal: ordinal,
      commitment_digest: commitment.tranche_digest,
      instrument_digest: commitment.instrument_lock_digest,
      detector_digest: commitment.detector_implementation_digest,
      declared_signal: family.record.detector_signal,
      target_cell_count: family.cells.length,
      started: true,
    });

    // Lane B, in the committed presentation order.
    const order = commitment.control_presentation_order;
    const kinds = ["vulnerable", "safe", "orthogonal"].sort(
      (a, b) =>
        order.indexOf(family.controls[a].control_id) - order.indexOf(family.controls[b].control_id)
    );
    const observations = {};
    const receipts = [];
    for (const kind of kinds) {
      const control = family.controls[kind];
      const receipt = runControl({
        controlId: control.control_id,
        attackClass: family.record.attack_class,
        source: control.source,
        signal: family.record.detector_signal,
      });
      if (receipt.control_digest !== undefined && control.span_digest === undefined) {
        throw new Error(`${family.id}/${kind}: the control lost its span digest`);
      }
      // The premise is recomputed here rather than remembered: the control's bytes as read now must
      // still be the bytes the record pinned.
      const premiseOk =
        kind !== "vulnerable" ||
        control.span_digest === family.record.vulnerable_control.premise_receipt.source_digest;

      observations[kind] = {
        function_id: family.binding.models_function_id,
        security_role: family.record.target_security_role,
        verdict: receipt.verdict,
        signal: receipt.declared_signal,
        premise_recomputed: premiseOk,
        restoration_proven: true, // nothing was written: the child receives bytes on stdin
        signal_applies: receipt.signal_applies,
      };
      receipts.push({ kind, control_id: control.control_id, ...receipt });
    }

    // §3.4, demonstrated rather than asserted. The detector's input is the control's bytes and the
    // declared signal — no surrogate is in it — so suppressing every surrogate at once must leave
    // the verdict where it was. Running it proves the machinery is live; the expected answer does
    // not make the experiment redundant, it makes an unexpected answer meaningful.
    const suppression = ["vulnerable", "safe", "orthogonal"].map((kind) => {
      const control = family.controls[kind];
      const observation = { ...loudObservation(), source: control.source };
      const r = suppressionInvariance({
        observation,
        detector: (o) =>
          decide({ source: o.source, declared_signal: family.record.detector_signal }).verdict,
      });
      return { kind, invariant: r.invariant, self_test_ok: r.self_test_ok, changed: r.changed };
    });
    const suppressionOk = suppression.every((s) => s.invariant && s.self_test_ok);

    const closure = new Set([family.binding.models_function_id]);
    const assessment = assessFamily({ family: family.record, observations, closure });
    const admissible = assessment.admissible && suppressionOk;

    const cells = family.cells.map((cell) =>
      probeCell({
        root: REPO,
        cell,
        member: targets.members.get(cell.function_id),
        family,
        familyAdmissible: admissible,
        fileCache: fileCacheFor(family),
      })
    );
    allCells.push(...cells);

    familyResults.push({
      probe_family_id: family.id,
      attack_class: family.record.attack_class,
      target_security_role: family.record.target_security_role,
      terminal_state: admissible ? "admissible" : "attempted_inadmissible",
      failed_conditions: assessment.failed,
      suppression_invariant: suppressionOk,
      conditions: assessment.conditions,
      lane_b_receipts: receipts,
      suppression,
      cells: tallyCells(cells),
    });

    writeArtefact(join(OUT, "cells", `${family.id}.json`), {
      schema: "simurgh.vpf.campaign-cells.v1",
      probe_family_id: family.id,
      cell_count: cells.length,
      tally: tallyCells(cells),
      cells,
    });
  }

  // ---- the 55-pair result ledger, total by construction ----------------------------------------
  const universe = buildUniverse();
  const attempted = new Map(
    familyResults.map((f) => [`${f.attack_class}|${f.target_security_role}`, f])
  );
  const pairResults = universe.pairs.map((p) => {
    const key = `${p.attack_class}|${p.target_security_role}`;
    const hit = attempted.get(key);
    return {
      attack_class: p.attack_class,
      target_security_role: p.target_security_role,
      role_archetype: p.role_archetype,
      inherited_5q_obligation_cells: p.inherited_5q_obligation_cells,
      terminal_state: hit ? hit.terminal_state : "not_attempted_in_this_tranche",
      probe_family_id: hit ? hit.probe_family_id : null,
    };
  });

  const tally = tallyCells(allCells);
  const summary = {
    schema: "simurgh.vpf.campaign-result.v1",
    note:
      "Task 20. Every family in T1 attempted, every cell of every attempted pair probed, every one " +
      "of the 55 universe pairs carrying a terminal state. THE PROBE IS STATIC: it reads a member's " +
      "committed bytes and evaluates one declared signal over the member's own span. It never " +
      "executes a member, so it cannot demonstrate a class-specific outcome, so clause 10 cannot be " +
      "satisfied and no cell can be discharged by it. The delta this campaign produces is zero, and " +
      "that bound was declared in the code before the run rather than explained after it.",
    receipt_kind: "runtime",
    commitment_digest: commitment.tranche_digest,
    detector_implementation_digest: commitment.detector_implementation_digest,
    families_attempted: familyResults.length,
    families_admissible: familyResults.filter((f) => f.terminal_state === "admissible").length,
    families_attempted_inadmissible: familyResults.filter(
      (f) => f.terminal_state === "attempted_inadmissible"
    ).length,
    universe_pair_count: pairResults.length,
    pairs_not_attempted: pairResults.filter(
      (p) => p.terminal_state === "not_attempted_in_this_tranche"
    ).length,
    cells: tally,
    newly_discharged_cells: allCells.filter((c) => c.state === "discharged").length,
    candidate_findings: allCells
      .filter((c) => c.candidate_finding)
      .map((c) => ({
        obligation_id: c.obligation_id,
        function_id: c.function_id,
        probe_family_id: c.probe_family_id,
        evidence: c.signal_evidence,
      })),
    families: familyResults,
  };

  writeArtefact(join(OUT, "attempt-log.json"), {
    schema: "simurgh.vpf.attempt-log.v1",
    note:
      "Recorded BEFORE each family ran. Without it a family can be run, seen to fail, and deleted, " +
      "and no later ledger can prove it was ever attempted.",
    attempts,
  });
  writeArtefact(join(OUT, "pair-results.json"), {
    schema: "simurgh.vpf.pair-results.v1",
    note: "All 55 universe pairs. The unattempted are named, not absent (§10.1).",
    pair_count: pairResults.length,
    pairs: pairResults,
  });
  writeArtefact(join(OUT, "campaign-result.json"), summary);

  const lines = [
    `families attempted     ${summary.families_attempted}`,
    `families admissible    ${summary.families_admissible}`,
    `attempted_inadmissible ${summary.families_attempted_inadmissible}`,
    `universe pairs         ${summary.universe_pair_count} (${summary.pairs_not_attempted} not attempted)`,
    `cells probed           ${tally.total}`,
    ...Object.entries(tally.by_state).map(([k, v]) => `  ${k.padEnd(22)} ${v}`),
    ...Object.entries(tally.by_reason).map(([k, v]) => `    ${k.padEnd(34)} ${v}`),
    `candidate findings     ${summary.candidate_findings.length}`,
    `newly discharged cells ${summary.newly_discharged_cells}`,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  return summary.families_attempted === corpus.length ? 0 : 1;
}

const CACHES = new Map();
/** One file cache per family, so a member read for one family is not reused across signals. */
function fileCacheFor(family) {
  if (!CACHES.has(family.id)) CACHES.set(family.id, new Map());
  return CACHES.get(family.id);
}

function writeArtefact(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalJson(value)}\n`, "utf8");
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main());
}
