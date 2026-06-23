// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3X runner. Offline + deterministic. Builds the signed public VCA timeline index, writes
// metadata-only evidence, re-verifies byte-stable. write-hashes runs AFTER prettier and EXCLUDES
// evidence-hashes.json itself.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { canonicalJson, sha256Hex } from "./canonicalise.mjs";
import { buildTimelineIndex } from "./stage3xTimelineLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-3x";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const rd = (p) => readFile(join(EV, p), "utf8").then(JSON.parse);

export function buildIndexFile() {
  return buildTimelineIndex();
}

export function buildProvenance() {
  return {
    schema: "simurgh.stage3x.provenance.v1",
    stage: "3X",
    builds_on: "v2.7.0-stage-3w-witnessed-vca-release-provenance",
    offline_primary: true,
    network_required: false,
    reviewer_command: "scripts/reproduce-vca-chain.sh",
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if ((await stat(p)).isFile() && !p.endsWith("evidence-hashes.json")) out.push(p);
  }
  return out;
}
async function writeEvidenceHashes() {
  const files = (await walk(EV)).sort();
  const map = {};
  for (const f of files) map[f] = sha256Hex(await readFile(f, "utf8"));
  await writeFile(join(EV, "evidence-hashes.json"), stable(map));
}

async function main() {
  const cmd = process.argv[2];
  const update = process.argv.includes("--update");
  const idx = buildIndexFile();
  if (cmd === "build") {
    if (update) {
      await writeFile(join(EV, "timeline.index.json"), stable(idx));
      await writeFile(join(EV, "provenance.json"), stable(buildProvenance()));
      console.log("stage3x: evidence written (update; run prettier then sign + write-hashes)");
      return;
    }
    if (stable(await rd("timeline.index.json")) !== stable(idx)) throw new Error("index drifted");
    console.log("stage3x evidence: verified committed");
  } else if (cmd === "hash") {
    console.log(JSON.stringify({ index_sha256: sha256Hex(canonicalJson(idx)) }, null, 2));
  } else if (cmd === "verify") {
    if (stable(await rd("timeline.index.json")) !== stable(idx))
      throw new Error("index reproduction mismatch");
    console.log("stage3x: timeline index reproduces");
  } else if (cmd === "write-hashes") {
    await writeEvidenceHashes();
    console.log("stage3x: evidence hashes written");
  } else if (cmd === "verify-hashes") {
    const map = await rd("evidence-hashes.json");
    for (const [f, h] of Object.entries(map))
      if (sha256Hex(await readFile(f, "utf8")) !== h) throw new Error("hash mismatch: " + f);
    console.log("stage3x: evidence hashes match");
  } else {
    console.error("usage: build [--update] | hash | verify | write-hashes | verify-hashes");
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`)
  main().catch((e) => {
    console.error("stage3x runner:", e.message);
    process.exit(1);
  });
