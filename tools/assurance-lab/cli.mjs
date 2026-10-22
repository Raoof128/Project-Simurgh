#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile, mkdir, mkdtemp, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { runStudy, verifyReport } from "./study.mjs";

try {
  const args = process.argv.slice(2);
  if (args[0] === "run" && (args.length === 1 || (args.length === 3 && args[1] === "--out"))) {
    const out = args[2]
      ? resolve(args[2])
      : join(await mkdtemp(join(tmpdir(), "simurgh-assurance-report-")), "report.json");
    const report = await runStudy();
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(report, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    console.log(JSON.stringify({ report: out, summary: report.summary }, null, 2));
  } else if (args[0] === "verify" && args.length === 2) {
    if ((await stat(args[1])).size > 2_000_000) throw new Error("report_too_large");
    await verifyReport(JSON.parse(await readFile(args[1], "utf8")));
    console.log(
      "Verified: complete report matches fresh local execution and current source hashes."
    );
  } else throw new Error("Usage: cli.mjs run [--out PATH] | verify PATH");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
