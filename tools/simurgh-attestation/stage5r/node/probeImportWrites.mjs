// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 7: does importing the inherited closure write to the tree?
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/probeImportWrites.mjs [--seed-writer] [--output <path>]
//
// Imports every stage5{a..q} core module INSIDE A SCRATCH WORKTREE and watches both trees. F003 says
// importing a closure module is not read-only; this is the detector that keeps 5R honest about it.
//
// --seed-writer plants a module that writes on import, so the detector's own red state is
// demonstrable rather than assumed. The seeded file lands in the scratch worktree and dies with it.

import { execFileSync } from "node:child_process";
import {
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  existsSync,
  symlinkSync,
  readdirSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { canonicalJson } from "../../canonicalise.mjs";
import {
  snapshotTree,
  diffSnapshots,
  classifyDamage,
  assertContained,
} from "../core/scratchTree.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DEFAULT_OUT = join(
  REPO,
  "docs/research/llm-shield/evidence/stage-5r/import-damage/probe.json"
);

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = argv.indexOf("--output");
  return {
    output: o === -1 ? DEFAULT_OUT : argv[o + 1],
    seedWriter: argv.includes("--seed-writer"),
  };
}

/** Every stage5{a..q} core module, relative to the repo root. */
export function closureModules(root) {
  const base = join(root, "tools/simurgh-attestation");
  const out = [];
  for (const dir of readdirSync(base, { withFileTypes: true })) {
    if (!dir.isDirectory() || !/^stage5[a-q]$/.test(dir.name)) continue;
    const core = join(base, dir.name, "core");
    if (!existsSync(core)) continue;
    for (const f of readdirSync(core)) {
      if (f.endsWith(".mjs")) out.push(`tools/simurgh-attestation/${dir.name}/core/${f}`);
    }
  }
  return out.sort();
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output, seedWriter } = parseArgs(argv);
  const primaryBefore = snapshotTree(REPO);
  const worktree = mkdtempSync(join(tmpdir(), "5r-import."));
  let report;
  try {
    execFileSync("git", ["worktree", "add", "--detach", worktree, "HEAD"], {
      cwd: REPO,
      stdio: "pipe",
    });
    const nm = join(REPO, "node_modules");
    if (existsSync(nm) && !existsSync(join(worktree, "node_modules"))) {
      symlinkSync(nm, join(worktree, "node_modules"), "dir");
    }
    const modules = closureModules(worktree);
    if (seedWriter) {
      const seeded = join(worktree, "tools/simurgh-attestation/stage5q/core/__seeded_writer.mjs");
      writeFileSync(
        seeded,
        'import { writeFileSync } from "node:fs";\n' +
          'writeFileSync(new URL("./__import_side_effect.txt", import.meta.url), "F003 again\\n");\n' +
          "export const seeded = true;\n"
      );
      modules.push("tools/simurgh-attestation/stage5q/core/__seeded_writer.mjs");
    }
    const scratchBefore = snapshotTree(worktree);

    // Import each module in its own child, so one throwing module does not hide the rest.
    const importFailures = [];
    for (const rel of modules) {
      try {
        execFileSync(
          process.execPath,
          ["--input-type=module", "-e", `await import(${JSON.stringify(join(worktree, rel))});`],
          {
            cwd: worktree,
            stdio: "pipe",
            timeout: 60000,
          }
        );
      } catch (err) {
        importFailures.push({
          module: rel,
          error: String(err.stderr ?? err.message)
            .split("\n")[0]
            .slice(0, 200),
        });
      }
    }

    const scratchDiff = diffSnapshots(scratchBefore, snapshotTree(worktree));
    const primaryDiff = diffSnapshots(primaryBefore, snapshotTree(REPO));
    const damage = classifyDamage({ scratchDiff, primaryDiff });
    // Containment: everything the scratch run touched must resolve inside the scratch root.
    assertContained(
      worktree,
      scratchDiff.added.concat(scratchDiff.modified).map((p) => join(worktree, p))
    );

    report = {
      schema: "simurgh.vpf.import-damage.v1",
      note:
        "F003 inherited as an operational constraint. Four snapshots: the scratch tree before and " +
        "after (the writes an import actually performed) and the primary tree before and after " +
        "(proof none escaped). Two snapshots of the primary alone cannot see the damage F003 names.",
      modules_imported: modules.length,
      import_failures: importFailures,
      scratch_writes: damage.scratch_writes,
      escaped_to_primary: damage.escaped,
      clean: damage.ok,
      seeded_writer: seedWriter,
    };
  } finally {
    try {
      execFileSync("git", ["worktree", "remove", "--force", worktree], {
        cwd: REPO,
        stdio: "pipe",
      });
    } catch {
      rmSync(worktree, { recursive: true, force: true });
    }
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(report)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${output}`,
      `  imported ${report.modules_imported} closure modules in a scratch worktree`,
      `  import failures      ${report.import_failures.length}`,
      `  scratch writes       ${report.scratch_writes.length}${report.scratch_writes.length ? ": " + report.scratch_writes.join(", ") : ""}`,
      `  escaped to primary   ${report.escaped_to_primary.length}`,
      `  clean                ${report.clean}`,
      "",
    ].join("\n")
  );
  return report.clean ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
