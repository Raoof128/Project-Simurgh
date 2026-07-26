#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — stage-tray builder (Task 14).
//
//   node .../buildTray.mjs --stage 5a [--no-positive-path]
//
// Builds one tray from the COMMITTED closure, the committed role file, the committed obligation
// matrix and the Task 12 mutation receipts. Nothing here chooses its own inputs: every one of them
// was frozen before any attack ran, which is the whole content of L2.
//
// THE POSITIVE PATH RUNS IN A SCRATCH WORKTREE (gauntlet P1-24). Many reproduce scripts regenerate
// evidence; running one in the primary worktree would write to frozen prior-stage paths and break
// §6.1 read-only. Its purpose is to prove the attacks did not break the thing they attacked — a
// tray reporting no findings while the stage's own reproduce script has stopped passing is
// reporting on rubble.

import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { buildTray, selectTargets, validateSummary, classifyPositivePath } from "../core/tray.mjs";
import { admissibility } from "../core/harness.mjs";
import { ATTACK_CLASSES } from "../core/constants.mjs";

const REPO = process.cwd();
const E = "docs/research/llm-shield/evidence/stage-5q";
const REPRODUCE_TIMEOUT_MS = 600_000;

let scratch = null;
const removeScratch = () => {
  if (!scratch) return;
  spawnSync("git", ["worktree", "remove", "--force", scratch], { cwd: REPO });
  rmSync(scratch, { recursive: true, force: true });
  scratch = null;
};
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    removeScratch();
    process.exit(130);
  });
}
process.on("exit", removeScratch);

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/**
 * Run the stage's reproduce script in a scratch worktree.
 *
 * The environment is not assumed usable: an absent Node 26 or an absent script is reported as its
 * own frozen value rather than folded into a failure. `reproduction_failed` and
 * `reproduced_with_diff` stay distinct (P1-23) — "did not run" is the worse fact and merging them
 * would hide it.
 */
function runPositivePath(stageId) {
  // NOT `stageId.slice(1)`. That produced `…-stagea.sh`, which does not exist, so the very
  // first real tray reported `script_absent` for a script that is right there. A false
  // `script_absent` is worse than a failure: it reads as "nothing to verify" and would have
  // mislabelled the positive path of all sixteen trays.
  const script = `scripts/reproduce-llm-shield-stage${stageId}.sh`;
  if (!existsSync(join(REPO, script))) {
    return { result: "script_absent", script, exit: null };
  }
  removeScratch();
  scratch = join(REPO, ".git", `5q-tray-${stageId}`);
  rmSync(scratch, { recursive: true, force: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (add.status !== 0) {
    return {
      result: "environment_unreproducible",
      script,
      exit: null,
      detail: "scratch worktree failed",
    };
  }
  try {
    const res = spawnSync("bash", [script], {
      cwd: scratch,
      encoding: "buffer",
      timeout: REPRODUCE_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, SIMURGH_SKIP_DOTENV: "1" },
    });
    const log = Buffer.concat([res.stdout ?? Buffer.alloc(0), res.stderr ?? Buffer.alloc(0)]);
    // A dirty scratch tree after the run means the script regenerated evidence that differs.
    const diff =
      spawnSync("git", ["status", "--short"], { cwd: scratch, encoding: "utf8" }).stdout.trim() !==
      "";
    return {
      result: classifyPositivePath({ scriptExists: true, exit: res.status, diff }),
      script,
      exit: res.status,
      signal: res.signal ?? null,
      log_digest: createHash("sha256").update(log).digest("hex"),
      log_tail: log.toString("utf8").split("\n").slice(-6).join(" | ").slice(0, 300),
    };
  } finally {
    removeScratch();
  }
}

function main(argv) {
  const i = argv.indexOf("--stage");
  const stageId = i >= 0 ? argv[i + 1] : null;
  if (!stageId || !/^5[a-p]$/.test(stageId)) {
    console.log("usage: buildTray.mjs --stage 5a|…|5p [--no-positive-path]");
    return 1;
  }

  const closure = readJson(`${E}/closure/function-closure.json`);
  const committedClosureDigest = readFileSync(
    `${E}/closure/function-closure.json.digest`,
    "utf8"
  ).trim();
  const obligations = readJson(`${E}/closure/obligation-matrix.json`);
  const receiptsPath = `${E}/mutation/receipts.json`;
  const adm = admissibility(existsSync(receiptsPath) ? readJson(receiptsPath).receipts : []);

  const roles = new Map(closure.members.map((m) => [m.function_id, m.security_role]));
  const targets = selectTargets({ members: closure.members, roles, stageId });
  const targetSet = new Set(targets);

  // Cells for THIS tray's targets, straight from the frozen matrix. The tray does not decide which
  // obligations exist; it reports on the ones the universe already committed.
  const cells = obligations.cells.filter((c) => targetSet.has(c.function_id));
  const obligationRows = cells.map((c) => ({
    function_id: c.function_id,
    attack_class: c.attack_class,
    applicability: c.applicability,
    omission_reason: c.omission_reason,
    pack_id: null,
    premise_receipt_digest: null,
    observed_outcome: null,
    // NULL, not attacked_pass. No pack has run against this tray, and a status is a claim.
    discharge_status: null,
    finding_ids: [],
  }));

  const positivePath = argv.includes("--no-positive-path")
    ? { result: "environment_unreproducible", detail: "positive path not executed in this run" }
    : runPositivePath(stageId);

  const built = buildTray({
    stageId,
    closureDigest: committedClosureDigest,
    committedClosureDigest,
    targets,
    obligationRows,
    packIds: [],
    premiseReceipts: [],
    findingIds: [],
    positivePath,
    admissibility: adm,
    closureMemberIds: new Set(closure.members.map((m) => m.function_id)),
  });

  if (built.refused) {
    console.log(`REFUSED: ${built.refusal_reason}\n  ${built.detail}`);
    return 1;
  }

  const summaryCheck = validateSummary(built.record.summary);
  const obligated = obligationRows.filter((r) => r.applicability === "obligated").length;

  console.log(`Stage 5Q tray — ${built.record.tray_id}`);
  console.log(`  closure digest     : ${built.record.closure_digest}`);
  console.log(`  targets (rule)     : ${targets.length}`);
  console.log(`  obligation rows    : ${obligationRows.length}  (${obligated} obligated)`);
  console.log(
    `  applicable classes : ${built.record.applicable_classes.length}/${ATTACK_CLASSES.length}`
  );
  console.log(
    `  positive path      : ${positivePath.result}${positivePath.exit != null ? ` (exit ${positivePath.exit})` : ""}`
  );
  console.log(`  contract problems  : ${built.problems.length}`);
  for (const p of built.problems.slice(0, 5))
    console.log(`      ✗ ${p.kind} ${p.attack_class ?? p.function_id ?? ""}`);
  console.log(`  summary            : ${built.record.summary}`);
  console.log(`  summary check      : ${summaryCheck.ok ? "ok" : summaryCheck.problems[0].kind}`);

  const out = `${E}/trays/stage${stageId}.json`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(built.record, null, 2)}\n`);
  console.log(`  written            : ${out}`);

  return built.problems.length === 0 && summaryCheck.ok ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
