#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { INTEGRATION_EVIDENCE_DIR } from "./constants.mjs";
import { buildIntegrationReport } from "./integrationReport.mjs";
import { evaluateWrongKeyResult } from "./keySubstitution.mjs";
import { scanSourceForForbiddenNetworkUse } from "./offlineGuards.mjs";

function hasFlag(argv, name) {
  return argv.includes(name);
}

export function defaultExpectations() {
  return [
    {
      stage: "4D",
      arm: "clean",
      artifact_kind: "clean",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/verify-results.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4D",
      arm: "tamper-summary",
      artifact_kind: "red_arm_summary",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/tamper-results.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4D",
      arm: "adversarial-summary",
      artifact_kind: "red_arm_summary",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/adversarial-results.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4D",
      arm: "privacy-summary",
      artifact_kind: "privacy_summary",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/privacy-results.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4D",
      arm: "golden-summary",
      artifact_kind: "golden_summary",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/golden-results.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4D",
      arm: "closeout",
      artifact_kind: "closeout",
      path: "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/stage4d-closeout.json",
      expected_exit: 0,
      expected_reason: null,
    },
    {
      stage: "4E",
      arm: "arm-b1-lying-decision-record",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/arms/arm-b1-lying-decision-record/verify-results.json",
      expected_exit: 1,
      expected_reason: "replayed_decision_mismatch",
    },
    {
      stage: "4E",
      arm: "arm-c-observed-unreceipted",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/arms/arm-c-observed-unreceipted/verify-results.json",
      expected_exit: 1,
      expected_reason: "missing_receipt_for_observed_action",
    },
    {
      stage: "4E",
      arm: "arm-d-byte-tamper",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/arms/arm-d-byte-tamper/verify-results.json",
      expected_exit: 1,
      expected_reason: "receipt_signature_invalid",
    },
    {
      stage: "4F",
      arm: "arm-b-lying-decision",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/red-arms/arm-b-lying-decision/verify-frontier-results.json",
      expected_exit: 1,
      expected_reason: "replayed_decision_mismatch",
    },
    {
      stage: "4F",
      arm: "arm-c-dropped-scenario",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/red-arms/arm-c-dropped-scenario/verify-frontier-results.json",
      expected_exit: 1,
      expected_reason: "missing_cell",
    },
    {
      stage: "4F",
      arm: "arm-d-byte-tamper",
      artifact_kind: "red_arm",
      path: "docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/red-arms/arm-d-byte-tamper/verify-frontier-results.json",
      expected_exit: 1,
      expected_reason: "frontier_hash_mismatch",
    },
  ];
}

export async function main({ argv = process.argv.slice(2) } = {}) {
  const fullSuiteRan = hasFlag(argv, "--full-suite-ran");
  const claimFullSuite = hasFlag(argv, "--claim-full-suite");
  const stageCommandResults = JSON.parse(
    await readFile(
      "docs/research/llm-shield/evidence/stage-4d-to-4f-integration/stage-command-results.input.json",
      "utf8"
    )
  );
  const sourceFiles = [
    "scripts/reproduce-stage4d-to-4f.sh",
    "tools/simurgh-attestation/stage4d-to-4f/constants.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/stableJson.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/privacyScan.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/offlineGuards.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/oracle.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/keySubstitution.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/commandResults.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/artifactAudit.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/integrationReport.mjs",
    "tools/simurgh-attestation/stage4d-to-4f/build-integration-report.mjs",
  ];
  const offlineFailures = [];
  for (const file of sourceFiles) {
    const scan = scanSourceForForbiddenNetworkUse(await readFile(file, "utf8"));
    for (const failure of scan.failures) offlineFailures.push({ file, ...failure });
  }
  const keySubstitution = [
    await evaluateWrongKeyResult({
      klass: "stage4d_pack",
      path: "docs/research/llm-shield/evidence/stage-4d-to-4f-integration/wrong-key/stage4d-pack-verify-results.json",
    }),
    await evaluateWrongKeyResult({
      klass: "stage4e_scenario_pack",
      path: "docs/research/llm-shield/evidence/stage-4d-to-4f-integration/wrong-key/stage4e-pack-verify-results.json",
    }),
    await evaluateWrongKeyResult({
      klass: "stage4f_cell_frontier",
      path: "docs/research/llm-shield/evidence/stage-4d-to-4f-integration/wrong-key/stage4f-frontier-verify-results.json",
    }),
  ];
  const readiness = await buildIntegrationReport({
    outDir: INTEGRATION_EVIDENCE_DIR,
    fullSuiteRan,
    claimFullSuite,
    expectations: defaultExpectations(),
    stageCommandResults,
    keySubstitution,
    offlineEnforcement: {
      ok: offlineFailures.length === 0,
      checked_files: sourceFiles,
      forbidden_sources_checked: [
        "net",
        "tls",
        "http",
        "https",
        "dns",
        "fetch",
        "WebSocket",
        "browser automation",
        "provider SDKs",
        "child-process network commands",
      ],
      failures: offlineFailures,
    },
  });
  return readiness.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`stage4d-to-4f integration: ${error.message}`);
      process.exit(2);
    });
}
