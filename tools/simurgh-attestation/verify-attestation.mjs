// SPDX-License-Identifier: AGPL-3.0-or-later
// Two-tier offline verifier. The portable core is pure and imports NO Stage 3L
// code (callers pass loaded data). --reproduce dynamically imports the Stage 3L
// producer only when requested.
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import crypto from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { canonicalJson, sha256Hex, fingerprintPublicKey } from "./canonicalise.mjs";
import {
  validateBundleSchema,
  validateSidecarSchema,
  evaluateGateResults,
  scanLeakage,
} from "./attestationLib.mjs";

// Pure portable verification. evidenceFiles: [path, Buffer][]; reproduced: optional
// { metricsMatch, boundaryMatch, privacyMatch } from the caller's reproduce step.
export function verifyBundle({
  bundle,
  sidecar,
  publicKeyPem,
  expectedFingerprint,
  evidenceFiles,
  reproduce = false,
  reproduced = null,
}) {
  const checks = {};
  checks.schema_valid = validateBundleSchema(bundle).ok && validateSidecarSchema(sidecar).ok;

  const canonicalBytes = Buffer.from(canonicalJson(bundle), "utf8");
  checks.bundle_digest_match = sha256Hex(canonicalBytes) === sidecar.bundle_sha256;

  let sigValid = false;
  try {
    const sig = Buffer.from(String(sidecar.signature).replace(/^base64:/, ""), "base64");
    const key = crypto.createPublicKey(publicKeyPem);
    // `crypto.verify(null, …)` accepts any key type; the sidecar's `Ed25519` label is not checked
    // by the signature itself, so a P-256 or RSA key would verify its own signature (audit C-2).
    sigValid = key.asymmetricKeyType === "ed25519" && crypto.verify(null, canonicalBytes, key, sig);
  } catch {
    sigValid = false;
  }
  checks.signature_valid = sigValid;

  const actualFingerprint = fingerprintPublicKey(publicKeyPem);
  checks.key_fingerprint_match =
    actualFingerprint === sidecar.public_key_fingerprint &&
    (!expectedFingerprint || expectedFingerprint === actualFingerprint);

  const fileMap = new Map(evidenceFiles.map(([p, b]) => [p, b]));
  checks.evidence_file_hashes_match = bundle.referenced_evidence.every(
    (ref) => fileMap.has(ref.path) && sha256Hex(fileMap.get(ref.path)) === ref.sha256
  );

  // Fix #3: gate_results must be the honestly recomputed gates, and they must pass.
  const expectedGates = evaluateGateResults(bundle.metrics);
  checks.gate_results_match = JSON.stringify(bundle.gate_results) === JSON.stringify(expectedGates);
  checks.declared_gates_pass = expectedGates.all_hard_gates_passed === true;

  // Fix #2: scan the canonical bundle itself AND the referenced evidence for leakage.
  const leakTargets = [
    ["attestation.bundle.json", canonicalJson(bundle)],
    ...evidenceFiles.map(([p, b]) => [p, b.toString("utf8")]),
  ];
  checks.evidence_leakage_zero = scanLeakage(leakTargets).length === 0;

  if (reproduce) {
    checks.reproduced_metrics_match = reproduced?.metricsMatch === true;
    checks.reproduced_boundary_breakdown_match = reproduced?.boundaryMatch === true;
    checks.reproduced_privacy_report_match = reproduced?.privacyMatch === true;
  }

  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    public_key_fingerprint: actualFingerprint,
  };
}

// ---- CLI ----
const MAX_EVIDENCE_BYTES = 64 * 1024 * 1024;
function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
}
// Main-module guard. `import.meta.url` is the loader's REAL, percent-encoded path; `process.argv[1]`
// is whatever the shell passed. Compared as text, a verifier launched through a symlinked
// directory (`/tmp` on macOS) or a path containing a space never runs and exits 0 printing
// nothing (audit C-1, 31 October 2026). Both sides are resolved to the physical path here.
function isMainModule(moduleUrl) {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(moduleUrl);
  } catch {
    return false;
  }
}

const isCli = isMainModule(import.meta.url);

async function reproduceStage3l(bundle) {
  const lib = await import("../../tests/e2e/llm_shield_stage3l_fable5_reference_lib.mjs");
  const evals = lib
    .buildStage3lCorpus()
    .map((fixture) => ({ fixture, result: lib.evaluateStage3lCase(fixture) }));
  const metrics = lib.computeStage3lMetrics(evals);
  const breakdown = lib.buildBoundaryBreakdown(evals);
  return {
    metricsMatch: JSON.stringify(metrics) === JSON.stringify(bundle.metrics),
    boundaryMatch: JSON.stringify(breakdown) === JSON.stringify(bundle.boundary_breakdown),
    privacyMatch: (bundle.privacy_report?.generated_evidence_leakage ?? -1) === 0,
  };
}

async function mainCli() {
  const bundle = JSON.parse(await readFile(arg("--bundle"), "utf8"));
  const sidecar = JSON.parse(await readFile(arg("--signature"), "utf8"));
  const publicKeyPem = JSON.parse(await readFile(arg("--public-key"), "utf8")).public_key_pem;
  const reproduce = process.argv.includes("--reproduce");
  const evidenceFiles = [];
  for (const ref of bundle.referenced_evidence) {
    // The bundle is untrusted input: its paths are read before any check. Only a relative path
    // to a regular file of bounded size inside the checkout is read (audit C-13: `/dev/zero`
    // made the verifier read without bound).
    const path = String(ref.path);
    if (isAbsolute(path) || path.split(/[\\/]+/).includes("..")) {
      evidenceFiles.push([path, Buffer.alloc(0)]);
      continue;
    }
    const info = await stat(path).catch(() => null);
    if (!info || !info.isFile() || info.size > MAX_EVIDENCE_BYTES) {
      evidenceFiles.push([path, Buffer.alloc(0)]);
      continue;
    }
    evidenceFiles.push([path, await readFile(path)]);
  }
  const reproduced = reproduce ? await reproduceStage3l(bundle) : null;
  const result = verifyBundle({
    bundle,
    sidecar,
    publicKeyPem,
    expectedFingerprint: arg("--expected-key-fingerprint"),
    evidenceFiles,
    reproduce,
    reproduced,
  });
  const lines = [
    `simurgh attestation verify: ${result.pass ? "PASS" : "FAIL"}`,
    `public_key_fingerprint: ${result.public_key_fingerprint}`,
    ...Object.entries(result.checks).map(([k, v]) => `${k}: ${v}`),
  ];
  const out = lines.join("\n") + "\n";
  console.log(out.trimEnd());
  const outPath = arg("--output");
  if (outPath) await writeFile(outPath, out);
  process.exit(result.pass ? 0 : 1);
}

if (isCli)
  mainCli().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
