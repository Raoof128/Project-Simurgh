// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 17: build or verify the instrument lock.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs [--output <path>]
//   node tools/simurgh-attestation/stage5r/node/lockInstrument.mjs --verify

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { canonicalJson } from "../../canonicalise.mjs";
import { buildLock, verifyLock, LOCKED_PATHS } from "../core/instrumentLock.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../..");
const DEFAULT_OUT = join(REPO, "docs/research/llm-shield/evidence/stage-5r/instrument-lock.json");

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = argv.indexOf("--output");
  return {
    output: o === -1 ? DEFAULT_OUT : argv[o + 1],
    verify: argv.includes("--verify"),
    root: (() => {
      const r = argv.indexOf("--root");
      return r === -1 ? REPO : argv[r + 1];
    })(),
  };
}

/** Read the census from a tree; a missing file is reported as missing, never as "". */
export function readFiles(root) {
  const files = {};
  for (const p of LOCKED_PATHS) {
    const full = join(root, p);
    if (existsSync(full)) files[p] = readFileSync(full, "utf8");
  }
  return files;
}

/** The runtime identity the lock records. */
export function runtimeIdentity() {
  return {
    node_version: process.versions.node,
    node_executable_realpath: realpathSync(process.execPath),
    platform: process.platform,
    arch: process.arch,
  };
}

/** @param {string[]} argv @returns {number} exit code */
export function main(argv) {
  const { output, verify, root } = parseArgs(argv);
  const files = readFiles(root);

  if (verify) {
    if (!existsSync(DEFAULT_OUT)) {
      process.stderr.write("INSTRUMENT LOCK MISSING — the campaign may not start without one\n");
      return 2;
    }
    const lock = JSON.parse(readFileSync(DEFAULT_OUT, "utf8"));
    const r = verifyLock({ lock, files });
    if (r.ok) {
      process.stdout.write(`INSTRUMENT LOCK VERIFIED: ${lock.entry_count} paths unchanged\n`);
      return 0;
    }
    process.stderr.write("INSTRUMENT DRIFT — the campaign must not run:\n");
    for (const p of r.drifted) process.stderr.write(`  changed: ${p}\n`);
    for (const p of r.added) process.stderr.write(`  added:   ${p}\n`);
    for (const p of r.removed) process.stderr.write(`  removed: ${p}\n`);
    return 1;
  }

  const lock = buildLock({ files, runtime: runtimeIdentity() });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${canonicalJson(lock)}\n`, "utf8");
  process.stdout.write(
    [
      `wrote ${output}`,
      `  ${lock.entry_count} campaign-affecting paths locked`,
      `  ${lock.not_locked.length} paths named as OUT of the lock, each with a reason`,
      `  runtime ${lock.runtime.node_version} ${lock.runtime.platform}/${lock.runtime.arch}`,
      "",
    ].join("\n")
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
