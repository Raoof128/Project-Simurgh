#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — runtime census driver (spawning half of the P0-11/M3 split).
//
// Importing ~380 modules executes their top level. Any import-time side effect runs, and one
// process.exit() or infinite loop would otherwise abort the whole census. So: a child process per
// batch, with a timeout, an output cap and a sanitized environment.
//
//   --mode=collect   emit members and failures, exit 0        (discovery)
//   --mode=verify    exit NON-ZERO on any unresolved failure  (Task 8 consumes this)
//
// The two modes exist because "failures are data" and "the closure is sound" are different claims
// (gauntlet P1-10). A module that cannot be imported has no runtime surface, so §2.6's projection
// cannot be evaluated for it — that is fine while discovering and fatal while committing.

import { readdirSync, statSync, existsSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { mergeBatchResults, verifyRuntimeCensus } from "../core/censusRuntime.mjs";
import { rootFor } from "../core/censusStatic.mjs";

const REPO = process.cwd();
const BATCH_SIZE = 25;
const TIMEOUT_MS = 60_000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

/** Only importable JS under R1/R2/R8. .py/.lean/.sh have no runtime surface in this sense. */
function collectModulePaths() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === ".git") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(mjs|js)$/.test(name)) {
        const rel = relative(REPO, full).split(sep).join("/");
        if (rootFor(rel)) out.push(rel);
      }
    }
  };
  walk(join(REPO, "tools/simurgh-attestation"));
  walk(join(REPO, "tests/e2e/llmShield"));
  walk(join(REPO, "tests/unit/llmShield"));
  return out.sort();
}

/**
 * The child program. Imports one batch and prints JSON.
 *
 * Each module is imported inside its own try/catch, so ONE bad module yields one failure entry
 * rather than losing the batch. The batch only "crashes" when the process itself dies.
 */
const CHILD = `
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";
// With \`node -e SCRIPT ARG\`, user args start at argv[1], not argv[2].
const paths = JSON.parse(process.argv[1]);
const outFile = process.argv[2];
const members = [];
const failures = [];
for (const p of paths) {
  try {
    const ns = await import(pathToFileURL(p).href);
    const keys = Object.keys(ns);
    members.push({ modulePath: p, keys: keys.map((k) => [k, typeof ns[k]]) });
  } catch (e) {
    failures.push({ modulePath: p, name: e?.name ?? "Error", code: e?.code ?? null, message: String(e?.message ?? e) });
  }
}
// Result goes to a FILE, never stdout. Importing a .test.js module RUNS its tests, and the
// runner's TAP output would otherwise interleave with the JSON — which is exactly what happened
// on the first live run: 525 batches reported UnparseableChildOutput. Test files having
// import-time side effects is a real property of this closure, not an accident to route around
// silently.
writeFileSync(outFile, JSON.stringify({ members, failures }));
`;

function runBatch(modulePaths, index) {
  const outFile = join(tmpdir(), `5q-rt-batch-${index}-${modulePaths.length}.json`);
  const res = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", CHILD, JSON.stringify(modulePaths), outFile],
    {
      cwd: REPO,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      // Sanitized environment: no provider credentials reach an import-time side effect.
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: "test",
        SIMURGH_SKIP_DOTENV: "1",
      },
    }
  );

  // A non-zero status is NOT itself a crash here: node:test exits non-zero when an imported test
  // file has a failing test, which says nothing about whether the census result was written.
  // The result file is the authority.
  if (!existsSync(outFile)) {
    return {
      index,
      crashed: true,
      modulePaths,
      error_class: res.signal ? `signal:${res.signal}` : `exit:${res.status}`,
      message: (res.stderr ?? "").slice(0, 200),
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(outFile, "utf8"));
    rmSync(outFile, { force: true });
    const members = [];
    for (const m of parsed.members) {
      for (const [key, t] of m.keys) {
        members.push({
          module_path: m.modulePath,
          symbol: key,
          kind: t === "function" ? "function" : "constant",
        });
      }
    }
    const failures = parsed.failures.map((f) => ({
      module_path: f.modulePath,
      error_class: f.code ?? f.name,
      message: String(f.message).slice(0, 300),
      batch_index: index,
    }));
    return { index, members, failures };
  } catch (e) {
    return {
      index,
      crashed: true,
      modulePaths,
      error_class: "UnparseableChildOutput",
      message: String(e.message),
    };
  }
}

function main(argv) {
  const mode = (argv.find((a) => a.startsWith("--mode=")) ?? "--mode=collect").split("=")[1];
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : null;

  const paths = collectModulePaths();
  const batches = [];
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    batches.push(runBatch(paths.slice(i, i + BATCH_SIZE), batches.length));
  }
  const { members, failures } = mergeBatchResults(batches);

  console.log(`Stage 5Q runtime census — mode=${mode}`);
  console.log(`  modules attempted : ${paths.length}`);
  console.log(
    `  batches           : ${batches.length} (size ${BATCH_SIZE}, timeout ${TIMEOUT_MS}ms)`
  );
  console.log(`  runtime members   : ${members.length}`);
  console.log(`  failures          : ${failures.length}`);
  for (const f of failures.slice(0, 12)) {
    console.log(`    ✗ ${f.module_path}  [${f.error_class}] ${f.message.slice(0, 90)}`);
  }
  if (failures.length > 12) console.log(`    … and ${failures.length - 12} more`);

  if (out) {
    writeFileSync(out, `${JSON.stringify({ mode, members, failures }, null, 2)}\n`);
  }

  if (mode === "verify") {
    const v = verifyRuntimeCensus({ failures });
    if (!v.ok) {
      console.log(`\n  VERIFY FAILED: ${v.blockers.length} unresolved import failure(s).`);
      console.log(`  ${v.blockers[0].reason}`);
      return 1;
    }
    console.log("  VERIFY OK — every module in the closure imports");
  }
  return 0;
}

process.exit(main(process.argv.slice(2)));
