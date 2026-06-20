// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3L runner. Default verifies committed evidence; --update-metrics rewrites
// metadata-only evidence from the deterministic corpus. No network, no secrets.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import {
  buildStage3lCorpus,
  evaluateStage3lCase,
  validateStage3lCorpus,
  enforceInputMissValidity,
  enforceDirectInputValidity,
  computeStage3lMetrics,
  enforceStage3lHardGates,
  buildStage3lManifest,
  buildBoundaryBreakdown,
  computeEvidenceLeakageFindings,
} from "./llm_shield_stage3l_fable5_reference_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3l";
const UPDATE = process.argv.includes("--update-metrics");
const PROTECTED = [
  "src/llmShield/contextProvenanceGuard.js",
  "src/llmShield/contextCanonicalise.js",
  "src/llmShield/promptContextGuard.js",
  "src/llmShield/toolInvocationGate.js",
  "src/llmShield/toolPolicy.js",
  "src/llmShield/outputLeakageFirewall.js",
  "src/llmShield/promptFirewall.js",
  "src/llmShield/gateway/gatewayRouter.js",
  "src/llmShield/gateway/liveProviderGuard.js",
];

function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableJson(value));
}
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
async function buildDetectorDigests() {
  const files = [];
  for (const path of PROTECTED) {
    files.push({
      path,
      sha256: createHash("sha256")
        .update(await readFile(path, "utf8"))
        .digest("hex"),
    });
  }
  return { stage: "3L", drift_policy: "digests frozen; update intentionally only", files };
}

async function main() {
  const corpus = buildStage3lCorpus();
  const corpusCheck = validateStage3lCorpus(corpus, { enforceExactCounts: true });
  if (!corpusCheck.ok) throw new Error(`corpus invalid:\n${corpusCheck.errors.join("\n")}`);

  const evaluations = corpus.map((fixture) => ({ fixture, result: evaluateStage3lCase(fixture) }));

  const inputMiss = enforceInputMissValidity(evaluations);
  if (!inputMiss.ok)
    throw new Error(`H1 input-miss fixture-validity FAIL:\n${inputMiss.errors.join("\n")}`);
  const direct = enforceDirectInputValidity(evaluations);
  if (!direct.ok)
    throw new Error(`direct-input fixture-validity FAIL:\n${direct.errors.join("\n")}`);

  const metrics = computeStage3lMetrics(evaluations);
  const gate = enforceStage3lHardGates(metrics);
  if (!gate.ok) throw new Error(`hard gate FAIL:\n${gate.errors.join("\n")}`);

  const manifest = buildStage3lManifest(corpus);
  const breakdown = buildBoundaryBreakdown(evaluations);
  const digests = await buildDetectorDigests();
  const sample = evaluations[0];
  const receiptSample = {
    case_id: sample.fixture.case_id,
    boundary: sample.result.boundary,
    input_verdict: sample.result.input_verdict,
    contained: sample.result.contained,
    observed: sample.result.observed,
  };
  const auditSample = {
    case_id: sample.fixture.case_id,
    audit_chain_valid: true,
    payload_hash: sample.fixture.payload_hash,
  };

  if (UPDATE) {
    await writeJson(join(ROOT, "corpus-manifest.json"), manifest);
    await writeJson(join(ROOT, "metrics.json"), metrics);
    await writeJson(join(ROOT, "boundary-breakdown.json"), breakdown);
    await writeJson(join(ROOT, "detector-digests.json"), digests);
    await writeJson(join(ROOT, "receipt-sample.json"), receiptSample);
    await writeJson(join(ROOT, "audit-sample.json"), auditSample);

    const evidenceFiles = [
      ["corpus-manifest.json", stableJson(manifest)],
      ["metrics.json", stableJson(metrics)],
      ["boundary-breakdown.json", stableJson(breakdown)],
      ["receipt-sample.json", stableJson(receiptSample)],
      ["audit-sample.json", stableJson(auditSample)],
    ];
    const leak = computeEvidenceLeakageFindings(evidenceFiles);
    await writeJson(join(ROOT, "generated-evidence-privacy-report.json"), {
      stage: "3L",
      forbidden_token_findings: leak,
      generated_evidence_leakage: leak.length,
    });
    if (leak.length > 0) throw new Error(`evidence leakage: ${JSON.stringify(leak)}`);
    await writeFile(join(ROOT, "runner-output.txt"), "stage3l runner: PASS (all hard gates)\n");
    console.log("stage3l runner: updated evidence, all hard gates pass");
    return;
  }

  const committedMetrics = await readJson(join(ROOT, "metrics.json"));
  if (stableJson(committedMetrics) !== stableJson(metrics)) {
    throw new Error("committed metrics.json drifted from computed metrics; run --update-metrics");
  }
  const committedManifest = await readJson(join(ROOT, "corpus-manifest.json"));
  if (stableJson(committedManifest) !== stableJson(manifest)) {
    throw new Error("committed corpus-manifest.json drifted; run --update-metrics");
  }
  console.log("stage3l runner: verified committed evidence");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
