#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 15 — the finding-ledger driver. The rule is pure and lives in
// `core/findings.mjs`; this file does the I/O: read the committed run, build the ledger, verify it
// against the run, print, exit.
//
//   node .../buildFindingLedger.mjs --run <run.json> --out <ledger.json>
//   node .../buildFindingLedger.mjs --run <run.json> --verify <ledger.json>
//   node .../buildFindingLedger.mjs --run <run.json> --verify <next.json> --against <prev.json>
//
// THREE EXIT CODES, THREE MEANINGS — the same shape 5S-F006 forced onto the write-surface driver,
// for the same reason. Exit 1 is "the ledger contradicts the run". Exit 2 is "nobody checked": an
// unreadable file, an unrecognised flag, a run file that is not a run. A driver that prints OK
// because it could not do its job has not passed; it has not run.
//
// NO RAW CODE LEAVES THIS FILE. Ledger refusals are evidence-pack failures, not verifier refusals,
// and the §2 band is closed at 512. The exit status here is a driver status and must never be read
// as a policy outcome.
//
// AND IT REFUSES `--key`. Nothing in this path signs anything; a driver that accepts a key argument
// invites someone to hand it one.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import {
  LEDGER_SCHEMA,
  canonicalLedger,
  deriveFindingEntry,
  verifyFindingLedger,
  verifyLedgerSuccession,
} from "../core/findings.mjs";

export const DRIVER_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

/**
 * Parse argv. Unknown arguments are refused rather than ignored, and `--key` is refused by name so
 * the refusal reads as a rule rather than as an accident of the parser.
 *
 * @returns {{run: string, out: string|null, verify: string|null, against: string|null}
 *          |{error: string}}
 */
export function parseArgs(argv) {
  const opts = { run: null, out: null, verify: null, against: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, null];
    if (flag === "--key" || flag === "--sign") {
      return { error: `${flag} is refused: this driver signs nothing` };
    }
    const name = flag.startsWith("--") ? flag.slice(2) : null;
    if (name === null || !(name in opts)) return { error: `unrecognised argument: ${arg}` };
    const value = inline ?? argv[(i += 1)];
    if (!value) return { error: `${flag} requires a path` };
    opts[name] = value;
  }
  if (!opts.run) return { error: "--run <run.json> is required" };
  if (!opts.out && !opts.verify) return { error: "one of --out or --verify is required" };
  if (opts.out && opts.verify) return { error: "--out and --verify are mutually exclusive" };
  if (opts.against && !opts.verify) return { error: "--against requires --verify" };
  return opts;
}

/**
 * Build a ledger from a run. The run is the authority: one row per comparison that reported a fork,
 * and none for any that did not.
 *
 * @returns {{ok: true, ledger: object}|{ok: false, refusals: Array<object>}}
 */
export function buildLedger(run) {
  const comparisons = Array.isArray(run?.comparisons) ? run.comparisons : [];
  const entries = [];
  const refusals = [];
  for (const c of comparisons) {
    const derived = deriveFindingEntry(c);
    if (!derived.ok) {
      refusals.push(...derived.refusals);
      continue;
    }
    if (derived.entry) entries.push(derived.entry);
  }
  if (refusals.length > 0) return { ok: false, refusals };
  return { ok: true, ledger: { schema: LEDGER_SCHEMA, entries } };
}

export function main(argv, deps = {}) {
  const read = deps.readFile ?? ((p) => readFileSync(p, "utf8"));
  const write = deps.writeFile ?? ((p, text) => writeFileSync(p, text));
  const log = deps.log ?? ((line) => console.log(line));

  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`Stage 5S finding ledger — NOT RUN: ${parsed.error}`);
    log(
      "  usage: --run <run.json> (--out <ledger.json> | --verify <ledger.json> [--against <prev>])"
    );
    return DRIVER_EXIT.OPERATOR_ERROR;
  }

  const load = (path) => JSON.parse(read(path));
  let run;
  try {
    run = load(parsed.run);
  } catch (error) {
    log(`Stage 5S finding ledger — NOT RUN: unreadable run (${error.message})`);
    return DRIVER_EXIT.OPERATOR_ERROR;
  }
  if (!Array.isArray(run?.comparisons)) {
    log("Stage 5S finding ledger — NOT RUN: the run file declares no `comparisons` array");
    return DRIVER_EXIT.OPERATOR_ERROR;
  }

  const publicInputs = {
    observed: run.comparisons.map((c) => ({
      comparison_manifest_digest: c?.equivocation_artifact?.comparison_manifest_digest,
      comparison_status: c?.comparison_status,
      quorum_status_a: c?.quorum_status_a,
      quorum_status_b: c?.quorum_status_b,
    })),
    committed_artifacts: run.comparisons
      .map((c) => c?.equivocation_artifact)
      .filter((a) => a !== null && a !== undefined),
    verification_inputs: run.verification_inputs,
  };

  let ledger;
  if (parsed.out) {
    const built = buildLedger(run);
    if (!built.ok) {
      log(`Stage 5S finding ledger — REFUSED while building: ${built.refusals.length}`);
      for (const r of built.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
      return DRIVER_EXIT.REFUSED;
    }
    ledger = built.ledger;
  } else {
    try {
      ledger = load(parsed.verify);
    } catch (error) {
      log(`Stage 5S finding ledger — NOT RUN: unreadable ledger (${error.message})`);
      return DRIVER_EXIT.OPERATOR_ERROR;
    }
  }

  const verdict = verifyFindingLedger(ledger, publicInputs);
  log(`Stage 5S finding ledger — comparisons: ${run.comparisons.length}`);
  log(`  findings recorded: ${verdict.entry_ids.length}`);

  const refusals = [...verdict.refusals];
  if (parsed.against) {
    let previous;
    try {
      previous = load(parsed.against);
    } catch (error) {
      log(`Stage 5S finding ledger — NOT RUN: unreadable predecessor (${error.message})`);
      return DRIVER_EXIT.OPERATOR_ERROR;
    }
    const succession = verifyLedgerSuccession(previous, ledger);
    log(`  succession: +${succession.added.length} / -${succession.removed.length}`);
    refusals.push(...succession.refusals);
  }

  if (refusals.length > 0) {
    log(`  REFUSALS: ${refusals.length}`);
    for (const r of refusals) {
      log(`  ✗ ${r.reason}${r.entry_id ? ` [${r.entry_id.slice(0, 12)}]` : ""} — ${r.detail}`);
    }
    return DRIVER_EXIT.REFUSED;
  }

  if (parsed.out) {
    // Canonical bytes, so two runs of this driver over one run are byte-identical whatever order the
    // comparisons arrived in.
    write(parsed.out, `${canonicalLedger(ledger)}\n`);
    log(`  written: ${parsed.out}`);
  }
  log("  OK — the ledger agrees with the run it records");
  return DRIVER_EXIT.OK;
}

// argv[1] is undefined under `node -e` / dynamic import; the unguarded form crashes every importer.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
