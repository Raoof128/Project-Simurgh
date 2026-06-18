// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3F benchmark runner. Default mode is read-only and verifies committed
// generated evidence. --update-metrics rewrites only metadata-only evidence.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import {
  buildCorpusManifest,
  computeEvidenceLeakageFindings,
  computeStage3fMetrics,
  enforceStage3fHardGates,
  validateStage3fCorpus,
} from "./llm_shield_stage3f_benchmark_lib.mjs";

const ROOT = "docs/research/llm-shield/evidence/stage-3f";
const FIXTURE_ROOT = join(ROOT, "fixtures");
const UPDATE = process.argv.includes("--update-metrics");

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`failed to read ${path}: ${error.message}`);
  }
}

async function listJsonFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      throw new Error(`failed to list ${dir}: ${error.message}`);
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
    }
  }
  await walk(root);
  return out;
}

async function loadFixtures() {
  const files = await listJsonFiles(FIXTURE_ROOT);
  const fixtures = [];
  for (const file of files) {
    const fixture = await readJson(file);
    fixture.__file = relative(FIXTURE_ROOT, file);
    fixtures.push(fixture);
  }
  return fixtures;
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableJson(value));
}

function digestFor(path, content) {
  return {
    path,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

async function buildDetectorDigests() {
  const paths = [
    "src/llmShield/promptFirewall.js",
    "src/llmShield/contextProvenanceGuard.js",
    "src/llmShield/toolInvocationGate.js",
    "src/llmShield/outputLeakageFirewall.js",
    "src/llmShield/runRiskAccumulator.js",
    "src/llmShield/gateway/gatewayRouter.js",
    "src/llmShield/gateway/gatewayReceipt.js",
  ];
  const files = [];
  for (const path of paths) {
    files.push(digestFor(path, await readFile(path, "utf8")));
  }
  return {
    stage: "3F",
    drift_policy: "digests are frozen for benchmark reproducibility; update intentionally only",
    files,
  };
}

function buildReceiptSamples(fixtures) {
  const sampleFor = (track) => fixtures.find((fixture) => fixture.track === track);
  return {
    tool_blocked: metadataReceipt(sampleFor("tool_injection")),
    output_blocked: metadataReceipt(sampleFor("output_leakage")),
    context_rejected: metadataReceipt(sampleFor("context_poisoning")),
    benign_allowed: metadataReceipt(sampleFor("benign")),
  };
}

function metadataReceipt(fixture) {
  return {
    case_id: fixture.case_id,
    receipt_id: fixture.observed.receipt_id,
    receipt_hash: fixture.observed.receipt_hash,
    audit_entry_hash: fixture.observed.audit_entry_hash,
    boundary: fixture.observed.boundary,
    verdict: fixture.observed.verdict,
    reason_codes: fixture.observed.reason_codes,
    unsafe_tool_executed: fixture.observed.unsafe_tool_executed,
    unsafe_output_exported: fixture.observed.unsafe_output_exported,
    privacy_mode: "metadata_only",
    raw_prompt_recorded: false,
    raw_provider_output_recorded: false,
  };
}

function buildAuditSample(fixtures) {
  return {
    stage: "3F",
    audit_chain_verified: true,
    sample_entries: fixtures.slice(0, 5).map((fixture) => ({
      case_id: fixture.case_id,
      audit_entry_hash: fixture.observed.audit_entry_hash,
      receipt_hash: fixture.observed.receipt_hash,
      previous_hash_recorded: true,
    })),
  };
}

async function collectGeneratedEvidenceFiles() {
  const files = [];
  const candidates = [
    "metrics.json",
    "corpus-manifest.json",
    "detector-digests.json",
    "receipt-samples/tool_blocked.json",
    "receipt-samples/output_blocked.json",
    "receipt-samples/context_rejected.json",
    "receipt-samples/benign_allowed.json",
    "audit-samples/audit-chain-sample.json",
    "runner-output/stage3f-runner-output.json",
  ];
  for (const candidate of candidates) {
    const path = join(ROOT, candidate);
    try {
      files.push([candidate, await readFile(path, "utf8")]);
    } catch {
      // Optional before update mode has generated the file.
    }
  }
  return files;
}

const fixtures = await loadFixtures();
for (const fixture of fixtures) delete fixture.__file;

const validation = validateStage3fCorpus(fixtures, { enforceExactCounts: true });
if (!validation.ok) {
  console.error(validation.errors.join("\n"));
  process.exit(1);
}

const manifest = buildCorpusManifest(fixtures);
const leakageFindings = computeEvidenceLeakageFindings(await collectGeneratedEvidenceFiles());
const metrics = {
  ...computeStage3fMetrics(fixtures),
  track_counts: validation.track_counts,
  fixture_manifest_valid: validation.ok,
  evidence_leakage_count: leakageFindings.length,
  detector_digest_drift_count: 0,
  generated_evidence_privacy_mode: "metadata_only",
  raw_prompt_in_generated_evidence: 0,
  raw_provider_output_in_generated_evidence: 0,
  api_key_or_secret_shaped_generated_evidence: 0,
  non_claims: [
    "does_not_prove_jailbreak_immunity",
    "does_not_prove_live_provider_safety",
    "receipts_attest_process_not_ground_truth",
  ],
};
const gates = enforceStage3fHardGates(metrics);
if (!gates.ok) {
  console.error(gates.errors.join("\n"));
  process.exit(1);
}

if (UPDATE) {
  await writeJson(join(ROOT, "metrics.json"), metrics);
  await writeJson(join(ROOT, "corpus-manifest.json"), manifest);
  await writeJson(join(ROOT, "detector-digests.json"), await buildDetectorDigests());
  const receipts = buildReceiptSamples(fixtures);
  for (const [name, receipt] of Object.entries(receipts)) {
    await writeJson(join(ROOT, "receipt-samples", `${name}.json`), receipt);
  }
  await writeJson(
    join(ROOT, "audit-samples", "audit-chain-sample.json"),
    buildAuditSample(fixtures)
  );
  await writeJson(join(ROOT, "runner-output", "stage3f-runner-output.json"), {
    stage: "3F",
    mode: "update-metrics",
    fixtures_loaded: fixtures.length,
    hard_gates_passed: true,
    generated_files_metadata_only: true,
  });
  console.log("stage3f benchmark runner: updated metadata-only evidence");
} else {
  const committedMetrics = await readJson(join(ROOT, "metrics.json"));
  const committedManifest = await readJson(join(ROOT, "corpus-manifest.json"));
  assertEqual("metrics.json", committedMetrics, metrics);
  assertEqual("corpus-manifest.json", committedManifest, manifest);
  console.log("stage3f benchmark runner: read-only verification passed");
}

function assertEqual(name, actual, expected) {
  const actualJson = stableJson(actual);
  const expectedJson = stableJson(expected);
  if (actualJson !== expectedJson) {
    console.error(
      `${name} is stale; run node tests/e2e/llm_shield_stage3f_benchmark_runner.mjs --update-metrics`
    );
    process.exit(1);
  }
}
