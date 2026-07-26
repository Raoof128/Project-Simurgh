#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — role-assignment checker (Task 6, spec §2.4).
//
// Loads the committed role file, rebuilds the census and the reachability graph, and runs the
// adversarial check over the REAL graph rather than a fixture. A role checker that has only ever
// seen fixtures is not known to work against this repository.
//
//   node .../checkRoles.mjs
//   node .../checkRoles.mjs --inject <function_id>    fault injection: force one member to
//                                                     pure_transform and confirm the check fires
//
// `--inject` mutates nothing on disk. It rewrites the loaded declaration in memory, which is the
// point: the injection must exercise the checker, not the file.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { staticCensus, rootFor } from "../core/censusStatic.mjs";
import { buildReachability } from "../core/reconcile.mjs";
import { assignRoles, ROLE_RULES, validateRuleTable } from "../core/roleAssignment.mjs";

const REPO = process.cwd();
const ROLES_PATH = "tools/simurgh-attestation/stage5q/roles/stage5-roles.json";
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

function main(argv) {
  const ruleCheck = validateRuleTable(ROLE_RULES);
  if (!ruleCheck.ok) {
    console.log("FAIL: the rule table itself is unsound");
    for (const p of ruleCheck.problems) console.log(`    ${p.rule_id}: ${p.reason}`);
    return 1;
  }

  const files = [];
  for (const d of ROOT_DIRS) files.push(...walk(join(REPO, d)));
  const census = staticCensus({
    files: files
      .filter((p) => rootFor(p) !== null)
      .sort()
      .map((path) => ({ path, bytes: readFileSync(join(REPO, path)) })),
  });

  // THE VACUITY GUARD. The §2.4 check is a reachability check; over a graph with no resolved edges
  // it passes for every input, and passing is exactly what it looks like. That is not hypothetical:
  // it is what this driver did on its first real run, before the call graph existed (see
  // tests/unit/llmShield/stage5q/callGraph.test.js). A gate that cannot fail is a false green, and
  // this stage may not ship one.
  if (census.graph.resolved_edges === 0) {
    console.log("FAIL: the census produced ZERO resolved edges.");
    console.log("      A reachability check over an empty graph passes vacuously, so this run");
    console.log("      would report `violations: 0` while checking nothing at all.");
    return 1;
  }

  if (!existsSync(ROLES_PATH)) {
    console.log(`FAIL: ${ROLES_PATH} is absent — run measureStaticCensus --emit-role-skeleton`);
    return 1;
  }
  const roles = JSON.parse(readFileSync(ROLES_PATH, "utf8"));
  const declared = roles.assignments.map((a) => ({ ...a }));

  const injectIdx = argv.indexOf("--inject");
  let injected = null;
  if (injectIdx >= 0) {
    injected = argv[injectIdx + 1];
    const target = declared.find((d) => d.function_id === injected);
    if (!target) {
      console.log(`FAIL: --inject target not found in the role file: ${injected}`);
      return 1;
    }
    console.log(`FAULT INJECTION: ${injected}`);
    console.log(`    declared ${target.security_role} -> pure_transform (in memory only)`);
    target.security_role = "pure_transform";
  }

  const reachability = buildReachability({ members: census.members, edges: census.edges });
  const result = assignRoles({ members: census.members, declared, reachability });

  const byKind = {};
  for (const v of result.violations) byKind[v.kind] = (byKind[v.kind] ?? 0) + 1;

  console.log("Stage 5Q role check — spec §2.4");
  console.log(`  members            : ${census.members.length}`);
  console.log(`  graph              : ${JSON.stringify(census.graph)}`);
  console.log(`  declarations       : ${declared.length}`);
  console.log(`  assigned           : ${result.assigned.size}`);
  console.log(`  violations         : ${result.violations.length} ${JSON.stringify(byKind)}`);
  for (const v of result.violations.slice(0, 8)) {
    console.log(`    ✗ [${v.kind}] ${v.function_id}`);
    if (v.path) console.log(`        path: ${v.path.join("\n              -> ")}`);
  }

  if (injected) {
    // Fault injection asserts the OPPOSITE of the normal exit condition: the run is correct when
    // the check FIRES. A checker that has never rejected is not known to work.
    const fired = result.violations.some(
      (v) => v.function_id === injected && v.kind === "pure_transform_reachable_from_trust_decision"
    );
    console.log(fired ? "\n  INJECTION CAUGHT — the §2.4 check fires" : "\n  INJECTION MISSED");
    return fired ? 0 : 1;
  }
  return result.ok ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
