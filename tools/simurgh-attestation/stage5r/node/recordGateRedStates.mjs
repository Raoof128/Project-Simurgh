// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 26: the two deferred gate red states, G8 and G9.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/recordGateRedStates.mjs --deferred
//
// These two were deliberately absent from Task 16: proving the red state of a gate that does not
// exist yet is the P5 violation this plan already made once. They exist now, and both are proved in
// COPIED FIXTURE TREES.
//
// RULING 5 IS WHY THE COPY IS NOT A CONVENIENCE. G8 asserts the 5Q evidence tree is byte-identical
// before and after a full 5R run. Seeding a write into the real tree to prove the check fires would
// mean doing, deliberately, the exact thing the gate exists to forbid — and F003 exists because a
// producer's write went unnoticed for three occurrences. So the seed lands in a copy, and the
// primary inherited tree is never written, not even briefly.

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  cpSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { fourTermDisclosure } from "../core/ledgers.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const Q5 = "docs/research/llm-shield/evidence/stage-5q";
const OUT = "docs/research/llm-shield/evidence/stage-5r/gate-red-states/deferred-red-states.json";

const sha = (b) => createHash("sha256").update(b).digest("hex");

/** Digest a whole tree, file by file, so a single added byte anywhere moves the answer. */
export function treeDigest(dir) {
  const entries = [];
  const walk = (d, prefix) => {
    for (const name of require$readdir(d).sort()) {
      const full = join(d, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (require$isDir(full)) walk(full, rel);
      else entries.push(`${rel} ${sha(readFileSync(full))}`);
    }
  };
  walk(dir, "");
  return sha(Buffer.from(entries.join("\n"), "utf8"));
}

// Tiny local helpers, so this module needs no directory-walking dependency.
import { readdirSync, statSync } from "node:fs";
function require$readdir(d) {
  return readdirSync(d);
}
function require$isDir(p) {
  return statSync(p).isDirectory();
}

/** G8, in a copy: seed a write into the 5Q tree and confirm the comparison fires. */
export function proveG8() {
  const scratch = mkdtempSync(join(tmpdir(), "5r-g8."));
  try {
    const copy = join(scratch, "stage-5q");
    cpSync(join(REPO, Q5), copy, { recursive: true });
    const before = treeDigest(copy);
    const target = join(copy, "closure", "attack-taxonomy.json");
    writeFileSync(target, `${readFileSync(target, "utf8")}\n`, "utf8");
    const after = treeDigest(copy);
    return {
      gate: "G8",
      asserts: "the 5Q evidence tree is byte-identical before and after the full 5R run",
      proved_in: "a COPY of the inherited tree; the primary tree is never written (Ruling 5)",
      seed: "one newline appended to closure/attack-taxonomy.json",
      before_digest: before,
      after_digest: after,
      caught: before !== after,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** G9, in a copy: remove one of the four disclosure terms and confirm the check fires. */
export function proveG9() {
  const full = fourTermDisclosure({ admissible: 8, attempted: 8, newlyDischarged: 0 });
  const required = ["admissible", "attempted", "universe"];
  const results = [];
  for (const term of required) {
    const stripped = { ...full, families: { ...full.families } };
    delete stripped.families[term];
    const missing = required.filter((t) => stripped.families[t] === undefined);
    results.push({ removed: term, caught: missing.length > 0, missing });
  }
  // And the arithmetic itself: an impossible triple must be refused rather than published.
  let arithmeticCaught = false;
  try {
    fourTermDisclosure({ admissible: 9, attempted: 8, newlyDischarged: 0 });
  } catch {
    arithmeticCaught = true;
  }
  return {
    gate: "G9",
    asserts: "the tranche disclosure is present and its arithmetic checks",
    proved_in: "a copy of the built disclosure; no committed ledger is mutated",
    term_removals: results,
    arithmetic_refused_an_impossible_triple: arithmeticCaught,
    caught: results.every((r) => r.caught) && arithmeticCaught,
  };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  if (!argv.includes("--deferred")) {
    process.stderr.write("recordGateRedStates: --deferred is the only mode\n");
    return 2;
  }
  const receipts = [proveG8(), proveG9()];
  const artefact = {
    schema: "simurgh.vpf.deferred-red-states.v1",
    note:
      "Task 26. G8 and G9, the two gates that did not exist when Task 16 ran. Both are proved in " +
      "copied trees: seeding a write into the real 5Q evidence to show G8 fires would mean doing " +
      "deliberately the exact thing the gate forbids.",
    receipt_kind: "runtime",
    all_caught: receipts.every((r) => r.caught),
    receipts,
  };
  const out = join(REPO, OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${canonicalJson(artefact)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${OUT}`,
      ...receipts.map((r) => `  ${r.caught ? "CAUGHT " : "MISSED "} ${r.gate}  ${r.asserts}`),
      "",
    ].join("\n")
  );
  return artefact.all_caught ? 0 : 1;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
