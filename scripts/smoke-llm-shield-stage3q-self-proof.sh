#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Stage 3Q self-proof smoke: every detector fired, clean baseline passed, zero laundering.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
node - <<'NODE'
import { readFile } from "node:fs/promises";
const sp = JSON.parse(await readFile("docs/research/llm-shield/evidence/stage-3q/self-proof/self-proof-results.json","utf8"));
const fail=[];
if(!sp.summary.clean_baseline_passed) fail.push("clean baseline");
if(!sp.summary.all_expected_detectors_fired) fail.push("a detector did not fire");
if(sp.summary.integrity_laundering_successes!==0) fail.push("integrity laundering succeeded");
for(const fx of sp.fixtures) if(!fx.passed) fail.push(fx.fixture_id);
if(fail.length){console.error("stage3q self-proof: FAIL",JSON.stringify(fail));process.exit(1);}
console.log("stage3q self-proof: PASS");
NODE
