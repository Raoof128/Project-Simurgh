// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 5G — VFC verifier CLI (orchestrator). Loads the evidence pack + EXTERNAL pin/trust-root (never
// from the pack), runs the Sigstore kernel when anchor evidence is present, then calls the PURE evaluator.
// Prints the full structured result; the process exit code is 0 (raw 0) or 1 (any non-zero raw > 255).
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { evaluateForeignCaptureSafe } from "../core/vfcCore.mjs";
import { sigstoreKernelRunner } from "./sigstoreKernelRunner.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
const EVID = join(ROOT, "docs/research/llm-shield/evidence/stage-5g");
const STAGE = join(ROOT, "tools/simurgh-attestation/stage5g");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const abs = (p) => (p.startsWith("/") ? p : join(ROOT, p));

export function verifyEvidence({
  tier = "public",
  attestationOnly = false,
  minRung,
  dir,
  verifierPin,
  trustRoot,
} = {}) {
  const D = dir ? abs(dir) : EVID;
  const bundle = readJson(join(D, "vfc-attestation.json"));
  const auditCensus = tier === "audit" ? readJson(join(D, "capture-census.json")) : null;
  const artifacts = {
    panelPlan: readJson(join(D, "panel-plan.json")),
    corpus: readJson(join(D, "shared-corpus.json")),
    detectorSnapshot: readJson(join(D, "detector-snapshot-manifest.json")),
  };
  const pin = readJson(verifierPin ? abs(verifierPin) : join(STAGE, "pin.json"));
  const trust = readJson(trustRoot ? abs(trustRoot) : join(STAGE, "trust-root.json"));

  const ctx = {
    tier,
    attestationOnly,
    minRung,
    verifierPin: pin,
    trustRootAllowlist: trust.fulcio_root_fingerprints ?? [],
    artifacts,
    auditCensus,
    kernelResult: null,
    diag: {},
  };
  if (bundle.anchor_evidence) {
    try {
      ctx.kernelResult = sigstoreKernelRunner(bundle.anchor_evidence);
    } catch {
      ctx.kernelResult = null; // pure evaluator maps a missing kernel result to 299
    }
  }
  return evaluateForeignCaptureSafe(bundle, ctx);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined);
  const r = verifyEvidence({
    tier: argv.includes("--tier") ? flag("--tier") : "public",
    attestationOnly: argv.includes("--attestation-only"),
    minRung: flag("--min-rung"),
    dir: flag("--dir"),
    verifierPin: flag("--verifier-pin"),
    trustRoot: flag("--trust-root"),
  });
  console.log(JSON.stringify(r, null, 2));
  process.exitCode = r.raw === 0 ? 0 : 1;
}
