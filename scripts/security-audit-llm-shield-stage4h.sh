#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node --input-type=module <<'NODE'
import { buildCleanTamperContext, buildTamperMatrix } from "./tools/simurgh-attestation/stage4h/tamperClosure.mjs";

const matrix = buildTamperMatrix(buildCleanTamperContext());
const failures = matrix.results.filter(
  (result) =>
    result.accepted ||
    result.code !== result.expected_code ||
    result.reason !== result.expected_reason
);

if (matrix.clean.code !== 0 || matrix.tampered_accepted_count !== 0 || failures.length > 0) {
  console.error("stage4h q6 security audit FAIL:", JSON.stringify({ matrix, failures }, null, 2));
  process.exit(1);
}

console.log("stage4h q6 security audit: PASS");
NODE
