// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5A VNC — verify CLI (plan Task 10). Reads a committed bundle from the Lane A evidence
// dir (or a path) and exits the raw VNC code directly (0 = clean). `--tier public|audit`.
// Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluateVnc } from "../core/vncCore.mjs";
import { VNC_PUB, VWA_PUB } from "./greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-5a");

export function verify({ id, path, tier = "public" } = {}) {
  const file = path ?? join(EVID, `${id}.json`);
  const bundle = JSON.parse(readFileSync(file, "utf8"));
  return evaluateVnc(bundle, { tier, vncPubKeyPem: VNC_PUB, vwaPubKeyPem: VWA_PUB });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const arg = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : def;
  };
  const tier = arg("--tier", "public");
  const id = arg("--id", null);
  const path = arg("--path", null);
  if (id === "--all" || args.includes("--all")) {
    const index = JSON.parse(readFileSync(join(EVID, "index.json"), "utf8"));
    let bad = 0;
    for (const fx of index) {
      const r = verify({ id: fx.id, tier });
      const want = tier === "audit" ? fx.audit_raw : fx.public_raw;
      const ok = r.raw === want;
      if (!ok) bad++;
      console.log(`${ok ? "OK " : "BAD"} ${fx.id} ${tier} raw=${r.raw} want=${want}`);
    }
    process.exit(bad === 0 ? 0 : 1);
  }
  const r = verify({ id, path, tier });
  console.log(JSON.stringify(r));
  process.exit(r.raw);
}
