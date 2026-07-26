#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — historical function inventory driver (Task 7.6, Annex A3).
//
//   node .../inventoryHistorical.mjs --worktree-root /tmp/5q-inv [--out <path>]
//
// Checks out each of the sixteen Stage 5 release tags into a detached worktree, runs the SAME
// static census over it, and records the members. Then removes every worktree it created.
//
// IT ENUMERATES. IT DOES NOT ATTACK. No pack is loaded, no pack is run, and nothing in this file
// imports one. Enumerating and attacking in one pass is how a universe ends up sized to the attacks
// that happened to work.
//
// A tag that cannot be checked out yields ZERO members and one entry in
// `historical_inventory_failures`. It never yields a member-shaped placeholder: a phantom member is
// worse than an absent one, because it counts.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { staticCensus, rootFor } from "../core/censusStatic.mjs";
import {
  historicalClosure,
  checkTagPins,
  STAGE5_RELEASE_TAGS,
} from "../core/historicalClosure.mjs";

const REPO = process.cwd();
const EXTS = new Set([".mjs", ".js", ".py", ".lean", ".sh"]);
const ROOT_DIRS = [
  "tools/simurgh-attestation",
  "tests/e2e/llmShield",
  "tests/unit/llmShield",
  "proofs",
  "scripts",
];
const OUT_DEFAULT =
  "docs/research/llm-shield/evidence/stage-5q/closure/historical-function-closure.json";

const git = (args, opts = {}) => spawnSync("git", args, { cwd: REPO, encoding: "utf8", ...opts });

function walk(dir, base, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, base, acc);
    else if (EXTS.has(name.slice(name.lastIndexOf(".")))) {
      acc.push(relative(base, full).split(sep).join("/"));
    }
  }
  return acc;
}

/** Census one checked-out tree. Returns members only — no attack, no pack, no verdict. */
function censusTree(root) {
  const paths = [];
  for (const d of ROOT_DIRS) paths.push(...walk(join(root, d), root));
  const files = paths
    .filter((p) => rootFor(p) !== null)
    .sort()
    .map((path) => ({ path, bytes: readFileSync(join(root, path)) }));
  const census = staticCensus({ files });
  return census.members.map((m) => ({
    function_id: m.function_id,
    source_digest: m.source_digest,
    category: m.category,
  }));
}

function main(argv) {
  const wtIdx = argv.indexOf("--worktree-root");
  const worktreeRoot = wtIdx >= 0 ? argv[wtIdx + 1] : "/tmp/5q-inv";
  const outIdx = argv.indexOf("--out");
  const out = outIdx >= 0 ? argv[outIdx + 1] : OUT_DEFAULT;

  mkdirSync(worktreeRoot, { recursive: true });

  // §3.1: the closure is frozen by (tag_name, commit_sha) pairs, and "a tag that moves is itself a
  // finding". Resolve every pin BEFORE any checkout, so the receipt records what was observed.
  const observed = {};
  for (const tag of STAGE5_RELEASE_TAGS) {
    const r = git(["rev-list", "-n", "1", tag]);
    if (r.status === 0) observed[tag] = r.stdout.trim();
  }

  const tagRecords = [];
  for (const tag of STAGE5_RELEASE_TAGS) {
    const sha = observed[tag];
    if (!sha) {
      tagRecords.push({ tag_name: tag, commit_sha: null, failure: { reason: "tag_absent" } });
      console.log(`  ✗ ${tag}  tag_absent`);
      continue;
    }
    const dir = join(worktreeRoot, tag.replace(/[^\w.-]/g, "_"));
    // Remove any leftover from an interrupted run before adding, or `worktree add` refuses.
    git(["worktree", "remove", "--force", dir], { stdio: "ignore" });
    const add = git(["worktree", "add", "--detach", "--quiet", dir, sha]);
    if (add.status !== 0) {
      tagRecords.push({
        tag_name: tag,
        commit_sha: sha,
        failure: { reason: "checkout_failed", detail: (add.stderr ?? "").slice(0, 200) },
      });
      console.log(`  ✗ ${tag}  checkout_failed`);
      continue;
    }
    try {
      const members = censusTree(dir);
      tagRecords.push({ tag_name: tag, commit_sha: sha, members });
      console.log(`  ✓ ${tag}  ${String(members.length).padStart(5)} members  ${sha.slice(0, 8)}`);
    } catch (error) {
      tagRecords.push({
        tag_name: tag,
        commit_sha: sha,
        failure: { reason: "parse_failed", detail: String(error.message).slice(0, 200) },
      });
      console.log(`  ✗ ${tag}  parse_failed`);
    } finally {
      git(["worktree", "remove", "--force", dir]);
    }
  }
  git(["worktree", "prune"]);

  const closure = historicalClosure({ tagRecords });
  const pins = checkTagPins({ pinned: observed, observed });

  const payload = {
    schema: "simurgh.vsr.historical-function-closure.v1",
    note:
      "Annex A3. ENUMERATION ONLY — no attack pack is loaded or run by the tool that produced " +
      "this file. Members are keyed by (tag_name, function_id): the same function_id in two tags " +
      "with different source_digests is two members, and that difference is the drift R12 exists " +
      "to find.",
    tag_pins: observed,
    tag_pin_check: pins,
    tag_count: STAGE5_RELEASE_TAGS.length,
    member_count: closure.members.length,
    historical_inventory_failures: closure.historical_inventory_failures,
    historical_function_closure_digest: closure.historical_function_closure_digest,
    members: closure.members,
  };
  mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);

  console.log("");
  console.log(`  tags enumerated    : ${STAGE5_RELEASE_TAGS.length}`);
  console.log(`  members            : ${closure.members.length}`);
  console.log(`  inventory failures : ${closure.historical_inventory_failures.length}`);
  console.log(`  digest             : ${closure.historical_function_closure_digest}`);
  console.log(`  written            : ${out}`);

  // A failure does not crash the run — it is committed EXPLICITLY and stays visible in the receipt
  // (Annex A3). Task 8 then either blocks on it or commits the gap knowingly.
  if (closure.historical_inventory_failures.length > 0) {
    console.log("\n  GAPS COMMITTED EXPLICITLY — Task 8 must decide on each:");
    for (const f of closure.historical_inventory_failures) {
      console.log(`    ${f.tag_name}  ${f.reason}`);
    }
    return 1;
  }
  return 0;
}

process.exit(main(process.argv.slice(2)));
