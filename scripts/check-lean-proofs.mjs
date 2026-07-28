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
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { GATE_REASONS, auditCorpus } from "./lib/leanProofGate.mjs";

const DEFAULT_FLOOR = 38;

function typecheckFile(path) {
  try {
    // `lean` exits 0 on a `sorry`-closed theorem — it is a warning. The escape scan, not this
    // call, is what makes an unproven proof fail. This catches genuine type errors only.
    const output = execFileSync("lean", [path], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output };
  } catch (err) {
    if (err.code === "ENOENT") {
      return { ok: false, reason: GATE_REASONS.MISSING_LEAN, output: "lean is not on PATH" };
    }
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() };
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
      `0 escape hatches, ${typecheck ? "all type-check" : "type-check skipped"}, ` +
      `self-test red on demand`
  );
  return 0;
}

// argv[1] is undefined under `node --input-type=module -e`; pathToFileURL throws on undefined, so
// an importer would crash on the very guard that exists to stop this module running on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}

export { main, selfTest, typecheckFile };
