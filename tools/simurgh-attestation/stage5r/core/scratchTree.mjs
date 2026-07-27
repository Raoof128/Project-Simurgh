// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5R — Task 7: snapshots and containment for the scratch worktree.
//
// 5Q finding F003 established that IMPORTING A CLOSURE MODULE IS NOT READ-ONLY: a module can write
// during import, and it took three occurrences before anyone noticed. 5R executes far more closure
// code than 5Q's probes did, so the constraint binds harder and the detector has to be built before
// anything imports anything.
//
// FOUR SNAPSHOTS, NOT TWO. An earlier draft snapshotted the primary tree, ran the imports in a
// scratch worktree, and snapshotted the primary again. That cannot see damage which lands in the
// scratch tree — which is precisely the damage F003 describes. Both trees are watched:
//
//   scratch, before → after   the writes the import actually performed
//   primary, before → after   proof that none of it escaped
//
// Containment is checked by realpath, not by string prefix, so a symlink cannot walk a write back
// into the primary tree while every path still "looks" contained.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, realpathSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Directories never worth digesting: huge, generated, or not ours. */
const SKIP = new Set([".git", "node_modules", ".remember"]);

/**
 * Digest every file under a directory, as a sorted path → sha256 map.
 *
 * @param {string} root
 * @param {{skip?: Set<string>}} [opts]
 * @returns {Record<string,string>}
 */
export function snapshotTree(root, opts = {}) {
  const skip = opts.skip ?? SKIP;
  const out = {};
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (skip.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        out[relative(root, full)] = "symlink";
        continue;
      }
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      out[relative(root, full)] = createHash("sha256").update(readFileSync(full)).digest("hex");
    }
  };
  walk(root);
  return out;
}

/**
 * Compare two snapshots.
 *
 * @param {Record<string,string>} before
 * @param {Record<string,string>} after
 * @returns {{added: string[], removed: string[], modified: string[], clean: boolean}}
 */
export function diffSnapshots(before, after) {
  const added = Object.keys(after)
    .filter((p) => !(p in before))
    .sort();
  const removed = Object.keys(before)
    .filter((p) => !(p in after))
    .sort();
  const modified = Object.keys(after)
    .filter((p) => p in before && before[p] !== after[p])
    .sort();
  return { added, removed, modified, clean: !added.length && !removed.length && !modified.length };
}

/**
 * Is `candidate` really inside `root`, after both are resolved through symlinks?
 *
 * A string-prefix check passes for a symlink that points anywhere at all, which is the whole reason
 * this is a separate function with its own tests.
 *
 * @param {string} root
 * @param {string} candidate
 * @returns {boolean}
 */
export function isContained(root, candidate) {
  if (!existsSync(candidate)) return false;
  const r = realpathSync(root);
  const c = realpathSync(candidate);
  return c === r || c.startsWith(r.endsWith(sep) ? r : r + sep);
}

/**
 * Assert containment or throw, naming the path that escaped.
 *
 * @param {string} root
 * @param {string[]} candidates
 */
export function assertContained(root, candidates) {
  for (const c of candidates) {
    if (!isContained(root, c)) {
      throw new Error(`scratch tree: ${c} resolves outside the scratch root ${root}`);
    }
  }
}

/**
 * Classify an import run's damage against the declared allowlist.
 *
 * @param {{scratchDiff: object, primaryDiff: object, allowlist?: string[]}} input
 * @returns {{ok: boolean, violations: string[], scratch_writes: string[], escaped: string[]}}
 */
export function classifyDamage({ scratchDiff, primaryDiff, allowlist = [] }) {
  const allowed = new Set(allowlist);
  const scratchWrites = [...scratchDiff.added, ...scratchDiff.modified, ...scratchDiff.removed];
  const violations = scratchWrites.filter((p) => !allowed.has(p));
  const escaped = [...primaryDiff.added, ...primaryDiff.modified, ...primaryDiff.removed];
  return {
    ok: violations.length === 0 && escaped.length === 0,
    violations: violations.sort(),
    scratch_writes: scratchWrites.sort(),
    escaped: escaped.sort(),
  };
}
