#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

AUDIT_DIR="docs/research/llm-shield/evidence/stage-4h/full-e2e-audit"
COMMAND_OUTPUT="${AUDIT_DIR}/command-output.txt"

mkdir -p "$AUDIT_DIR"
: >"$COMMAND_OUTPUT"

export TZ=UTC
export LC_ALL=C
export LANG=C
export SOURCE_DATE_EPOCH=0
export PYTHONHASHSEED=0
export NO_NETWORK=1
unset OPENAI_API_KEY ANTHROPIC_API_KEY GOOGLE_API_KEY BROWSERBASE_API_KEY

run_step() {
  local name="$1"
  shift
  echo "==> ${name}" | tee -a "$COMMAND_OUTPUT"
  "$@" 2>&1 | tee -a "$COMMAND_OUTPUT"
}

assert_no_released_evidence_drift() {
  local drift
  drift="$(
    git status --porcelain -- docs/research/llm-shield/evidence/stage-4h \
      | grep -v 'docs/research/llm-shield/evidence/stage-4h/full-e2e-audit/' || true
  )"
  if [[ -n "$drift" ]]; then
    echo "Released Stage 4H evidence drift outside full-e2e-audit:" | tee -a "$COMMAND_OUTPUT"
    echo "$drift" | tee -a "$COMMAND_OUTPUT"
    return 1
  fi
}

run_step "Stage 4H reproduce" scripts/reproduce-llm-shield-stage4h.sh
assert_no_released_evidence_drift

run_step "Stage 4H targeted unit tests" \
  node --test tests/unit/llmShield/stage4h/*.test.js

run_step "Stage 4H full smoke" \
  node --test tests/e2e/llmShield/stage4hFullSmoke.test.js

run_step "Format check" npm run format:check
run_step "Diff check" git diff --check
assert_no_released_evidence_drift

node --input-type=module <<'NODE'
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stage4CodeForRawCode } from "./tools/simurgh-attestation/stage4h/exitCodes.mjs";

const auditDir = "docs/research/llm-shield/evidence/stage-4h/full-e2e-audit";
const offline = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/offline-report.json", "utf8")
);
const qGate = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/q-gate-results.json", "utf8")
);
const tamper = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/tamper-results.json", "utf8")
);
const privacy = JSON.parse(
  readFileSync("docs/research/llm-shield/evidence/stage-4h/privacy-report.json", "utf8")
);

const summary = {
  stage: "4H",
  audit: "full_chain_e2e",
  status: "pass",
  base_tag: "v2.18.0-stage-4h-proof-carrying-containment",
  base_commit: "7a2039136d44cf179cca5836a33596a7620c87e5",
  runtime_logic_changes: false,
  levels: {
    "4H.0": "signed_digest_binding_exercised",
    "4H.1": "dfi_certificate_derivation_exercised",
    "4H.2": "q0_q4_discrimination_exercised",
    "4H.3": "q6_q7_exercised",
    "4H.4": "q3_typed_exit_exercised",
    "4H.5": "reproduce_byte_stability_antitheatre_exercised"
  },
  q3: {
    clean_run_hits: offline.clean_run_hits,
    egress_double_caught: offline.egress_double_caught,
    egress_double_raw_code: offline.egress_double_raw_code,
    egress_double_typed_exit: stage4CodeForRawCode(offline.egress_double_raw_code),
    unshare_note:
      "unshare is optional; when unavailable, in-process Q3 harness remains authoritative"
  },
  raw_code_matrix: {
    q0_clean: qGate.gates.Q0.expected_results["q0-clean-disconnected-untrusted"],
    q4a_forged_premise: qGate.gates.Q4.expected_results["q4a-forged-premise-digest"],
    q4b_dirty_replay: qGate.gates.Q4.expected_results["q4b-clean-derivation-over-dirty-replay"],
    q4c_partial_omission: qGate.gates.Q4.expected_results["q4c-derivation-scope-omission"],
    q3_egress: offline.egress_double_raw_code,
    q3_egress_typed_exit: stage4CodeForRawCode(offline.egress_double_raw_code),
    internal_fail_closed: 29,
    internal_fail_closed_typed_exit: stage4CodeForRawCode(29),
    unknown_raw_typed_exit: stage4CodeForRawCode(9999)
  },
  q_gates: {
    q0: qGate.gates.Q0.status,
    q1: qGate.gates.Q1.status,
    q2: qGate.gates.Q2.status,
    q3: qGate.gates.Q3.status,
    q4: qGate.gates.Q4.status,
    q5: qGate.gates.Q5.status,
    q6: qGate.gates.Q6.status,
    q7: qGate.gates.Q7.status
  },
  tamper: {
    tampered_accepted_count: tamper.tampered_accepted_count
  },
  privacy: {
    accepted_negative_count: privacy.accepted_negative_count,
    bounded_leakage: privacy.bounded_leakage
  },
  commands: [
    "scripts/reproduce-llm-shield-stage4h.sh",
    "node --test tests/unit/llmShield/stage4h/*.test.js",
    "node --test tests/e2e/llmShield/stage4hFullSmoke.test.js",
    "npm run format:check",
    "git diff --check"
  ],
  non_claim: "released-artifact audit only; no new runtime claim"
};

function assertEqual(actual, expected, name) {
  if (actual !== expected) {
    throw new Error(`${name}: expected ${expected}, got ${actual}`);
  }
}

assertEqual(summary.raw_code_matrix.q0_clean, 0, "q0_clean");
assertEqual(summary.raw_code_matrix.q4a_forged_premise, 22, "q4a_forged_premise");
assertEqual(summary.raw_code_matrix.q4b_dirty_replay, 24, "q4b_dirty_replay");
assertEqual(summary.raw_code_matrix.q4c_partial_omission, 26, "q4c_partial_omission");
assertEqual(summary.raw_code_matrix.q3_egress, 28, "q3_egress");
assertEqual(summary.raw_code_matrix.q3_egress_typed_exit, 2, "q3_egress_typed_exit");
assertEqual(
  summary.raw_code_matrix.internal_fail_closed_typed_exit,
  3,
  "internal_fail_closed_typed_exit"
);
assertEqual(summary.raw_code_matrix.unknown_raw_typed_exit, 3, "unknown_raw_typed_exit");

const functionSummary = {
  stage: "4H",
  audit: "function_path_coverage",
  status: "pass",
  public_checker_surface: [
    "canonicalPremises",
    "dfiCertificate",
    "exitCodes",
    "offlineHarness",
    "packBinding",
    "privacyGate",
    "schema",
    "tamperClosure",
    "verify-stage4h-digest-binding"
  ],
  strongest_focus: "4H.1 DFI certificate and derivation proof",
  tested_file: "tests/unit/llmShield/stage4h/fullFunctionCoverage.test.js",
  coverage_claim:
    "Exercises exported Stage 4H verifier/helper paths public to the Stage 4H checker surface; does not claim private branch exhaustiveness"
};

mkdirSync(auditDir, { recursive: true });
writeFileSync(`${auditDir}/full-e2e-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(
  `${auditDir}/function-coverage-summary.json`,
  `${JSON.stringify(functionSummary, null, 2)}\n`
);
NODE

echo "Stage 4H full-chain E2E: PASS" | tee -a "$COMMAND_OUTPUT"
