// SPDX-License-Identifier: AGPL-3.0-or-later
//
// The repo-wide Lean proof gate — Q1-F001. Discovers every proof, refuses every escape hatch,
// type-checks what it found, and proves on every run that it can still go red.
//
// Usage: node scripts/check-lean-proofs.mjs [--root DIR] [--floor N] [--no-typecheck]
//
// The floor is a COMMITTED MINIMUM, not a machine-proven monotone. Nothing here stops a patch
// from lowering it in the same commit that deletes a proof; that decrease is caught by review,
// and this comment exists so the guarantee is never read as stronger than it is.

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { GATE_REASONS, auditCorpus } from "./lib/leanProofGate.mjs";

// Raised from 38 to 39 in Stage 5S, in the task that ADDS the proof (§13, B12). Without the bump,
// deleting 5S's only proof later returns the repository to 38, the count guard stays green, and
// directory coverage silently loses a whole directory.
const DEFAULT_FLOOR = 39;

// The axiom sweep, appended to a scratch copy of each proof. Text can be hidden from a regex
// (audit E-1: `private axiom`, a macro expanding to `sorryAx`); the kernel's own axiom census
// cannot. Every theorem's axioms must lie in Lean's three standard ones, and no non-internal axiom
// may be declared. The sweep must print its summary line, or the gate treats it as not having run.
const STANDARD_AXIOMS = ["propext", "Quot.sound", "Classical.choice"];
const AXIOM_SWEEP = `
open Lean Elab Command in
#eval show CommandElabM Unit from do
  let env ← getEnv
  let mut thms : Nat := 0
  let mut bad : Array String := #[]
  for (n, ci) in env.constants.map₂.toList do
    match ci with
    | .thmInfo _ =>
      thms := thms + 1
      let axs ← liftCoreM (collectAxioms n)
      for a in axs do
        unless (${STANDARD_AXIOMS.map((a) => `a == \`\`${a}`).join(" || ")}) do
          bad := bad.push s!"{n} uses {a}"
    | .axiomInfo _ => unless n.isInternal do bad := bad.push s!"declared axiom {n}"
    | _ => pure ()
  logInfo m!"SIMURGH_AXIOM_SWEEP theorems={thms} nonstandard={bad}"
`;

function typecheckFile(path) {
  // `lean` exits 0 on a `sorry`-closed theorem — it is a warning. The escape scan, not this
  // call, is what makes an unproven proof fail. This catches genuine type errors, and, through
  // the appended sweep, any axiom the regex could not see.
  const scratch = mkdtempSync(join(tmpdir(), "simurgh-lean-sweep-"));
  try {
    const copy = join(scratch, path.split("/").pop());
    // `import Lean` must precede everything, so it is prepended: line numbers in any error below
    // are therefore one greater than in the committed file. No proof file carries imports of its own.
    writeFileSync(copy, "import Lean\n" + readFileSync(path, "utf8") + AXIOM_SWEEP);
    const output = execFileSync("lean", [copy], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    // Lean prints an `Array String` as `[...]` here (4.15 omits the `#`); accept both spellings.
    const line = /SIMURGH_AXIOM_SWEEP theorems=(\d+) nonstandard=#?\[(.*?)\]/s.exec(output);
    if (!line) {
      return {
        ok: false,
        reason: GATE_REASONS.AXIOM_SWEEP_SILENT,
        output: "the axiom sweep printed no summary — it did not run",
      };
    }
    if (line[2].trim() !== "") {
      return { ok: false, reason: GATE_REASONS.NONSTANDARD_AXIOM, output: line[2].trim() };
    }
    return { ok: true, output };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { ok: false, reason: GATE_REASONS.MISSING_LEAN, output: "lean is not on PATH" };
    }
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * W3, permanently. The gate poisons a scratch corpus and demands its own refusal, so every run
 * re-proves the camera works rather than trusting the day it was repaired. The poison never
 * touches the real proof tree, and the scratch root is removed on every path out.
 */
function selfTest() {
  const cases = [
    {
      name: "seeded sorry",
      body: "theorem seeded : True := by\n  sorry\n",
      reason: GATE_REASONS.ESCAPE_HATCH,
    },
    {
      name: "unterminated block comment",
      body: "theorem t : True := trivial\n/- open\nsorry\n",
      reason: GATE_REASONS.UNTERMINATED_COMMENT,
    },
  ];
  for (const { name, body, reason } of cases) {
    const root = mkdtempSync(join(tmpdir(), "simurgh-lean-selftest-"));
    try {
      mkdirSync(join(root, "stage5r"), { recursive: true });
      writeFileSync(join(root, "stage5r", "Poison.lean"), body);
      const verdict = auditCorpus({ root, floor: 1, typecheck: false });
      if (verdict.ok || verdict.failures[0]?.reason !== reason) {
        console.error(
          `FAIL: self-test — the gate did not refuse a ${name}. ` +
            `Expected ${reason}, got ${JSON.stringify(verdict.failures[0] ?? "a pass")}. ` +
            `A gate that cannot go red is not a gate.`
        );
        return false;
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
  return true;
}

function main(argv) {
  const arg = (flag, fallback) => {
    const at = argv.indexOf(flag);
    return at === -1 ? fallback : argv[at + 1];
  };
  const root = arg("--root", "proofs");
  const floor = Number(arg("--floor", String(DEFAULT_FLOOR)));
  const typecheck = !argv.includes("--no-typecheck");

  if (!selfTest()) return 1;

  const verdict = auditCorpus({ root, floor, typecheck, typecheckFile });
  if (!verdict.ok) {
    const f = verdict.failures[0];
    console.error(`FAIL: ${f.reason}\n  file:   ${f.file}\n  detail: ${f.detail}`);
    return 1;
  }

  console.log(
    `OK: ${verdict.count} Lean proof(s) discovered under ${root}/ (floor ${floor}), ` +
      `0 escape hatches, ${typecheck ? "all type-check on the three standard axioms" : "type-check skipped"}, ` +
      `self-test red on demand`
  );
  return 0;
}

// argv[1] is undefined under `node --input-type=module -e`; pathToFileURL throws on undefined, so
// an importer would crash on the very guard that exists to stop this module running on import.
// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

export { main, selfTest, typecheckFile };
