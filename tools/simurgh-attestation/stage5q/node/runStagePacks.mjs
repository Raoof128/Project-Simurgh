#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — the stage attack-pack runner (Task 14's packs, executed).
//
//   node .../runStagePacks.mjs [--stage 5p] [--write]
//
// Runs the six control-free probe families (core/probeFamilies.mjs) against every tray target of
// every attacked stage, and emits one discharge record per (member, class) cell that was genuinely
// measured. A cell the probe could not establish gets NO record — three different ways of learning
// nothing must not look like a cell that held.
//
// IT RUNS IN A SCRATCH WORKTREE, ALWAYS, AND IN CHILD PROCESSES.
//
// Both halves are load-bearing and both were paid for:
//
//   the worktree      importing a closure module can WRITE to committed evidence (5Q-F003, proved
//                     twice on this branch). The probes import hundreds of modules. In the primary
//                     tree that is evidence destruction dressed as coverage.
//
//   the child         75 modules call process.exit() at import time when no provider credential is
//                     present, and a probe hands arbitrary operands to arbitrary functions. One
//                     process.exit(), one infinite loop or one OOM in-process would end the run
//                     and take every result with it.
//
// A BATCH THAT DIES YIELDS FAILURES FOR THE WHOLE BATCH, NEVER A SHORT LIST. "These members have no
// probe results" and "we never found out" must never be the same output — that is R7, census
// truncation, committed by the tool that measures coverage.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { FAMILIES, familiesFor, dischargeFor } from "../core/probeFamilies.mjs";
import { obligationId } from "../core/obligations.mjs";
import { makePremiseReceipt } from "../core/premiseReceipt.mjs";
import { FULL_OBLIGATION_ROLES } from "../core/tray.mjs";

const REPO = process.cwd();
const E = "docs/research/llm-shield/evidence/stage-5q";
const OUT_DIR = `${E}/packs`;
const BATCH_SIZE = 12;
const TIMEOUT_MS = 120_000;

const sha256 = (s) => createHash("sha256").update(Buffer.from(s, "utf8")).digest("hex");

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

/**
 * The pack id for a (stage, family) pair.
 *
 * Grammar: `5q-<slug>-r<n>-<nn>` (spec §4.3). The slug carries the stage and the family so a pack
 * id read in a finding three years from now still says what was run and against what.
 */
export function packIdFor(stageId, family, index) {
  const slug = `${stageId}-${family.family_id.replace(/[^a-z0-9]+/g, "")}`;
  return `5q-${slug}-${family.attack_class.toLowerCase()}-${String(index).padStart(2, "0")}`;
}

/** The child program. Imports one module and probes the named symbols inside it. */
const CHILD = `
import { familiesFor } from "PROBE_MODULE";
// ONE hole, not two. With \`node -e SCRIPT ARG1 ARG2\` there is no script path in argv, so user
// arguments begin at argv[1]. The runtime census shipped the two-hole version and got 667 failures
// and 0 members on its first live run; this is the same trap, in the same shape, one task later.
const [, payloadPath, outPath] = process.argv;
const { readFileSync, writeFileSync } = await import("node:fs");
const jobs = JSON.parse(readFileSync(payloadPath, "utf8"));
const out = [];
for (const job of jobs) {
  let ns = null;
  let importError = null;
  try {
    ns = await import(new URL(job.module_path, "file://" + process.cwd() + "/").href);
  } catch (error) {
    importError = String(error?.message ?? error).slice(0, 200);
  }
  for (const target of job.targets) {
    if (importError !== null) {
      out.push({ function_id: target.function_id, import_error: importError, results: [] });
      continue;
    }
    const value = ns[target.symbol];
    if (value === undefined) {
      out.push({ function_id: target.function_id, not_exported: true, results: [] });
      continue;
    }
    const results = [];
    for (const family of familiesFor(target.category, target.security_role)) {
      try {
        const r = family.run({ value });
        results.push({ family_id: family.family_id, attack_class: family.attack_class, ...r });
      } catch (error) {
        results.push({
          family_id: family.family_id,
          attack_class: family.attack_class,
          outcome: "probe_errored",
          detail: String(error?.message ?? error).slice(0, 200),
          premise: null,
        });
      }
    }
    out.push({ function_id: target.function_id, results });
  }
}
writeFileSync(outPath, JSON.stringify(out));
`;

function runBatch(jobs, index, tmpDir) {
  const payloadPath = join(tmpDir, `batch-${index}-in.json`);
  const outPath = join(tmpDir, `batch-${index}-out.json`);
  writeFileSync(payloadPath, JSON.stringify(jobs));
  const probeModule = new URL("../core/probeFamilies.mjs", import.meta.url).href;

  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", CHILD.replace("PROBE_MODULE", probeModule), payloadPath, outPath],
    {
      cwd: scratch,
      encoding: "utf8",
      timeout: TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      // No provider credential reaches a probe. A probe that could spend money is a probe nobody
      // will run twice.
      env: { PATH: process.env.PATH, NODE_ENV: "test", SIMURGH_SKIP_DOTENV: "1" },
    }
  );

  if (!existsSync(outPath)) {
    // The batch died. Every member in it becomes a NAMED failure — never a silently shorter list.
    const why =
      child.signal === "SIGTERM"
        ? `timed out after ${TIMEOUT_MS}ms`
        : `exited ${child.status}: ${String(child.stderr ?? "").slice(0, 160)}`;
    return jobs.flatMap((job) =>
      job.targets.map((t) => ({ function_id: t.function_id, batch_failure: why, results: [] }))
    );
  }
  const parsed = JSON.parse(readFileSync(outPath, "utf8"));
  rmSync(payloadPath, { force: true });
  rmSync(outPath, { force: true });
  return parsed;
}

/** Turn probe results into cell discharges. A result that established nothing yields nothing. */
export function dischargesFrom({ probeResults, stageId, closureDigest, packIndex }) {
  const discharges = [];
  const nothing = [];
  for (const entry of probeResults) {
    if (entry.import_error || entry.not_exported || entry.batch_failure) {
      nothing.push({
        function_id: entry.function_id,
        reason: entry.import_error
          ? "import_failed"
          : entry.not_exported
            ? "symbol_not_exported"
            : "batch_failure",
        detail: entry.import_error ?? entry.batch_failure ?? null,
      });
      continue;
    }
    for (const r of entry.results) {
      const status = dischargeFor(r.outcome);
      if (!status) {
        nothing.push({
          function_id: entry.function_id,
          attack_class: r.attack_class,
          reason: r.outcome,
          detail: r.detail,
        });
        continue;
      }
      const family = FAMILIES.find((f) => f.family_id === r.family_id);
      const packId = packIdFor(stageId, family, packIndex[family.family_id]);
      // The premise receipt binds THE PROBE'S OWN PREMISE BYTES. A pack that cannot show it built
      // a real case is inadmissible (§4.4), and the premise here is the thing the family measured:
      // that the constant was walked, or that the function was actually invoked.
      const premiseBytes = JSON.stringify(r.premise ?? {});
      discharges.push({
        obligation_id: obligationId({
          functionId: entry.function_id,
          attackClass: r.attack_class,
        }),
        function_id: entry.function_id,
        attack_class: r.attack_class,
        pack_id: packId,
        premise_receipt_digest: makePremiseReceipt({
          pack_id: packId,
          closure_digest: closureDigest,
          target_function_id: entry.function_id,
          fixture_digest: sha256(premiseBytes),
          predicate_id: "executionFabricated",
          predicate_args: { family: r.family_id },
        }).receipt_digest,
        observed_outcome: r.outcome,
        discharge_status: status,
        // Left empty here on purpose. Finding IDS are allocated by the ledger, which owns the
        // sequence; a runner that minted its own would produce two authorities for one namespace
        // and they would collide the first time either was re-run.
        finding_ids: [],
        family_id: r.family_id,
        detail: r.detail,
        // The premise BYTES, carried whole for a finding so the ledger can bind and a verifier can
        // recompute. Only for findings: a pass's premise is already summarised by its receipt, and
        // copying 1400 of them would make the artifact mostly padding.
        premise_fixture: status === "finding_frozen" ? (r.premise ?? null) : null,
        source: `pack:${packId}`,
      });
    }
  }
  return { discharges, nothing };
}

function main(argv) {
  const stageArgIdx = argv.indexOf("--stage");
  const onlyStage = stageArgIdx >= 0 ? argv[stageArgIdx + 1] : null;

  const closure = JSON.parse(readFileSync(`${E}/closure/function-closure.json`, "utf8"));
  const closureDigest = readFileSync(`${E}/closure/function-closure.json.digest`, "utf8").trim();

  const targets = closure.members.filter(
    (m) =>
      FULL_OBLIGATION_ROLES.includes(m.security_role) &&
      (!onlyStage || m.stage_id === onlyStage) &&
      ["exported_function", "exported_constant"].includes(m.category)
  );

  if (targets.length === 0) {
    console.log(`no invocable tray targets${onlyStage ? ` for stage ${onlyStage}` : ""}`);
    return 1;
  }

  // One pack per (stage, family). The index is stable so a pack id does not move between runs.
  const packIndex = Object.fromEntries(FAMILIES.map((f, i) => [f.family_id, i + 1]));

  removeScratch();
  scratch = join(REPO, ".git", "5q-packs");
  rmSync(scratch, { recursive: true, force: true });
  const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", scratch, "HEAD"], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (add.status !== 0) {
    console.log(`REFUSING: scratch worktree failed — ${add.stderr?.trim()}`);
    return 1;
  }
  const tmpDir = join(REPO, ".git", "5q-packs-tmp");
  mkdirSync(tmpDir, { recursive: true });

  console.log(`Stage 5Q attack packs — ${FAMILIES.length} families over ${targets.length} targets`);
  console.log(`  scope             : ${onlyStage ?? "all sixteen stages"}`);

  // Group by module so one import serves every target inside it.
  const byModule = new Map();
  for (const t of targets) {
    if (!byModule.has(t.module_path)) byModule.set(t.module_path, []);
    byModule.get(t.module_path).push({
      function_id: t.function_id,
      symbol: t.export_name_or_internal_symbol,
      category: t.category,
      security_role: t.security_role,
    });
  }
  const jobs = [...byModule.entries()].map(([module_path, ts]) => ({ module_path, targets: ts }));

  const probeResults = [];
  try {
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      probeResults.push(...runBatch(batch, i, tmpDir));
      process.stdout.write(
        `\r  batches           : ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(jobs.length / BATCH_SIZE)}`
      );
    }
  } finally {
    process.stdout.write("\n");
    rmSync(tmpDir, { recursive: true, force: true });
    removeScratch();
  }

  const { discharges, nothing } = dischargesFrom({
    probeResults,
    stageId: onlyStage ?? "all",
    closureDigest,
    packIndex,
  });

  const findings = discharges.filter((d) => d.discharge_status === "finding_frozen");
  const nothingBy = {};
  for (const n of nothing) nothingBy[n.reason] = (nothingBy[n.reason] ?? 0) + 1;

  console.log(`  members probed    : ${probeResults.length}`);
  console.log(`  cells discharged  : ${discharges.length - findings.length}`);
  console.log(`  cells with findings: ${findings.length}`);
  console.log(`  established nothing: ${nothing.length}  ${JSON.stringify(nothingBy)}`);
  for (const f of findings.slice(0, 15)) {
    console.log(`      ! ${f.attack_class} ${f.family_id}  ${f.function_id}`);
    console.log(`          ${String(f.detail).slice(0, 130)}`);
  }
  if (findings.length > 15) console.log(`      … and ${findings.length - 15} more`);

  if (argv.includes("--write")) {
    const out = `${OUT_DIR}/${onlyStage ?? "all"}-pack-results.json`;
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      `${JSON.stringify(
        {
          schema: "simurgh.vsr.stage-pack-results.v1",
          note:
            "Six control-free probe families. A probe that could not establish its premise emits " +
            "NO discharge: 'established nothing' is counted and named, never folded into a pass.",
          closure_digest: closureDigest,
          scope: onlyStage ?? "all",
          families: FAMILIES.map((f) => ({
            family_id: f.family_id,
            attack_class: f.attack_class,
            categories: f.categories,
            intent: f.intent,
            pack_id: packIdFor(onlyStage ?? "all", f, packIndex[f.family_id]),
          })),
          members_probed: probeResults.length,
          cells_discharged: discharges.length - findings.length,
          cells_with_findings: findings.length,
          established_nothing: nothing.length,
          established_nothing_by_reason: nothingBy,
          discharges,
          nothing,
        },
        null,
        2
      )}\n`
    );
    console.log(`  written           : ${out}`);
  } else {
    console.log("\n  (dry run — pass --write to emit the pack results)");
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main(process.argv.slice(2)));
}
