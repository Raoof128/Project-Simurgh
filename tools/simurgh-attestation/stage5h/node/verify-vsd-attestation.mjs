// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5H VSD — the verify orchestrator (the ONLY place the recompute kernel runs; the core stays
// pure). Loads the evidence + external pin/host-registry, runs the kernel, calls evaluateDisclosureSafe.
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { evaluateDisclosureSafe } from "../core/vsdCore.mjs";
import { runRecomputeKernel } from "./recomputeKernelRunner.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const DEFAULT_EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5h");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5h");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

function parseArgs(argv) {
  const a = {
    tier: "public",
    dir: DEFAULT_EVID,
    pin: join(STAGE, "pin.json"),
    hostRegistry: join(STAGE, "host-registry.json"),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tier") a.tier = argv[++i];
    else if (argv[i] === "--dir") a.dir = argv[++i];
    else if (argv[i] === "--pin") a.pin = argv[++i];
    else if (argv[i] === "--host-registry") a.hostRegistry = argv[++i];
  }
  return a;
}

export function verify({
  dir = DEFAULT_EVID,
  tier = "public",
  pinPath = join(STAGE, "pin.json"),
  hostRegistryPath = join(STAGE, "host-registry.json"),
} = {}) {
  const bundle = readJson(join(dir, "vsd-attestation.json"));
  const recipes = readJson(join(dir, "recompute-recipe.json"));
  const artefactBytes = {};
  for (const a of bundle.artefacts_ref) artefactBytes[a.artefact_id] = readJson(join(dir, a.path));
  const pin = readJson(pinPath);
  const hostRegistry = readJson(hostRegistryPath);
  const claims = bundle.claim_inventory.content.claims;
  const recomputeResult = runRecomputeKernel({ claims, recipes, artefactBytes });
  return evaluateDisclosureSafe(bundle, {
    pin,
    hostRegistry,
    recipes,
    artefactBytes,
    recomputeResult,
    tier,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const a = parseArgs(process.argv.slice(2));
  const result = verify({
    dir: a.dir,
    tier: a.tier,
    pinPath: a.pin,
    hostRegistryPath: a.hostRegistry,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.raw === 0 ? 0 : 1;
}
