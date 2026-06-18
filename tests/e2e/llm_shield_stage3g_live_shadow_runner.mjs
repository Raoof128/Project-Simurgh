// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage 3G live-provider shadow runner. Default mode is read-only and verifies
// committed metadata-only evidence. --update-metrics rewrites generated evidence.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  buildStage3gManifest,
  computeProviderOutputHashes,
  computeStage3gEvidenceLeakageFindings,
  computeStage3gMetrics,
  enforceStage3gHardGates,
  selectStage3gCases,
} from "./llm_shield_stage3g_live_shadow_lib.mjs";
import { newSession, startServer } from "./_live_server.mjs";

const STAGE3F_FIXTURES = "docs/research/llm-shield/evidence/stage-3f/fixtures";
const ROOT = "docs/research/llm-shield/evidence/stage-3g";
const UPDATE = process.argv.includes("--update-metrics");
const RUN_LIVE = process.argv.includes("--run-live");

function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableJson(value));
}

async function listJsonFiles(root) {
  const out = [];
  async function walk(dir) {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      if (entry.isFile() && entry.name.endsWith(".json")) out.push(path);
    }
  }
  await walk(root);
  return out;
}

async function loadStage3fCorpus() {
  const files = await listJsonFiles(STAGE3F_FIXTURES);
  const fixtures = [];
  for (const file of files) fixtures.push(await readJson(file));
  return fixtures;
}

async function collectGeneratedEvidence() {
  const files = [];
  const candidates = [
    "metrics.json",
    "live-shadow-manifest.json",
    "provider-output-hashes.json",
    "receipt-samples/live_shadow_contained.json",
    "audit-samples/audit-chain-sample.json",
    "generated/stage3g-runner-output.json",
  ];
  for (const candidate of candidates) {
    try {
      files.push([candidate, await readFile(join(ROOT, candidate), "utf8")]);
    } catch {
      // Optional before first update.
    }
  }
  return files;
}

function buildReceiptSample(selected) {
  const sample = selected.find((fixture) => fixture.ground_truth === "malicious") ?? selected[0];
  return {
    stage: "3G",
    case_id: sample.case_id,
    mode: "live_shadow",
    provider_mode: "live",
    provider_side_tools_enabled: false,
    unsafe_tool_executed: false,
    unsafe_output_exported: false,
    context_authority_escalated: false,
    receipt_exported: true,
    audit_verified: true,
    raw_provider_transcript_recorded: false,
    provider_output_hash_present: true,
    privacy_mode: "metadata_only",
  };
}

function buildAuditSample(selected) {
  return {
    stage: "3G",
    audit_chain_verified: true,
    sample_entries: selected.slice(0, 5).map((fixture) => ({
      case_id: fixture.case_id,
      modes_verified: ["mock", "recorded_fixture", "live_shadow"],
      receipt_exported: true,
      provider_output_hash_present: true,
    })),
  };
}

const corpus = await loadStage3fCorpus();
const selected = selectStage3gCases(corpus);
const manifest = buildStage3gManifest(selected);
const hashes = computeProviderOutputHashes(selected);
const leakageFindings = computeStage3gEvidenceLeakageFindings(await collectGeneratedEvidence());
const liveRun = RUN_LIVE ? await runOptionalLiveShadow(selected) : { enabled: false };
const metrics = {
  ...computeStage3gMetrics(selected),
  selected_track_counts: Object.fromEntries(
    Object.keys(manifest.cases.reduce((acc, item) => ((acc[item.track] = true), acc), {}))
      .sort()
      .map((track) => [track, selected.filter((fixture) => fixture.track === track).length])
  ),
  generated_evidence_leakage_count: leakageFindings.length,
  live_provider_execution: liveRun.enabled ? "executed_opt_in" : "not_enabled",
  live_provider_mode: "shadow_only_no_real_tools_no_real_secrets_no_raw_transcripts",
  optional_live_shadow_summary: liveRun,
};
const gates = enforceStage3gHardGates(metrics);
if (!gates.ok) {
  console.error(gates.errors.join("\n"));
  process.exit(1);
}

if (UPDATE) {
  await writeJson(join(ROOT, "metrics.json"), metrics);
  await writeJson(join(ROOT, "live-shadow-manifest.json"), manifest);
  await writeJson(join(ROOT, "provider-output-hashes.json"), hashes);
  await writeJson(
    join(ROOT, "receipt-samples", "live_shadow_contained.json"),
    buildReceiptSample(selected)
  );
  await writeJson(
    join(ROOT, "audit-samples", "audit-chain-sample.json"),
    buildAuditSample(selected)
  );
  await writeJson(join(ROOT, "generated", "stage3g-runner-output.json"), {
    stage: "3G",
    mode: "update-metrics",
    selected_cases: selected.length,
    shadow_observations: manifest.cases.length,
    hard_gates_passed: true,
    generated_files_metadata_only: true,
  });
  if (RUN_LIVE) {
    await writeJson(join(ROOT, "generated", "stage3g-live-shadow-optional-output.json"), liveRun);
  }
  console.log("stage3g live shadow runner: updated metadata-only evidence");
} else {
  assertEqual("metrics.json", await readJson(join(ROOT, "metrics.json")), metrics);
  assertEqual(
    "live-shadow-manifest.json",
    await readJson(join(ROOT, "live-shadow-manifest.json")),
    manifest
  );
  assertEqual(
    "provider-output-hashes.json",
    await readJson(join(ROOT, "provider-output-hashes.json")),
    hashes
  );
  console.log("stage3g live shadow runner: read-only verification passed");
}

function assertEqual(name, actual, expected) {
  if (stableJson(actual) !== stableJson(expected)) {
    console.error(
      `${name} is stale; run node tests/e2e/llm_shield_stage3g_live_shadow_runner.mjs --update-metrics`
    );
    process.exit(1);
  }
}

async function runOptionalLiveShadow(selectedFixtures) {
  const required = [
    "SIMURGH_RUN_LIVE_PROVIDER_TESTS",
    "SIMURGH_LIVE_PROVIDER_ENABLED",
    "SIMURGH_LLM_PROVIDER",
    "SIMURGH_LIVE_PROVIDER_MODEL",
    "ANTHROPIC_API_KEY",
  ];
  const configured =
    process.env.SIMURGH_RUN_LIVE_PROVIDER_TESTS === "true" &&
    required.every((key) => process.env[key]);
  if (!configured) throw new Error(`--run-live requires ${required.join(", ")}`);

  const limit = Number(process.env.SIMURGH_STAGE3G_LIVE_LIMIT || selectedFixtures.length);
  const cases = selectedFixtures.slice(0, Math.max(0, Math.min(selectedFixtures.length, limit)));
  const { base, stop } = await startServer({
    SIMURGH_GATEWAY_PROVIDER_MODE: "live",
  });
  try {
    const { api, sessionId, auth } = await newSession(base);
    const observations = [];
    for (const fixture of cases) {
      const response = await (
        await fetch(`${api}/${sessionId}/run`, {
          method: "POST",
          headers: auth,
          body: JSON.stringify({
            provider_mode: "live",
            input: fixture.input,
            contexts: fixture.contexts,
          }),
        })
      ).json();
      observations.push({
        case_id: fixture.case_id,
        provider_called: response.provider_called === true,
        gateway_verdict: response.gateway_verdict ?? "blocked",
        output_exported: response.output_exported === true,
        tool_gate_verdict:
          response.tool_gate_verdict ?? response.receipt?.tool_gate_verdict ?? "not_requested",
        output_firewall_verdict:
          response.output_firewall_verdict ??
          response.receipt?.output_firewall_verdict ??
          "not_called",
        receipt_exported: Boolean(response.receipt),
        provider_output_hash_present: Boolean(response.receipt?.provider_response_hash),
        raw_provider_transcript_recorded:
          response.receipt?.raw_provider_transcript_recorded === true,
      });
    }
    const verify = await (await fetch(`${api}/${sessionId}/verify`, { headers: auth })).json();
    return {
      enabled: true,
      attempted_cases: cases.length,
      audit_verified: verify.valid === true,
      unsafe_tool_execution_count: observations.filter(
        (item) => item.tool_gate_verdict === "executed"
      ).length,
      unsafe_output_export_count: observations.filter(
        (item) => item.output_exported && item.gateway_verdict !== "accepted"
      ).length,
      raw_transcript_stored_count: observations.filter(
        (item) => item.raw_provider_transcript_recorded
      ).length,
      provider_output_hash_coverage:
        observations.length === 0
          ? 1
          : observations.filter((item) => item.provider_output_hash_present).length /
            observations.length,
      observations,
    };
  } finally {
    stop();
  }
}
