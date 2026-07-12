// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5J — CLI verify of a VRC Lane-A pack. Usage:
//   verify-vrc-attestation.mjs [--tier public|audit] [dir]
// `dir` (absolute or relative) holds bundle.json + external-config.json; defaults to the committed pack.
// Prints `tier=<t> raw=<n> reason=<r>` and exits 0 iff raw 0. Handles a directory argument (5I gotcha).
import { readFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyVrc } from "./adapter.mjs";
import { EVIDENCE_DIR } from "./build-vrc-evidence.mjs";

export function verifyPack(dir = EVIDENCE_DIR, tier = "public") {
  const bundle = JSON.parse(readFileSync(join(dir, "bundle.json"), "utf8"));
  const cfg = JSON.parse(readFileSync(join(dir, "external-config.json"), "utf8"));
  return verifyVrc(bundle, cfg, { tier });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  let tier = "public";
  let dir = EVIDENCE_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tier") tier = args[++i];
    else dir = isAbsolute(args[i]) ? args[i] : join(process.cwd(), args[i]);
  }
  const r = verifyPack(dir, tier);
  console.log(`tier=${tier} raw=${r.raw} reason=${r.reason ?? "verified"}`);
  process.exit(r.raw === 0 ? 0 : 1);
}
