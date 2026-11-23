#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// The explorer from a command line. Every answer is JSON on standard output; a refusal is JSON
// on standard error. The commands themselves are in agent.mjs, shared with the tool server.
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { COMMANDS, EXIT, NOTICE, OPTIONS, load, run, serve } from "./agent.mjs";
import { queryRecords } from "./core.mjs";

const version = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
).version;
try {
  const { values: o, positionals: p } = parseArgs({
    allowPositionals: true,
    options: { ...OPTIONS, help: { type: "boolean" } },
  });
  if (o.help || !p.length) {
    console.log(
      [
        `Simurgh evidence explorer ${version}: a JSON interface that changes nothing in the repository`,
        "",
        ...COMMANDS.map((c) => `  ${c.name.padEnd(11)} ${c.summary}`),
        "  export      The index with the outcome records a filter keeps, as a bundle",
        "  mcp         Serve the same commands as tools over standard input and output",
        "",
        "Arguments are given as --name value. Run the commands command for each one's arguments.",
        "Exit codes: 0 done; 2 refused; 3 done, and check or watch found something to look at.",
        NOTICE,
      ].join("\n")
    );
  } else if (p.length !== 1) {
    throw new Error("Exactly one command is required");
  } else if (p[0] === "mcp") {
    await serve(process.stdin, process.stdout, version);
  } else if (p[0] === "export") {
    const { bundle: b } = load(o);
    const records = queryRecords(b, { q: o.q, kind: o.kind, control: o.control, model: o.model });
    if (!records.length) throw new Error("Cannot export an empty selection");
    console.log(
      JSON.stringify(
        { ...b, records, selection: { total: b.records.length, retained: records.length } },
        null,
        2
      )
    );
  } else {
    const out = await run(p[0], o);
    console.log(JSON.stringify(out, null, 2));
    if (out.attention) process.exitCode = EXIT.attention;
  }
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = EXIT.refused;
}
