// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5B VAR — verify CLI (plan Task 11). Reads the committed attestation bundle and exits the
// raw VAR code (0 = clean). `--tier public|audit`. Motto: AnthropicSafe First, then ReviewerSafe.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { evaluateVar } from "../core/varCore.mjs";
import { driveTarget } from "./greenBundle.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = join(HERE, "..", "..", "..", "..", "docs/research/llm-shield/evidence/stage-5b");

export function verify({ path, tier = "public" } = {}) {
  const bundle = JSON.parse(readFileSync(path ?? join(EVID, "attestation.json"), "utf8"));
  // Audit tier re-drives each attack at the frozen verifier to prove the recorded target_raw.
  const drivenResults =
    tier === "audit"
      ? bundle.findings.map((f) => ({
          attack_id: f.attack_id,
          target_raw:
            f.target_stage === "self"
              ? f.target_raw
              : driveTarget(
                  f.target_stage,
                  f.family === "conflict_laundering" ? "launder" : "signature"
                ),
        }))
      : null;
  return evaluateVar(bundle, { tier, drivenResults });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const tier = args.includes("--tier") ? args[args.indexOf("--tier") + 1] : "public";
  const r = verify({ tier });
  console.log(JSON.stringify(r));
  process.exit(r.raw);
}
