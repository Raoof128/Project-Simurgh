// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5F VMP — verifier CLI (plan Task 16). Strict by default (rejects a truthfully-incomplete panel
// with 281); --attestation-only accepts the truthful weaker statement; --tier audit adds the census
// bijection. The external pin is supplied from OUTSIDE the pack (pin.json / --pinned-fingerprint), never
// trusted from vmp-pinned-key.json. Output is structured; the process exit code is the raw code.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { evaluatePanelSafe } from "../core/vmpCore.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5f");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5f");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

export function verifyEvidence({ tier = "public", strict = true, pinnedFingerprint, dir } = {}) {
  const D = dir ? (dir.startsWith("/") ? dir : join(ROOT, dir)) : EVID;
  const bundle = readJson(join(D, "vmp-attestation.json"));
  const auditPrivate = readJson(join(D, "capture-census.json"));
  const replayResults = readJson(join(D, "vmp-replay-results.json"));
  // real-capture pack carries its own pin.json; the synthetic pack's pin lives at the stage root.
  const pinPath = dir ? join(D, "pin.json") : join(STAGE, "pin.json");
  const pin = pinnedFingerprint ?? readJson(pinPath).attestation_fingerprint;
  return evaluatePanelSafe(bundle, {
    tier,
    strict,
    pinnedFingerprint: pin,
    replayResults,
    runnerResults: {},
    auditPrivate,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const tier = argv.includes("--tier") ? argv[argv.indexOf("--tier") + 1] : "public";
  const strict = !argv.includes("--attestation-only");
  const dir = argv.includes("--dir") ? argv[argv.indexOf("--dir") + 1] : undefined;
  const pinArg = argv.includes("--pinned-fingerprint")
    ? argv[argv.indexOf("--pinned-fingerprint") + 1]
    : undefined;
  const r = verifyEvidence({ tier, strict, pinnedFingerprint: pinArg, dir });
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.raw === 0 ? 0 : r.raw > 255 ? 1 : r.raw); // non-zero exit preserves the structured truth
}
