#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — static census driver.
//
// The rule lives in core/censusStatic.mjs and is pure over an injected file list. This file does the
// I/O: walk the eight closure roots, read bytes, hand them over, print or write the result.
//
//   --format=summary   counts by root and category (the diagnostic)
//   --format=json      the full member list
//   --out <path>       write JSON to a file
//
// The counts this prints are a DIAGNOSTIC, never a target (Annex A1.4). If the output happens to
// match a remembered number, that is evidence R8 did not fire, not evidence the census is right.

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { staticCensus, rootFor } from "../core/censusStatic.mjs";
import { CLOSURE_ROOTS } from "../core/constants.mjs";

const REPO = process.cwd();
const EXTS = new Set([".mjs", ".js", ".py", ".lean", ".sh"]);

const ROOT_DIRS = [
  "tools/simurgh-attestation",
  "tests/e2e/llmShield",
  "tests/unit/llmShield",
  "proofs",
  "scripts",
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else {
      const ext = name.slice(name.lastIndexOf("."));
      if (EXTS.has(ext)) acc.push(relative(REPO, full).split(sep).join("/"));
    }
  }
  return acc;
}

function collectFiles() {
  const paths = [];
  for (const d of ROOT_DIRS) paths.push(...walk(join(REPO, d)));
  // Only files that a closure root claims. Everything else is outside the universe by definition,
  // and quietly including it would make the closure describe more than the spec says it does.
  return paths
    .filter((p) => rootFor(p) !== null)
    .sort()
    .map((path) => ({ path, bytes: readFileSync(join(REPO, path)) }));
}

function main(argv) {
  const format = (argv.find((a) => a.startsWith("--format=")) ?? "--format=summary").split("=")[1];
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : null;

  const files = collectFiles();
  const census = staticCensus({ files });

  const byRoot = {};
  const byCategory = {};
  const byExtraction = {};
  for (const m of census.members) {
    byRoot[m.root] = (byRoot[m.root] ?? 0) + 1;
    byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
    byExtraction[m.extraction_method] = (byExtraction[m.extraction_method] ?? 0) + 1;
  }

  if (format === "json" || out) {
    const payload = {
      parser: "acorn@8.17.0",
      roots: CLOSURE_ROOTS.map((r) => r.id),
      file_count: files.length,
      member_count: census.members.length,
      edge_count: census.edges.length,
      members: census.members,
      edges: census.edges,
      parse_errors: census.parseErrors,
      duplicates: census.duplicates,
    };
    const json = JSON.stringify(payload, null, 2);
    if (out) writeFileSync(out, `${json}\n`);
    if (format === "json" && !out) console.log(json);
  }

  if (format === "summary") {
    console.log("Stage 5Q static census — DIAGNOSTIC, not a target (Annex A1.4)");
    console.log(`  files walked        : ${files.length}`);
    console.log(`  members             : ${census.members.length}`);
    console.log(`  edges               : ${census.edges.length}`);
    console.log("  by root             :", JSON.stringify(byRoot));
    console.log("  by extraction       :", JSON.stringify(byExtraction));
    console.log("  by category         :");
    for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`      ${String(v).padStart(6)}  ${k}`);
    }
    console.log(`  parse errors        : ${census.parseErrors.length}`);
    console.log(`  duplicate ids       : ${census.duplicates.length}`);
  }

  // Parse errors and duplicates are precommit_blockers (second gauntlet B4): they block Task 8,
  // and they are not "findings" while no ledger exists.
  const blockers = census.parseErrors.length + census.duplicates.length;
  if (blockers > 0) {
    console.log(
      `\n  PRECOMMIT BLOCKERS: ${blockers} — Task 8 must not run until these are resolved`
    );
    for (const e of census.parseErrors.slice(0, 10))
      console.log(`    parse: ${e.path}: ${e.message}`);
    for (const d of census.duplicates.slice(0, 10)) console.log(`    duplicate id: ${d}`);
  }
  return blockers > 0 ? 1 : 0;
}

process.exit(main(process.argv.slice(2)));
