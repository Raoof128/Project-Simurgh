// SPDX-License-Identifier: AGPL-3.0-or-later
import { createPublicKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifyCampaign } from "./verifyCampaign.mjs";

function arg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index === -1 ? fallback : argv[index + 1];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const dir = arg(
    argv,
    "--dir",
    "docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign"
  );
  const signedManifest = JSON.parse(
    await readFile(join(dir, "clean", "campaign-manifest.json"), "utf8")
  );
  const records = JSON.parse(await readFile(join(dir, "records", "records.json"), "utf8"));
  const publicKey = createPublicKey(await readFile(join(dir, "public-key.pem"), "utf8"));
  const result = verifyCampaign({ signedManifest, records, publicKey });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
