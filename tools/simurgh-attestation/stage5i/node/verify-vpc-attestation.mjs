// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5I — verify a committed VPC evidence pack. `--tier public|audit` (default public). Exits with
// the stage-4 run level for the raw code (0 = verified).
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { vpcVerify } from "../core/vpcCore.mjs";
import { makeAdapterFacts } from "./adapter.mjs";
import { stage4CodeForRawCode } from "../../stage4h/exitCodes.mjs";
import { EVIDENCE_DIR } from "./build-vpc-evidence.mjs";

export function verifyPack(dir = EVIDENCE_DIR, tier = "public") {
  const bundle = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(dir, "external-config.json"), "utf8"));
  const facts = makeAdapterFacts(bundle, cfg);
  return vpcVerify(bundle, cfg, facts, { tier });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const tier = argv.includes("--tier") ? argv[argv.indexOf("--tier") + 1] : "public";
  const dirArg = argv.find((a) => !a.startsWith("--") && a !== tier);
  const dir = dirArg ? join(process.cwd(), dirArg) : EVIDENCE_DIR;
  const res = verifyPack(dir, tier);
  console.log(`tier=${tier} raw=${res.raw} reason=${res.reason ?? "verified"}`);
  process.exit(stage4CodeForRawCode(res.raw));
}
