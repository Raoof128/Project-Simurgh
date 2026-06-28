// SPDX-License-Identifier: AGPL-3.0-or-later

export const INTEGRATION_EVIDENCE_DIR =
  "docs/research/llm-shield/evidence/stage-4d-to-4f-integration";

export const STAGE_EVIDENCE_DIRS = [
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack",
  "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run",
  "docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto",
];

export const REQUIRED_ARTIFACTS = [
  "integration-manifest.json",
  "environment-pins.json",
  "offline-enforcement-results.json",
  "expected-result-oracle.json",
  "stage-command-results.json",
  "dod-coverage-matrix.json",
  "falsifier-coverage-matrix.json",
  "key-substitution-results.json",
  "privacy-scan-results.json",
  "golden-stability-summary.json",
  "non-claims-audit.json",
  "release-readiness-report.json",
  "README.md",
];

export const FAILURE_REASONS = [
  "network_required_error",
  "forbidden_provider_env",
  "forbidden_browser_automation",
  "forbidden_live_api_access",
  "hidden_local_service_required",
  "unexpected_clean_failure",
  "unexpected_red_arm_success",
  "unexpected_red_arm_reason",
  "missing_red_arm_result",
  "stage_result_schema_missing",
  "stage_artifact_mutation_attempted",
  "key_substitution_not_tested",
  "external_pubkey_mismatch",
  "privacy_leak_detected",
  "non_claim_missing",
  "volatile_artifact_field",
  "raw_log_in_stable_artifact",
  "full_suite_claim_without_full_suite",
];

export const STAGE_COMMANDS = [
  {
    stage: "4D",
    label: "stage4d_reproduce",
    command: "scripts/reproduce-stage4d.sh",
    fullSuite: false,
  },
  {
    stage: "4E",
    label: "stage4e_reproduce",
    command: "scripts/reproduce-stage4e.sh",
    fullSuite: false,
  },
  {
    stage: "4F",
    label: "stage4f_canary_reproduce",
    command: "scripts/reproduce-stage4f.sh",
    fullSuite: false,
  },
  {
    stage: "4F",
    label: "stage4f_full_suite_reproduce",
    command: "SIMURGH_RUN_STAGE4F_FULL=1 scripts/reproduce-stage4f.sh",
    fullSuite: true,
  },
];

export const NON_CLAIMS = [
  "not_model_safety",
  "not_policy_correctness",
  "not_production_readiness",
  "not_live_inference_integrity",
  "not_statistical_robustness",
  "not_real_world_exhaustiveness",
  "not_unmediated_action_coverage",
  "not_lying_executor_truth",
  "not_bypass_proof_enforcement",
];
