#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5S — Task 17 — the Lane A fixture builder, oracle-free by construction.
//
//   node .../buildFixtures.mjs --out docs/research/llm-shield/evidence/stage-5s/fixtures/
//
// RULING 4, MECHANICALLY. This file may not reach `core/verify.mjs`, `core/status.mjs` or
// `core/findings.mjs` — not directly and not through anything it imports. An import-boundary test
// walks the real module graph rather than reading the import list at the top of this file, because
// the import list is what a well-meaning edit changes and the graph is what actually runs.
//
// The reason is worth stating plainly: if the builder could ask the verifier what a fixture produces,
// every acceptance row would be "the verifier agrees with the verifier", every case would pass, and
// the matrix would go on passing on the day the verifier broke. Expected columns are authored.
//
// NO CLOCK, NO RANDOMNESS, NO ENVIRONMENT. Keys come from committed seeds, output is canonical JSON,
// and the file order is the corpus order. Two runs into two directories must diff clean — that is
// the check this stage's reproduce script runs, and it is why `generateKeyPairSync` appears nowhere
// beneath this file.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { canonicalJson } from "../core/canonical.mjs";
import { ACCEPTANCE_COLUMNS, ADVERSARY_WINS, CASES } from "../fixtures/cases.mjs";

export const DRIVER_EXIT = Object.freeze({ OK: 0, REFUSED: 1, OPERATOR_ERROR: 2 });

export function parseArgs(argv) {
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out" || arg.startsWith("--out=")) {
      out = arg.includes("=") ? arg.slice("--out=".length) : argv[(i += 1)];
      if (!out) return { error: "--out requires a directory" };
    } else {
      return { error: `unrecognised argument: ${arg}` };
    }
  }
  if (!out) return { error: "--out <dir> is required" };
  return { out };
}

/**
 * Build every case into memory. A case that denies no named adversary win is REFUSED rather than
 * emitted — §5.5 attaches one to every family, and a fixture nobody can say the purpose of is a
 * fixture that will survive any future rewrite because nothing depends on what it means.
 *
 * @returns {{ok: true, files: Map<string, string>}|{ok: false, refusals: Array<object>}}
 */
export function buildAll() {
  const refusals = [];
  const files = new Map();
  const rows = [];
  const seen = new Set();

  for (const c of CASES) {
    if (!ADVERSARY_WINS.includes(c.denies)) {
      refusals.push({
        reason: "CASE_DENIES_NO_NAMED_WIN",
        detail: `${c.case_id} denies ${JSON.stringify(c.denies)}`,
      });
      continue;
    }
    if (seen.has(c.case_id)) {
      refusals.push({ reason: "DUPLICATE_CASE_ID", detail: c.case_id });
      continue;
    }
    seen.add(c.case_id);

    const missing = ACCEPTANCE_COLUMNS.filter((col) => col !== "case_id" && !(col in c.expect));
    if (missing.length) {
      refusals.push({
        reason: "ACCEPTANCE_COLUMN_ABSENT",
        detail: `${c.case_id}: ${missing.join(", ")}`,
      });
      continue;
    }

    files.set(`${c.case_id}.json`, `${canonicalJson(c.build())}\n`);
    rows.push({ case_id: c.case_id, family: c.family, denies: c.denies, ...c.expect });
  }

  if (files.size === 0) {
    // Anti-vacuity: a builder that emitted nothing and exited 0 would be a green gate over an empty
    // pack, which is the shape this repository has now been bitten by five times.
    refusals.push({ reason: "EMPTY_FIXTURE_PACK", detail: "no case produced a bundle" });
  }
  if (refusals.length) return { ok: false, refusals };

  files.set("matrix.json", `${canonicalJson({ columns: ACCEPTANCE_COLUMNS, rows })}\n`);
  return { ok: true, files };
}

export function main(argv, deps = {}) {
  const log = deps.log ?? ((line) => console.log(line));
  const mkdir = deps.mkdir ?? ((dir) => mkdirSync(dir, { recursive: true }));
  const write = deps.writeFile ?? ((path, text) => writeFileSync(path, text));

  const parsed = parseArgs(argv);
  if (parsed.error) {
    log(`Stage 5S fixtures — NOT RUN: ${parsed.error}`);
    log("  usage: --out <dir>");
    return DRIVER_EXIT.OPERATOR_ERROR;
  }

  const built = buildAll();
  if (!built.ok) {
    log(`Stage 5S fixtures — REFUSED: ${built.refusals.length}`);
    for (const r of built.refusals) log(`  ✗ ${r.reason} — ${r.detail}`);
    return DRIVER_EXIT.REFUSED;
  }

  try {
    mkdir(parsed.out);
    for (const [name, text] of built.files) write(join(parsed.out, name), text);
  } catch (error) {
    log(`Stage 5S fixtures — NOT RUN: could not write (${error.message})`);
    return DRIVER_EXIT.OPERATOR_ERROR;
  }

  log(`Stage 5S fixtures — ${built.files.size - 1} cases + matrix.json → ${parsed.out}`);
  return DRIVER_EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
