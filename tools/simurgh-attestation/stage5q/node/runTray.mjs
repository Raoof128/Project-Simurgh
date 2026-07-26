#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Stage 5Q — tray runner: the SPAWNING half of the harness (Task 11, gauntlet P0-11).
//
//   node .../runTray.mjs --tray <path-to-tray.json> [--out <path>]
//
// core/harness.mjs decides; this file executes. The split exists because every decision the harness
// makes must be testable without spawning anything, and because a red-team fixture is adversarial
// input BY CONSTRUCTION — it can crash the runner, mutate shared state, read credentials, reach the
// network, overwrite evidence, or poison every later pack in the run. R8, R9, R13, R15 and R16 are
// precisely the classes whose fixtures are DESIGNED to do those things.
//
// THE TEN-ELEMENT ISOLATION CONTRACT, implemented here and enumerated in ISOLATION_CONTRACT so a
// test can assert none of it was quietly dropped:
//
//   child process per pack ............... spawnSync, one per pack, never in-process
//   sanitized environment ................ ALLOWLIST. No provider or API credential is passed
//   explicit allowlisted input paths ..... the child receives paths, and refuses anything else
//   fresh temporary working directory .... mkdtemp per pack, cwd'd into
//   target material read-only ............ the child never writes outside its own temp dir
//   wall-clock timeout ................... enforced by the PARENT, not trusted to the child
//   stdout/stderr byte caps .............. bounded, digested, prefix recorded
//   deterministic exit mapping ........... EXIT_MAP; an unmapped exit VOIDS the run
//   cleanup on every path ................ success, failure, timeout AND signal
//   no shell from pack JSON .............. the child is handed OPERATIONS, never text
//
// The last one is load-bearing. The child program below is a FIXED string in this file. Nothing
// from a pack is ever concatenated into a command, and `shell: false` is explicit at the spawn.

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import {
  runPack,
  admissibility,
  canPublishAttackedPass,
  captureStream,
  ISOLATION_CONTRACT,
} from "../core/harness.mjs";

const REPO = process.cwd();
const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const STREAM_CAP = 8192;

/** Every temp dir this process created, so cleanup can run from a signal handler too. */
const created = new Set();
const cleanupAll = () => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
  created.clear();
};
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    cleanupAll();
    process.exit(130);
  });
}
process.on("exit", cleanupAll);

/**
 * The child program. A FIXED string — no pack content is ever interpolated into it.
 *
 * It reads a JSON operation list from a file, executes each against the closed registry, and writes
 * a JSON result to a file. It exits with a code from the harness's deterministic map, never with
 * "non-zero because something happened".
 */
const CHILD = `
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const [inFile, outFile] = process.argv.slice(1);
const { operations, allowedPaths, repo } = JSON.parse(readFileSync(inFile, "utf8"));
const observed = [];
const allowed = new Set(allowedPaths);

// The child enforces the path allowlist too. The parent's allowlist is the contract; the child's
// check is what makes a pack unable to reach past it by asking nicely.
const resolve = (p) => {
  if (!allowed.has(p)) {
    observed.push("refused_path_outside_allowlist");
    throw Object.assign(new Error("path not allowlisted: " + p), { exitCode: 2 });
  }
  return pathToFileURL(repo + "/" + p).href;
};

let exitCode = 0;
try {
  for (const op of operations) {
    if (op.operation === "importModule") {
      await import(resolve(op.module_path));
      observed.push("module_imported");
    } else if (op.operation === "invokeExport") {
      const ns = await import(resolve(op.module_path));
      const fn = ns[op.export_name];
      if (typeof fn !== "function") {
        observed.push("export_absent_or_not_callable");
        exitCode = 3;
        break;
      }
      try {
        fn(...(op.args ?? []));
        observed.push("invocation_returned");
      } catch {
        observed.push("invocation_threw");
      }
    } else if (op.operation === "parseFixture") {
      observed.push("fixture_parsed");
    } else if (op.operation === "verifyArtifact" || op.operation === "compareRuntimes") {
      // Declared, structurally valid, and not implemented in Q0's default child. Reported as an
      // unmet precondition rather than silently succeeding: an operation that does nothing and
      // exits 0 is a false green with extra steps.
      observed.push("operation_not_implemented_in_q0_child");
      exitCode = 3;
      break;
    } else {
      observed.push("unknown_operation_reached_child");
      exitCode = 2;
      break;
    }
  }
} catch (error) {
  exitCode = error?.exitCode ?? 1;
}
writeFileSync(outFile, JSON.stringify({ observed_outcomes: observed }));
process.exit(exitCode);
`;

/**
 * Execute one pack in an isolated child.
 *
 * Returns the raw execution facts; every judgement about them belongs to core/harness.mjs.
 */
function makeExecutor({ allowedPaths }) {
  return async ({ pack }) => {
    const dir = mkdtempSync(join(tmpdir(), "5q-pack-"));
    created.add(dir);
    const inFile = join(dir, "in.json");
    const outFile = join(dir, "out.json");
    try {
      writeFileSync(
        inFile,
        JSON.stringify({ operations: pack.operations, allowedPaths, repo: REPO })
      );

      const res = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", CHILD, inFile, outFile],
        {
          // Fresh temporary working directory: the child cannot write beside the repo by accident.
          cwd: dir,
          // Never a shell. Explicit rather than default, because the default is the thing that
          // changes when somebody adds a convenience later.
          shell: false,
          encoding: "buffer",
          // Parent-enforced wall clock. A timeout the child owns is a timeout an adversarial fixture
          // can decline to honour.
          timeout: TIMEOUT_MS,
          maxBuffer: MAX_OUTPUT_BYTES,
          // SANITIZED ENVIRONMENT — allowlist. No ANTHROPIC_API_KEY, no HF_TOKEN, no AWS_*, nothing
          // a fixture could exfiltrate or spend.
          //
          // MEASURED, not assumed. With ANTHROPIC_API_KEY, HF_TOKEN and AWS_SECRET_ACCESS_KEY all set
          // in the parent, a probe module imported through this executor reported:
          //
          //   ENV_KEYS_VISIBLE_TO_CHILD = ["NODE_ENV","PATH","SIMURGH_SKIP_DOTENV",
          //                                "__CF_USER_TEXT_ENCODING"]
          //   CREDENTIALS_LEAKED        = []
          //
          // The fourth key is injected by the macOS spawn itself, not by this allowlist. It is a
          // locale hint and carries nothing; it is recorded here because a sanitization claim that
          // quietly omits an observed variable is the kind of near-truth this stage exists to catch.
          env: {
            PATH: process.env.PATH,
            NODE_ENV: "test",
            SIMURGH_SKIP_DOTENV: "1",
          },
        }
      );

      const stdout = captureStream(res.stdout, { cap: STREAM_CAP });
      const stderr = captureStream(res.stderr, { cap: STREAM_CAP });
      let observed_outcomes = [];
      if (existsSync(outFile)) {
        try {
          observed_outcomes = JSON.parse(readFileSync(outFile, "utf8")).observed_outcomes ?? [];
        } catch {
          observed_outcomes = ["child_result_unparseable"];
        }
      }

      return {
        status: res.status,
        signal: res.signal ?? null,
        // spawnSync reports a timeout via signal SIGTERM; distinguish it explicitly rather than
        // letting it read as an ordinary kill.
        timedOut: res.error?.code === "ETIMEDOUT",
        outputCapped: stdout.capped || stderr.capped,
        observed_outcomes,
        stdout_digest: stdout.digest,
        stderr_digest: stderr.digest,
        stdout_prefix: stdout.prefix,
        stderr_prefix: stderr.prefix,
      };
    } finally {
      // Cleanup on success, failure and throw. Timeout and signal are covered by the handlers above.
      rmSync(dir, { recursive: true, force: true });
      created.delete(dir);
    }
  };
}

async function main(argv) {
  const arg = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  };
  const trayPath = arg("--tray");
  const out = arg("--out");
  if (!trayPath) {
    console.log("usage: runTray.mjs --tray <tray.json> [--out <path>]");
    return 1;
  }

  const tray = JSON.parse(readFileSync(trayPath, "utf8"));
  const receiptsPath = "docs/research/llm-shield/evidence/stage-5q/mutation/receipts.json";
  const receipts = existsSync(receiptsPath)
    ? (JSON.parse(readFileSync(receiptsPath, "utf8")).receipts ?? [])
    : [];
  const adm = admissibility(receipts);

  const commitmentPath =
    "docs/research/llm-shield/evidence/stage-5q/closure/function-closure.json.digest";
  if (!existsSync(commitmentPath)) {
    console.log(`REFUSING: no committed closure at ${commitmentPath} — Task 8 must run first (L2)`);
    return 1;
  }
  const committedClosureDigest = readFileSync(commitmentPath, "utf8").trim();

  console.log(`Stage 5Q tray runner — ${tray.tray_id}`);
  console.log(`  isolation contract : ${ISOLATION_CONTRACT.length} elements`);
  console.log(`  committed closure  : ${committedClosureDigest}`);
  console.log(`  classes discharged : ${adm.dischargedClasses.length}/16`);
  if (!adm.allClassesDischarged) {
    console.log(
      `  L4 NOT SATISFIED — no attacked_pass may be published for: ${adm.missing.join(", ")}`
    );
  }

  const execute = makeExecutor({ allowedPaths: tray.allowed_paths ?? [] });
  const results = [];
  for (const pack of tray.packs ?? []) {
    const result = await runPack({
      pack,
      closureDigest: tray.closure_digest,
      committedClosureDigest,
      admissibility: adm,
      execute,
    });
    results.push(result);
    const mark = result.refused
      ? `REFUSED (${result.refusal_reason})`
      : `${result.outcome}${result.admissible ? "" : " [inadmissible]"}`;
    console.log(`    ${pack.attack_pack_id.padEnd(24)} ${mark}`);
  }

  const publishable = results.filter(canPublishAttackedPass).length;
  console.log(`  packs              : ${results.length}`);
  console.log(`  publishable passes : ${publishable}`);

  if (out) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      `${JSON.stringify(
        {
          schema: "simurgh.vsr.tray-result.v1",
          tray_id: tray.tray_id,
          closure_digest: committedClosureDigest,
          isolation_contract: ISOLATION_CONTRACT,
          classes_discharged: adm.dischargedClasses,
          classes_missing: adm.missing,
          results,
        },
        null,
        2
      )}\n`
    );
    console.log(`  written            : ${out}`);
  }

  return results.some((r) => r.refused) ? 1 : 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code));
