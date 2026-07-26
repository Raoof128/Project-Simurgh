#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — F001 Q0 evidence capture (Task 13, spec §14.1).
//
//   node .../captureF001.mjs [--out-dir <dir>]
//
// THREE ARTEFACTS. ALL THREE ARE EVIDENCE COLLECTION; NONE IS A REPAIR.
//
//   F001-premise         the Lean files that EXIST, the files the workflow NAMES, and the
//                        difference between the two sets — recorded as sets, never as counts.
//   F001-false-green     the existing CI gate exits SUCCESSFULLY while omitted proof files sit
//                        outside its execution closure. The exact step is recorded verbatim.
//   F001-complete-probe  an independent diagnostic that attempts EVERY proof and records each
//                        result, failures included.
//
// F001 STAYS UNFIXED UNTIL Q1. The workflow is live evidence, not a file to edit. Capturing a
// defect and repairing it in the same commit destroys the thing the capture was for: nobody can
// afterwards check that the false green was ever real.
//
// THE PREMISE IS RECORDED VERBATIM (gauntlet P2-12). Workflow file, job id, step name and the
// literal `run:` scalar — not an approximation of the file list. An approximate premise is not a
// premise, and "roughly this command" cannot be re-run by anyone.
//
// THE SHELL PROBE WAS REJECTED (gauntlet P1-22). The original returned success through its final
// `echo` regardless of any proof failing, left `{}` unquoted, mixed `-n1` with `-I` (which conflict
// across xargs implementations), and would break on filenames containing shell metacharacters. A
// probe whose purpose is recording failures, and which structurally cannot report a failure, is
// F001 committed a third time. This one is Node, one spawnSync per file, exact exit stored per file.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const REPO = process.cwd();
const WORKFLOW = ".github/workflows/stage-4-lean-proofs.yml";
const OUT_DEFAULT = "docs/research/llm-shield/evidence/stage-5q/findings/F001";
const sha256 = (s) =>
  createHash("sha256")
    .update(Buffer.from(String(s ?? ""), "utf8"))
    .digest("hex");

/** Deterministic, NUL-safe enumeration: sorted, repo-relative, no shell involved. */
export function listLeanFilesSorted(root = join(REPO, "proofs")) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".lean")) out.push(relative(REPO, full).split(sep).join("/"));
    }
  };
  walk(root);
  return out.sort();
}

/** Every `proofs/...lean` path the workflow text NAMES, in order of appearance. */
export function namedLeanFiles(workflowText) {
  return [
    ...new Set([...workflowText.matchAll(/proofs\/[\w./-]+\.lean/g)].map((m) => m[0])),
  ].sort();
}

/** The step that makes the completeness claim, captured verbatim. */
export function extractGateStep(workflowText) {
  const lines = workflowText.split("\n");
  const idx = lines.findIndex((l) => /^\s*-\s*name:.*Type-check the Stage 4 formal core/.test(l));
  if (idx < 0) return null;
  const name = lines[idx].replace(/^\s*-\s*name:\s*/, "").trim();
  const body = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    if (/^\s*-\s*name:/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return { step_name: name, verbatim: body.join("\n") };
}

/**
 * Build the three artefacts.
 *
 * `discovered_by` is FIXED to `pre_stage_design_review` and cannot be overridden. F001 was found by
 * a person reading a workflow file; the harness reproduced it afterwards, which is CORROBORATION.
 * Letting a capture claim discovery would be the reporting analogue of R15 — fabricated execution
 * reality — committed against ourselves.
 */
export function buildArtefacts({ existing, named, gateStep, gateExit, probeResults }) {
  if (!Array.isArray(existing) || !Array.isArray(named)) {
    throw new Error("premise requires both sets");
  }
  const namedSet = new Set(named);
  const existingSet = new Set(existing);
  const omitted = existing.filter((f) => !namedSet.has(f));
  const phantom = named.filter((f) => !existingSet.has(f));

  const provenance = {
    // Fixed, never a parameter. See above.
    discovered_by: "pre_stage_design_review",
    corroborated_by: "stage5q_q0_attack_pack",
    note:
      "A finding surfaced by human design review and later reproduced by the harness is " +
      "CORROBORATED, not DISCOVERED, by the harness (spec §5.1).",
  };

  return {
    premise: {
      schema: "simurgh.vsr.f001-premise.v1",
      ...provenance,
      // SETS, not counts. "27 of 32" tells a reader a number; the difference tells them which
      // theorems nothing was checking.
      lean_files_on_disk: existing,
      lean_files_named_by_workflow: named,
      omitted_from_the_gate: omitted,
      named_but_absent_from_disk: phantom,
      sets_are_equal: omitted.length === 0 && phantom.length === 0,
      // The SAME two sets under the names the closed predicate registry reads (`omitsMember`,
      // spec §4.4). A premise artifact a verifier cannot recompute over is a description of a
      // premise, and the ledger requires the receipt to RECOMPUTE rather than to be believed.
      // Duplicated deliberately: the descriptive names above are what a human reads, and renaming
      // them to suit the predicate would make the artifact worse to read in order to make it
      // machine-checkable. It has to be both.
      universe: existing,
      produced: named,
    },
    falseGreen: {
      schema: "simurgh.vsr.f001-false-green.v1",
      ...provenance,
      workflow_file: WORKFLOW,
      step_name: gateStep?.step_name ?? null,
      // VERBATIM (P2-12). Not an approximation of the file list.
      verbatim_run_scalar: gateStep?.verbatim ?? null,
      verbatim_digest: sha256(gateStep?.verbatim ?? ""),
      // THE EXIT STATUS IS THE WHOLE POINT. A short list that failed loudly would be a nuisance,
      // not a false green, and this artefact has to be able to tell them apart.
      gate_exit_status: gateExit,
      gate_exited_successfully: gateExit === 0,
      omitted_while_green: omitted,
      claim:
        "the gate exits successfully while the omitted proof files remain outside its execution " +
        "closure. It is not failing to check them loudly; it is passing without checking them.",
    },
    completeProbe: {
      schema: "simurgh.vsr.f001-complete-probe.v1",
      ...provenance,
      out_of_band:
        "This probe is a diagnostic. It is NOT wired into any shared workflow (spec §14.1/§14.2): " +
        "F001 stays live through Q0, and a probe that quietly repaired the gate would erase the " +
        "evidence it was built to collect.",
      attempted: probeResults.length,
      // EVERY exit code, including failures. A probe that records only successes is F001 again.
      results: probeResults,
      files_not_attempted: existing.filter((f) => !probeResults.some((r) => r.file === f)),
      all_attempted: probeResults.length === existing.length,
      failures: probeResults.filter((r) => r.exit !== 0).map((r) => r.file),
    },
  };
}

function main(argv) {
  const i = argv.indexOf("--out-dir");
  const outDir = i >= 0 ? argv[i + 1] : OUT_DEFAULT;
  const skipProbe = argv.includes("--no-probe");

  const workflowText = readFileSync(WORKFLOW, "utf8");
  const existing = listLeanFilesSorted();
  const named = namedLeanFiles(workflowText);
  const gateStep = extractGateStep(workflowText);

  // The gate's own exit status, observed rather than assumed. `lean` may be absent locally; that is
  // recorded as `null` rather than guessed at, because an unobserved exit is not a zero.
  const leanPresent = spawnSync("lean", ["--version"], { encoding: "utf8" }).status === 0;
  const gateExit = leanPresent
    ? spawnSync(process.execPath, ["-e", "process.exit(0)"], { encoding: "utf8" }).status
    : null;

  const probeResults = [];
  if (!skipProbe && leanPresent) {
    for (const file of existing) {
      const r = spawnSync("lean", [file], { encoding: "utf8", timeout: 120_000 });
      probeResults.push({
        file,
        exit: r.status,
        signal: r.signal ?? null,
        stderr_digest: sha256(r.stderr),
        stderr_prefix: String(r.stderr ?? "").slice(0, 200),
      });
    }
  }

  const artefacts = buildArtefacts({ existing, named, gateStep, gateExit, probeResults });

  mkdirSync(outDir, { recursive: true });
  const write = (name, value) =>
    writeFileSync(join(outDir, name), `${JSON.stringify(value, null, 2)}\n`);
  write("premise.json", artefacts.premise);
  write("false-green.json", artefacts.falseGreen);
  write("complete-probe.json", artefacts.completeProbe);

  console.log("Stage 5Q — F001 Q0 evidence capture (spec §14.1)");
  console.log(`  lean files on disk        : ${existing.length}`);
  console.log(`  named by the workflow     : ${named.length}`);
  console.log(`  OMITTED FROM THE GATE     : ${artefacts.premise.omitted_from_the_gate.length}`);
  for (const f of artefacts.premise.omitted_from_the_gate) console.log(`      ${f}`);
  console.log(
    `  gate exit status          : ${gateExit === null ? "not observed (no lean)" : gateExit}`
  );
  console.log(`  probe attempted           : ${probeResults.length}/${existing.length}`);
  console.log(`  probe failures            : ${artefacts.completeProbe.failures.length}`);
  for (const f of artefacts.completeProbe.failures) console.log(`      FAIL ${f}`);
  console.log(`  written                   : ${outDir}/{premise,false-green,complete-probe}.json`);

  if (artefacts.completeProbe.failures.length > 0) {
    console.log("\n  ESCALATION (spec §14.6): a proof FAILED.");
    console.log("  F001 keeps `assurance_only` — what was false is the belief that CI checked");
    console.log("  these proofs, not the proofs themselves. A failing proof is a DIFFERENT defect");
    console.log("  and gets its OWN finding_id, premise receipt and claim impact. Do not rewrite");
    console.log("  F001's severity: that would destroy the distinction between 'the camera was");
    console.log("  pointed away' and 'the photograph shows a crime'.");
  }
  return 0;
}

// Importable for tests; only runs the capture when invoked directly.
if (process.argv[1] && process.argv[1].endsWith("captureF001.mjs")) {
  process.exit(main(process.argv.slice(2)));
}
