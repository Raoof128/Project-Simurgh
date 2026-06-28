// SPDX-License-Identifier: AGPL-3.0-or-later
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { buildIntegrationReport } from "../../../../tools/simurgh-attestation/stage4d-to-4f/integrationReport.mjs";

async function writeJson(root, rel, value) {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

test("buildIntegrationReport writes stable summaries and rejects false full-suite claim", async () => {
  const root = await mkdtemp(join(tmpdir(), "simurgh-integration-report-"));
  await writeJson(root, "stage4d/verify-results.json", { ok: true, exit_code: 0 });
  await writeJson(root, "stage4e/arms/arm-b1/verify-results.json", {
    ok: false,
    exit_code: 1,
    first_failure: { reason: "replayed_decision_mismatch" },
  });
  await writeJson(root, "stage4f/red-arms/arm-c/verify-frontier-results.json", {
    ok: false,
    exit_code: 1,
    first_failure: { reason: "missing_cell" },
  });
  const outDir = join(root, "integration");
  const report = await buildIntegrationReport({
    root,
    outDir,
    fullSuiteRan: false,
    claimFullSuite: true,
    stageCommandResults: [
      {
        label: "stage4d_reproduce",
        command: "scripts/reproduce-stage4d.sh",
        exit_code: 0,
        expected_green: true,
        log_hash: "sha256:" + "a".repeat(64),
        log_name: "stage4d_reproduce.log",
      },
      {
        label: "stage4e_reproduce",
        command: "scripts/reproduce-stage4e.sh",
        exit_code: 0,
        expected_green: true,
        log_hash: "sha256:" + "b".repeat(64),
        log_name: "stage4e_reproduce.log",
      },
      {
        label: "stage4f_canary_reproduce",
        command: "scripts/reproduce-stage4f.sh",
        exit_code: 0,
        expected_green: true,
        log_hash: "sha256:" + "c".repeat(64),
        log_name: "stage4f_canary_reproduce.log",
      },
    ],
    keySubstitution: [
      {
        class: "stage4d_pack",
        ok: true,
        method: "observed_wrong_key_verification",
        observed_exit: 1,
        observed_reason: "embedded_key_mismatch",
      },
      {
        class: "stage4e_scenario_pack",
        ok: true,
        method: "observed_wrong_key_verification",
        observed_exit: 1,
        observed_reason: "embedded_key_mismatch",
      },
      {
        class: "stage4f_cell_frontier",
        ok: true,
        method: "observed_wrong_key_verification",
        observed_exit: 1,
        observed_reason: "pack_verify_failed",
      },
    ],
    offlineEnforcement: {
      ok: true,
      checked_files: ["sample.mjs"],
      forbidden_sources_checked: ["net"],
      failures: [],
    },
    expectations: [
      {
        stage: "4D",
        arm: "clean",
        artifact_kind: "clean",
        path: "stage4d/verify-results.json",
        expected_exit: 0,
        expected_reason: null,
      },
      {
        stage: "4E",
        arm: "arm-b1",
        artifact_kind: "red_arm",
        path: "stage4e/arms/arm-b1/verify-results.json",
        expected_exit: 1,
        expected_reason: "replayed_decision_mismatch",
      },
      {
        stage: "4F",
        arm: "arm-c",
        artifact_kind: "red_arm",
        path: "stage4f/red-arms/arm-c/verify-frontier-results.json",
        expected_exit: 1,
        expected_reason: "missing_cell",
      },
    ],
  });
  assert.equal(report.ok, false);
  assert.ok(
    report.failures.some((failure) => failure.reason === "full_suite_claim_without_full_suite")
  );
  const readiness = JSON.parse(await readFile(join(outDir, "release-readiness-report.json"), "utf8"));
  assert.equal(readiness.ok, false);
  assert.equal(
    readiness.failures.some((failure) => failure.reason === "full_suite_claim_without_full_suite"),
    true
  );
});
