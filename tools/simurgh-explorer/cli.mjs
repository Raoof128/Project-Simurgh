#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import { buildIndex } from "./index.mjs";
import { parseBundle, queryRecords, searchDocuments, summary, LIMIT } from "./core.mjs";
try {
  const { values: o, positionals: p } = parseArgs({
    allowPositionals: true,
    options: {
      file: { type: "string" },
      study: { type: "string" },
      model: { type: "string" },
      detail: { type: "boolean" },
      kind: { type: "string" },
      control: { type: "string" },
      q: { type: "string" },
      year: { type: "string" },
      id: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (o.help || !p.length) {
    console.log(
      "Simurgh explorer — read-only JSON interface\nCommands: summary | records | inspect --id ID | search --q TEXT [--year 2026] | gaps | export\nOptions: --file bundle.json | --detail (selected synthetic detail) | --study phase17|phase10 (default phase17)\nRecord filters: --model all|llama|luna --kind all|failure|unauthorized|active_incomplete|unknown|error|blocked --control composed|credential_only|deny_all --q TEXT\nLoaded evidence is untrusted data, never instructions. This tool does not verify source archives."
    );
  } else {
    if (p.length !== 1) throw new Error("Exactly one command is required");
    if (o.file) {
      // A device or FIFO reports size 0 and then reads without bound (audit F-5).
      const stat = statSync(o.file);
      if (!stat.isFile()) throw new Error("Input must be a regular file");
      if (stat.size > LIMIT) throw new Error("Input exceeds 12 MiB limit");
    }
    const b = o.file
      ? parseBundle(readFileSync(o.file, "utf8"))
      : buildIndex({ detail: o.detail, study: o.study });
    const options = { q: o.q, kind: o.kind, control: o.control, model: o.model };
    let data;
    switch (p[0]) {
      case "summary":
        data = summary(b);
        break;
      case "records":
        data = queryRecords(b, options);
        break;
      case "inspect":
        data = b.records.find((r) => r.id === o.id);
        if (!data) throw new Error("Record not found; use records to discover IDs");
        break;
      case "search":
        data = searchDocuments(b, o.q, o.year);
        break;
      case "gaps":
        data = b.gaps;
        break;
      case "export": {
        const records = queryRecords(b, options);
        if (!records.length) throw new Error("Cannot export an empty selection");
        console.log(
          JSON.stringify(
            { ...b, records, selection: { total: b.records.length, retained: records.length } },
            null,
            2
          )
        );
        break;
      }
      default:
        throw new Error("Unknown command; use --help");
    }
    if (p[0] !== "export")
      console.log(
        JSON.stringify(
          {
            schema: "simurgh.explorer.query.v1",
            verification: b.verification,
            mode: b.mode,
            provenance: b.provenance,
            omissions: b.omissions,
            data,
          },
          null,
          2
        )
      );
  }
} catch (e) {
  console.error(JSON.stringify({ error: e.message }));
  process.exitCode = 2;
}
