// SPDX-License-Identifier: AGPL-3.0-or-later
// Assemble docs/.../stage-4b-intent/intent-bundle.json from committed evidence. No signing.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBundle } from "./stage4bIntentLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4b-intent";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const load = async (f) => JSON.parse(await readFile(join(EV, f), "utf8"));

async function main() {
  const bundle = buildBundle({
    summary: await load("intent-decision-summary.json"),
    manifest: await load("manifest.json"),
    decisions: await load("intent-decisions.json"),
  });
  await writeFile(join(EV, "intent-bundle.json"), stable(bundle));
  console.log("stage4b: built intent-bundle.json; decisions_sha256", bundle.decisions_sha256);
}
main().catch((e) => {
  console.error("stage4b build:", e.message);
  process.exit(1);
});
