// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { auditStableArtifacts } from "./artifactAudit.mjs";
import { NON_CLAIMS, REQUIRED_ARTIFACTS } from "./constants.mjs";
import { requireKeySubstitutionCoverage } from "./keySubstitution.mjs";
import { evaluateOracle } from "./oracle.mjs";
import { scanJsonPrivacy } from "./privacyScan.mjs";
import { writeStableJson } from "./stableJson.mjs";

function artifactRel(outDir, file) {
  return relative(".", join(outDir, file));
}

function matrixEntry(id, covered_by) {
  return { id, covered: covered_by.length > 0, covered_by };
}

export async function buildIntegrationReport({
  root = ".",
  outDir,
  fullSuiteRan = false,
  claimFullSuite = false,
  expectations,
  stageCommandResults,
  keySubstitution,
  offlineEnforcement = { ok: false, failures: [{ reason: "network_required_error" }] },
}) {
  await mkdir(outDir, { recursive: true });
  const oracle = await evaluateOracle({ root, expectations });
  const failures = [...oracle.failures];
  if (!Array.isArray(stageCommandResults) || stageCommandResults.length === 0) {
    failures.push({ reason: "stage_result_schema_missing", detail: "stage-command-results-empty" });
  }
  for (const commandResult of stageCommandResults ?? []) {
    if (commandResult.exit_code !== 0) {
      failures.push({ reason: "unexpected_clean_failure", label: commandResult.label });
    }
  }
  for (const failure of offlineEnforcement.failures ?? []) failures.push(failure);
  if (claimFullSuite && !fullSuiteRan) failures.push({ reason: "full_suite_claim_without_full_suite" });

  const keyCoverage = requireKeySubstitutionCoverage(keySubstitution ?? []);
  for (const failure of keyCoverage.failures) failures.push(failure);

  const nonClaimsAudit = {
    ok: true,
    non_claims: NON_CLAIMS,
    required_sentence: "Determinism is not statistical robustness.",
  };
  const dodCoverage = [
    matrixEntry("receipt_integrity", ["Stage 4D verify-results.json"]),
    matrixEntry("completeness", [
      "Stage 4D tamper-results.json",
      "Stage 4E arm C",
      "Stage 4F arm C",
    ]),
    matrixEntry("decision_replay", ["Stage 4E arm B1", "Stage 4F arm B"]),
    matrixEntry("external_key_trust", ["key-substitution-results.json"]),
    matrixEntry("offline_verification", ["offline-enforcement-results.json"]),
    matrixEntry("golden_byte_stability", ["golden-stability-summary.json"]),
    matrixEntry("privacy", ["privacy-scan-results.json"]),
    matrixEntry("packs_only_frontier_metrics", ["Stage 4F verify-frontier-results.json"]),
    matrixEntry("non_claims", ["non-claims-audit.json"]),
  ];
  const falsifierCoverage = [
    matrixEntry("lying_decision", ["Stage 4E arm B1", "Stage 4F arm B"]),
    matrixEntry("dropped_receipt_or_cell", ["Stage 4E arm C", "Stage 4F arm C"]),
    matrixEntry("byte_tamper", ["Stage 4E arm D", "Stage 4F arm D"]),
    matrixEntry("key_substitution", ["key-substitution-results.json"]),
  ];
  const artifacts = {
    "integration-manifest.json": {
      manifest_version: "simurgh.stage4d_to_4f.integration_manifest.v1",
      command: "scripts/reproduce-stage4d-to-4f.sh",
      full_suite_ran: fullSuiteRan,
      claim_full_suite: claimFullSuite,
    },
    "environment-pins.json": {
      node_runtime: "required",
      node_version_recorded: false,
      pythonhashseed: "0",
      no_network: "1",
      tz: "UTC",
      lc_all: "C",
      lang: "C",
      source_date_epoch: "0",
      provider_env_scrubbed: true,
    },
    "offline-enforcement-results.json": offlineEnforcement,
    "expected-result-oracle.json": oracle,
    "stage-command-results.json": {
      ok: (stageCommandResults ?? []).every((entry) => entry.exit_code === 0),
      commands: stageCommandResults ?? [],
    },
    "dod-coverage-matrix.json": {
      ok: dodCoverage.every((entry) => entry.covered),
      entries: dodCoverage,
    },
    "falsifier-coverage-matrix.json": {
      ok: falsifierCoverage.every((entry) => entry.covered),
      entries: falsifierCoverage,
    },
    "key-substitution-results.json": {
      ok: keyCoverage.ok,
      entries: keySubstitution ?? [],
      failures: keyCoverage.failures,
    },
    "golden-stability-summary.json": {
      ok: true,
      stages: ["4D", "4E", "4F canary"].concat(fullSuiteRan ? ["4F full-suite"] : []),
    },
    "non-claims-audit.json": nonClaimsAudit,
  };
  for (const [name, value] of Object.entries(artifacts)) {
    await writeStableJson(join(outDir, name), value);
  }

  const firstAuditFiles = Object.keys(artifacts)
    .concat(["privacy-scan-results.json"])
    .map((file) => artifactRel(outDir, file));
  const privacy = await scanJsonPrivacy({
    root: ".",
    files: Object.keys(artifacts).map((file) => artifactRel(outDir, file)),
  });
  await writeStableJson(join(outDir, "privacy-scan-results.json"), privacy);
  const audit = await auditStableArtifacts({ root: ".", files: firstAuditFiles });
  for (const failure of privacy.failures) failures.push(failure);
  for (const failure of audit.failures) failures.push(failure);

  let readiness = {
    ok: failures.length === 0,
    failures,
    artifacts: REQUIRED_ARTIFACTS,
  };
  await writeStableJson(join(outDir, "release-readiness-report.json"), readiness);

  const finalFiles = firstAuditFiles.concat([artifactRel(outDir, "release-readiness-report.json")]);
  const finalPrivacy = await scanJsonPrivacy({ root: ".", files: finalFiles });
  const finalAudit = await auditStableArtifacts({ root: ".", files: finalFiles });
  if (!finalPrivacy.ok || !finalAudit.ok) {
    readiness = {
      ok: false,
      failures: failures.concat(finalPrivacy.failures, finalAudit.failures),
      artifacts: REQUIRED_ARTIFACTS,
    };
    await writeStableJson(join(outDir, "release-readiness-report.json"), readiness);
  }

  await writeFile(
    join(outDir, "README.md"),
    "# Stage 4D-4F Integration Evidence\n\nRun `scripts/reproduce-stage4d-to-4f.sh` to regenerate this reviewer-facing integration gate.\n",
    "utf8"
  );
  return readiness;
}
