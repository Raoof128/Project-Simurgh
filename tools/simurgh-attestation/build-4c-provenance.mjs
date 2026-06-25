// SPDX-License-Identifier: AGPL-3.0-or-later
// Assemble docs/.../stage-4c-provenance/provenance-bundle.json from committed evidence.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBundle } from "./stage4cProvenanceLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4c-provenance";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const load = async (f) => JSON.parse(await readFile(join(EV, f), "utf8"));

async function main() {
  const bundle = buildBundle({
    summary: await load("provenance-decision-summary.json"),
    manifest: await load("manifest.json"),
    decisions: await load("provenance-decisions.json"),
  });
  await writeFile(join(EV, "provenance-bundle.json"), stable(bundle));
  console.log("stage4c: built provenance-bundle.json; decisions_sha256", bundle.decisions_sha256);
}
main().catch((e) => {
  console.error("stage4c build:", e.message);
  process.exit(1);
});
