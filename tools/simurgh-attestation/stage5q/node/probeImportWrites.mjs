#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the import-time write probe (finding 5Q-F003).
//
//   node .../probeImportWrites.mjs [--write]
//
// `tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs` is a top-level script with no
// main guard. IMPORTING IT RUNS THE CEREMONY, and the last thing the ceremony does is
// `writeFileSync` over a committed evidence file. Any tool that enumerates modules by importing
// them — 5Q's own runtime census, a coverage instrument, a documentation generator — silently
// rewrites Stage 5M's published Lane C-adv capture as a side effect of looking at it.
//
// THIS IS NOT HYPOTHETICAL. It happened to this branch. Commit 659ef95e ("Task 3 — runtime-visible
// census") carried a modification to
// `docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json` that no human
// wrote: the census imported the module, the module re-ran, and it replaced a capture reading
// "6 contained, 0 bypasses" with one reading "1 contained, 5 bypasses". The write-surface verifier
// caught it over the branch range; the file has since been restored to its published bytes.
//
// THE PROBE RUNS IN A SCRATCH WORKTREE, ALWAYS. Demonstrating an unwanted write by performing it in
// the primary tree would be the same mistake with a better excuse.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";

const REPO = process.cwd();
const TARGET = "docs/research/llm-shield/evidence/stage-5m/real-lanec/lanec-local-capture.json";
const MODULE = "tools/simurgh-attestation/stage5m/lanec/apply-local-adversary.mjs";
const OUT = "docs/research/llm-shield/evidence/stage-5q/findings/F003/import-write-probe.json";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

let scratch = null;
const removeScratch = () => {
  if (!scratch) return;
  spawnSync("git", ["worktree", "remove", "--force", scratch], { cwd: REPO });
  rmSync(scratch, { recursive: true, force: true });
  scratch = null;
};
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    removeScratch();
    process.exit(130);
  });
}
process.on("exit", removeScratch);

function main(argv) {
  removeScratch();
  scratch = join(REPO, ".git", "5q-f003-probe");
  rmSync(scratch, { recursive: true, force: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (add.status !== 0) {
    console.log(`REFUSING: scratch worktree failed — ${add.stderr?.trim()}`);
    return 1;
  }

  try {
    const before = readFileSync(join(scratch, TARGET));
    // A BARE IMPORT. No arguments, no ceremony invoked by hand — the import IS the whole action,
    // which is the point: nothing here asks the module to do anything.
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", `await import("./${MODULE}");`],
      {
        cwd: scratch,
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 16 * 1024 * 1024,
        env: { PATH: process.env.PATH, NODE_ENV: "test", SIMURGH_SKIP_DOTENV: "1" },
      }
    );
    const after = readFileSync(join(scratch, TARGET));

    const beforeDigest = sha256(before);
    const afterDigest = sha256(after);
    const rewritten = beforeDigest !== afterDigest;

    const beforeJson = JSON.parse(before.toString("utf8"));
    const afterJson = JSON.parse(after.toString("utf8"));

    // Which other committed paths did the bare import touch? A single named file is a bug; a set of
    // them is a blast radius, and the difference matters to anyone deciding what to re-verify.
    const dirty = spawnSync("git", ["status", "--short"], { cwd: scratch, encoding: "utf8" })
      .stdout.split("\n")
      .map((l) => l.slice(3).trim())
      .filter(Boolean)
      .sort();

    const record = {
      schema: "simurgh.vsr.f003-import-write-probe.v1",
      discovered_by: "stage5q_q0_attack_pack",
      corroborated_by: [],
      note:
        "A bare `await import(...)` of a committed module, executed in a scratch worktree at HEAD. " +
        "No function was called. Every write below is a side effect of module evaluation.",
      module: MODULE,
      module_source_digest: sha256(readFileSync(join(scratch, MODULE))),
      target_path: TARGET,
      import_exit: child.status,
      import_signal: child.signal ?? null,
      digest_before: beforeDigest,
      digest_after: afterDigest,
      committed_evidence_rewritten_by_import: rewritten,
      paths_dirtied_by_the_import: dirty,
      // The claim the file carries before and after. Two contradictory readings of one artifact,
      // shaped for the `contradicts` premise predicate (spec §4.4).
      vectors: [
        { subject: TARGET, summary: beforeJson.summary, captured_at: beforeJson.captured_at },
        { subject: TARGET, summary: afterJson.summary, captured_at: afterJson.captured_at },
      ],
    };

    console.log("Stage 5Q — import-time write probe (5Q-F003)");
    console.log(`  module                 : ${MODULE}`);
    console.log(`  bare import exit       : ${child.status}`);
    console.log(`  digest before          : ${beforeDigest}`);
    console.log(`  digest after           : ${afterDigest}`);
    console.log(`  evidence rewritten     : ${rewritten}`);
    console.log(`  paths dirtied          : ${dirty.length}`);
    for (const p of dirty) console.log(`      ✗ ${p}`);
    console.log(
      `  summary before         : ${JSON.stringify(beforeJson.summary)} @ ${beforeJson.captured_at}`
    );
    console.log(
      `  summary after          : ${JSON.stringify(afterJson.summary)} @ ${afterJson.captured_at}`
    );

    if (argv.includes("--write")) {
      mkdirSync(dirname(join(REPO, OUT)), { recursive: true });
      writeFileSync(join(REPO, OUT), `${JSON.stringify(record, null, 2)}\n`);
      console.log(`  written                : ${OUT}`);
    } else {
      console.log("\n  (dry run — pass --write to emit the finding artifact)");
    }
    return 0;
  } finally {
    removeScratch();
    if (existsSync(scratch ?? "")) rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
