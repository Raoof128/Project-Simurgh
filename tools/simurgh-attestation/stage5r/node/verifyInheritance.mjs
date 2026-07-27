// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 2: verify the inheritance from the committed 5Q evidence.
//
// Usage:
//   node tools/simurgh-attestation/stage5r/node/verifyInheritance.mjs [--evidence <dir>] [--json]
//
// Exit codes: 0 everything verified; 1 at least one check failed (each named); 2 the evidence tree
// could not be read.
//
// Nothing here needs a private key. A verifier that required the producer's private key would not be
// a verifier, and an earlier draft of the spec claimed 5Q's private key "must survive" for exactly
// this operation — it does not, and §10.1 now says so.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  INHERITED_FILES,
  ENVELOPE_FILE,
  INHERITED_ROOTS,
  verifyInheritance,
} from "../core/inherit.mjs";

const DEFAULT_EVIDENCE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/research/llm-shield/evidence/stage-5q"
);

/**
 * @param {string[]} argv
 * @returns {{evidenceDir: string, json: boolean}}
 */
export function parseArgs(argv) {
  const i = argv.indexOf("--evidence");
  return {
    evidenceDir: i === -1 ? DEFAULT_EVIDENCE : argv[i + 1],
    json: argv.includes("--json"),
  };
}

/**
 * Load the inherited tree. A file that cannot be read is omitted rather than substituted, so the
 * verifier sees "missing" and fails closed instead of seeing "" and comparing empty bytes.
 *
 * @param {string} evidenceDir
 * @returns {Record<string,string>}
 */
export function loadTree(evidenceDir) {
  const tree = {};
  for (const rel of [...Object.values(INHERITED_FILES), ENVELOPE_FILE]) {
    try {
      tree[rel] = readFileSync(join(evidenceDir, rel), "utf8");
    } catch {
      /* omitted on purpose — see above */
    }
  }
  return tree;
}

/**
 * @param {string[]} argv
 * @returns {number} exit code
 */
export function main(argv) {
  const { evidenceDir, json } = parseArgs(argv);
  const tree = loadTree(evidenceDir);
  if (Object.keys(tree).length === 0) {
    process.stderr.write(`EVIDENCE UNREADABLE: ${evidenceDir}\n`);
    return 2;
  }
  const result = verifyInheritance(tree);
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  if (!result.ok) {
    process.stderr.write(`INHERITANCE REFUSED (${result.failures.length} failure(s)):\n`);
    for (const f of result.failures) process.stderr.write(`  [${f.check}] ${f.detail}\n`);
    return 1;
  }
  const lines = ["INHERITANCE VERIFIED — roots first, signature last", ""];
  for (const [name, digest] of Object.entries(INHERITED_ROOTS)) {
    lines.push(`  ${name.padEnd(36)} ${digest}`);
  }
  lines.push("");
  for (const c of result.checks) lines.push(`  ✓ ${c.name.padEnd(20)} ${c.detail}`);
  lines.push("");
  lines.push(`  signer ${result.signer.profile_id} · key ${result.signer.public_key_digest}`);
  lines.push("  verified with the committed PUBLIC key; no private key was read");
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

// Main guard from the first commit.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
