// SPDX-License-Identifier: AGPL-3.0-or-later
// Assemble docs/.../stage-4a-lite/authority-bundle.json from committed evidence. No signing.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBundle } from "./stage4aAuthorityLib.mjs";

const EV = "docs/research/llm-shield/evidence/stage-4a-lite";
const stable = (v) => JSON.stringify(v, null, 2) + "\n";
const load = async (f) => JSON.parse(await readFile(join(EV, f), "utf8"));

async function main() {
  const bundle = buildBundle({
    summary: await load("authority-decision-summary.json"),
    manifest: await load("manifest.json"),
    decisions: await load("authority-decisions.json"),
  });
  await writeFile(join(EV, "authority-bundle.json"), stable(bundle));
  console.log("stage4a: built authority-bundle.json; decisions_sha256", bundle.decisions_sha256);
}
main().catch((e) => {
  console.error("stage4a build:", e.message);
  process.exit(1);
});
