#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — closure commitment driver. THE L2 BOUNDARY (Task 8).
//
//   node .../commitClosure.mjs --source-commit <40-hex> [--write --out <path>]
//
// After this writes, the universe is frozen and attacks may run. Nothing it commits can be amended.
//
// `--out` is REQUIRED with `--write` so the two byte-stability builds land in DIFFERENT files. An
// earlier draft wrote twice to the same path and compared against a `.rerun` file nothing produced;
// `cmp` would have failed on a missing operand, and the stage's central byte-stability proof would
// have been a command that errors.
//
// `--source-commit` is REQUIRED and is never read from HEAD (gauntlet P1-16). Reading HEAD makes the
// value change the moment the artifact is committed, and naming the commit that CONTAINS the
// artifact is self-referential. A rerun supplies the recorded value; that is what makes the rebuild
// deterministic rather than merely repeatable-today.

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { staticCensus, rootFor } from "../core/censusStatic.mjs";
import { commitClosure, validateTagClosure, DOMAIN } from "../core/closureCommit.mjs";
import { STAGE5_RELEASE_TAGS } from "../core/historicalClosure.mjs";
import { ATTACK_CLASSES, ATTACK_CLASS_TITLES } from "../core/constants.mjs";

const REPO = process.cwd();
const E = "docs/research/llm-shield/evidence/stage-5q/closure";
const ROLES_PATH = "tools/simurgh-attestation/stage5q/roles/stage5-roles.json";
const HISTORICAL_PATH = `${E}/historical-function-closure.json`;
const OBLIGATIONS_PATH = `${E}/obligation-matrix.json`;
const EXTS = new Set([".mjs", ".js", ".py", ".lean", ".sh"]);
const ROOT_DIRS = [
  "tools/simurgh-attestation",
  "tests/e2e/llmShield",
  "tests/unit/llmShield",
  "proofs",
  "scripts",
];

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (EXTS.has(name.slice(name.lastIndexOf(".")))) {
      acc.push(relative(REPO, full).split(sep).join("/"));
    }
  }
  return acc;
}

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

function main(argv) {
  const arg = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  };
  const write = argv.includes("--write");
  const out = arg("--out");
  const sourceCommit = arg("--source-commit");

  if (!sourceCommit) {
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" });
    console.log("REFUSING: --source-commit is required and is never read from HEAD.");
    console.log("  Reading HEAD makes the value change the moment the artifact is committed, and");
    console.log("  naming the commit that CONTAINS the artifact is self-referential (P1-16).");
    console.log(`  HEAD is currently ${head.stdout.trim()} — record it and pass it explicitly:`);
    console.log(`    --source-commit ${head.stdout.trim()}`);
    return 1;
  }
  if (write && !out) {
    console.log("REFUSING: --write requires --out, so two builds land in different files.");
    return 1;
  }

  const paths = [];
  for (const d of ROOT_DIRS) paths.push(...walk(join(REPO, d)));
  const census = staticCensus({
    files: paths
      .filter((p) => rootFor(p) !== null)
      .sort()
      .map((path) => ({ path, bytes: readFileSync(join(REPO, path)) })),
  });

  // Preconditions. Task 8 may not run before 1.5, 7.6 and 7.7 — and "may not" here means the
  // driver refuses, not that a comment asks nicely.
  for (const [label, path] of [
    ["Task 6 role file", ROLES_PATH],
    ["Task 7.6 historical closure", HISTORICAL_PATH],
    ["Task 7.7 obligation matrix", OBLIGATIONS_PATH],
  ]) {
    if (!existsSync(path)) {
      console.log(`REFUSING: ${label} is absent (${path}). L2 commits all of them together.`);
      return 1;
    }
  }

  const roles = new Map(
    JSON.parse(readFileSync(ROLES_PATH, "utf8")).assignments.map((a) => [
      a.function_id,
      a.security_role,
    ])
  );
  const historical = JSON.parse(readFileSync(HISTORICAL_PATH, "utf8"));
  const obligations = JSON.parse(readFileSync(OBLIGATIONS_PATH, "utf8"));

  const historicalTagsByFunction = new Map();
  for (const m of historical.members) {
    if (!historicalTagsByFunction.has(m.function_id)) {
      historicalTagsByFunction.set(m.function_id, new Set());
    }
    historicalTagsByFunction.get(m.function_id).add(m.tag_name);
  }

  const tagClosure = STAGE5_RELEASE_TAGS.map((tag_name) => ({
    tag_name,
    commit_sha: historical.tag_pins[tag_name],
  }));
  const tagCheck = validateTagClosure({
    tags: tagClosure,
    expectedNames: STAGE5_RELEASE_TAGS,
    expectedShas: historical.tag_pins,
  });
  if (!tagCheck.ok) {
    console.log("REFUSING: the release tag closure does not validate");
    for (const p of tagCheck.problems) console.log(`    ${p.kind}  ${p.tag_name}`);
    return 1;
  }

  const result = commitClosure({
    members: census.members,
    roles,
    edges: census.edges,
    tagClosure,
    taxonomy: ATTACK_CLASSES,
    obligationMatrixRoot: obligations.obligation_matrix_root,
    historicalFunctionClosureDigest: historical.historical_function_closure_digest,
    historicalTagsByFunction,
    closureSourceCommit: sourceCommit,
  });

  console.log("Stage 5Q closure commitment — L2");
  console.log(`  members                       : ${result.member_count}`);
  console.log(`  tags                          : ${result.tag_count}`);
  console.log(`  taxonomy classes              : ${result.taxonomy_count}`);
  console.log(`  closure_source_commit         : ${result.closure_source_commit}`);
  console.log(`  closure_member_commitment     : ${result.closure_member_commitment_digest}`);
  console.log(`  release_tag_closure_digest    : ${result.release_tag_closure_digest}`);
  console.log(`  attack_taxonomy_digest        : ${result.attack_taxonomy_digest}`);
  console.log(`  historical_function_closure   : ${result.historical_function_closure_digest}`);
  console.log(`  obligation_matrix_root        : ${result.obligation_matrix_root}`);
  console.log(`  merkle_root                   : ${result.merkle_root}`);

  if (!write) {
    console.log("\n  (dry run — pass --write --out <path> to commit)");
    return 0;
  }

  // FOUR DIGESTS MEANS FOUR ARTIFACTS (gauntlet P1-15). A function that returns four roots while
  // writing one file leaves three roots unbacked by anything a reviewer can recompute.
  const memberPayload = {
    schema: "simurgh.vsr.closure-member-commitment.v1",
    note:
      "THE L2 BOUNDARY. Immutable. Annex A2: attack_pack_ids and coverage_status are NOT here — " +
      "they arrive in the Task 19 discharge overlay, which may not add, drop or re-key a member.",
    domain: DOMAIN.commitment,
    closure_source_commit: result.closure_source_commit,
    member_count: result.member_count,
    closure_member_commitment_digest: result.closure_member_commitment_digest,
    merkle_root: result.merkle_root,
    members: result.rows,
  };
  writeJson(out, memberPayload);
  writeFileSync(`${out}.digest`, `${result.closure_member_commitment_digest}\n`);

  writeJson(`${E}/release-tag-closure.json`, {
    schema: "simurgh.vsr.release-tag-closure.v1",
    note: "Sixteen (tag_name, commit_sha) pairs. A tag that moves is itself a finding (spec §3.1).",
    domain: DOMAIN.tagClosure,
    release_tag_closure_digest: result.release_tag_closure_digest,
    tags: tagClosure,
  });
  writeFileSync(`${E}/release-tag-closure.json.digest`, `${result.release_tag_closure_digest}\n`);

  writeJson(`${E}/attack-taxonomy.json`, {
    schema: "simurgh.vsr.attack-taxonomy.v1",
    note: "Frozen R1-R16. Identifiers are citable in findings forever (spec §4.1).",
    domain: DOMAIN.taxonomy,
    attack_taxonomy_digest: result.attack_taxonomy_digest,
    classes: ATTACK_CLASSES.map((id) => ({ id, title: ATTACK_CLASS_TITLES[id] })),
  });
  writeFileSync(`${E}/attack-taxonomy.json.digest`, `${result.attack_taxonomy_digest}\n`);

  writeJson(`${E}/commitment-receipt.json`, {
    schema: "simurgh.vsr.commitment-receipt.v1",
    note:
      "The joined receipt over all five committed roots. After this, the universe is frozen and " +
      "attacks may run (L2). Rebuild by re-running commitClosure.mjs with the recorded " +
      "closure_source_commit.",
    closure_source_commit: result.closure_source_commit,
    member_count: result.member_count,
    tag_count: result.tag_count,
    taxonomy_count: result.taxonomy_count,
    roots: {
      closure_member_commitment_digest: result.closure_member_commitment_digest,
      release_tag_closure_digest: result.release_tag_closure_digest,
      attack_taxonomy_digest: result.attack_taxonomy_digest,
      historical_function_closure_digest: result.historical_function_closure_digest,
      obligation_matrix_root: result.obligation_matrix_root,
      merkle_root: result.merkle_root,
    },
  });

  console.log(`\n  written: ${out} (+ .digest)`);
  console.log(`           ${E}/release-tag-closure.json (+ .digest)`);
  console.log(`           ${E}/attack-taxonomy.json (+ .digest)`);
  console.log(`           ${E}/commitment-receipt.json`);
  return 0;
}

// THE MAIN GUARD. Without it, `await import(...)` of this file RUNS it — which is finding 5Q-F003,
// the defect this stage froze against Stage 5M, committed here in our own drivers. Ten of them did
// it, and the K7 export census is what found them: it could not enumerate a module that exits
// during enumeration.
if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
