#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# Stage 5S — VWQ: reproduce every declared gate, in order, with a per-gate verdict.
#
# NEVER `cmd && echo OK`. Under `set -e` that idiom fails OPEN: when `cmd` fails the `&&` short
# circuits, the compound statement's exit status is the failure, and — depending on where it sits —
# the script can carry on or the verdict line simply never prints while the run still reports
# success. 5E's droplet reproduce caught exactly two of these. Every gate below runs on its own
# line, its status is captured explicitly, and the verdict is printed from that captured status.
#
# Usage: bash scripts/reproduce-llm-shield-stage5s.sh

set -euo pipefail

cd "$(dirname "$0")/.."

PASSED=0
FAILED=0
declare -a RESULTS=()

run_gate() {
  local name="$1"
  shift
  local status=0
  # Run it. Capture the status on its own line — no `&&`, no `||` chain that could swallow it.
  set +e
  "$@" >/tmp/vwq-gate.log 2>&1
  status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    PASSED=$((PASSED + 1))
    RESULTS+=("PASS  $name")
    printf 'PASS  %s\n' "$name"
  else
    FAILED=$((FAILED + 1))
    RESULTS+=("FAIL  $name (exit $status)")
    printf 'FAIL  %s (exit %s)\n' "$name" "$status"
    sed -n '1,20p' /tmp/vwq-gate.log
  fi
}

# A gate whose SUCCESS is a non-zero exit — the verifier must refuse a key. Written as its own
# function so the inversion is explicit rather than hidden in a negation somebody may not read.
run_refusal_gate() {
  local name="$1"
  shift
  local status=0
  set +e
  "$@" >/tmp/vwq-gate.log 2>&1
  status=$?
  set -e
  if [ "$status" -ne 0 ]; then
    PASSED=$((PASSED + 1))
    printf 'PASS  %s (refused, exit %s)\n' "$name" "$status"
  else
    FAILED=$((FAILED + 1))
    printf 'FAIL  %s — it ACCEPTED what it must refuse\n' "$name"
  fi
}

printf '=== Stage 5S — VWQ reproduce ===\n'

run_gate "G0  formatting"                    npm run format:check
run_gate "G1  unit suites"                   node --test tests/unit/llmShield/stage5s/canonical.test.js tests/unit/llmShield/stage5s/classes.test.js tests/unit/llmShield/stage5s/policy.test.js tests/unit/llmShield/stage5s/compatibility.test.js tests/unit/llmShield/stage5s/ancestry.test.js tests/unit/llmShield/stage5s/quorum.test.js tests/unit/llmShield/stage5s/receivers.test.js
run_gate "G2  status suites"                 node --test tests/unit/llmShield/stage5s/status.quorum.test.js tests/unit/llmShield/stage5s/status.comparison.test.js tests/unit/llmShield/stage5s/status.independence.test.js tests/unit/llmShield/stage5s/status.corroboration.test.js tests/unit/llmShield/stage5s/status.artifact.test.js
run_gate "G3  equivocation artifact"         node --test tests/unit/llmShield/stage5s/equivocation.test.js
run_gate "G4  finding ledger"                node --test tests/unit/llmShield/stage5s/findings.test.js
run_gate "G5  ordered evaluator"             node --test tests/unit/llmShield/stage5s/verify.test.js
run_gate "G6  fixture oracle boundary"       node --test tests/unit/llmShield/stage5s/fixtureOracle.test.js
run_gate "G7  Lane A acceptance matrix"      node --test tests/e2e/llmShield/stage5s/laneA.test.js
run_gate "G8  adjacent-pair order net"       node --test tests/e2e/llmShield/stage5s/checkOrderNet.test.js
run_gate "G9  tamper matrix"                 node --test tests/e2e/llmShield/stage5s/tamper.test.js
run_gate "G10 contract seams"                node --test tests/e2e/llmShield/stage5s/contractSeams.test.js
run_gate "G11 Lane B ceremony"               node --test tests/e2e/llmShield/stage5s/laneB.test.js
run_gate "G12 positive/negative controls"    node --test tests/e2e/llmShield/stage5s/controls.test.js
run_gate "G13 Lane C frozen capture"         node tools/simurgh-attestation/stage5s/node/verifyCapture.mjs --capture docs/research/llm-shield/evidence/stage-5s/lane-c/
run_gate "G14 cross-runtime parity"          node --test tests/e2e/llmShield/stage5s/parity.test.js
run_gate "G15 Lean proofs (floor 39)"        node scripts/check-lean-proofs.mjs
run_gate "G16 theorem set"                   node --test tests/unit/llmShield/stage5s/theoremSet.test.js
run_gate "G17 claim gate"                    node --test tests/unit/llmShield/stage5s/claimGate.test.js
run_gate "G18 attestation"                   node --test tests/e2e/llmShield/stage5s/attestation.test.js
run_gate "G19 acceptance matrix pin"         node --test tests/unit/llmShield/stage5s/acceptanceMatrix.test.js
run_gate "G20 spec pin"                      node --test tests/unit/llmShield/stage5s/specPin.test.js
run_gate "G21 CI trigger scope"              node --test tests/unit/llmShield/stage5s/triggerScope.test.js
run_gate "G22 write surface"                 node --test tests/unit/llmShield/stage5s/writeSurface.test.js
run_gate "G23 gate census"                   node --test tests/unit/llmShield/stage5s/gateCensus.test.js
run_gate "G24 K7-A all functions"            node --test tests/e2e/llmShield/stage5s/k7AllFunctions.test.js

# The attestation, end to end, from what is committed.
ENVELOPE=docs/research/llm-shield/evidence/stage-5s/attestation/vwq-attestation-envelope.json
run_gate "G25 attestation verifies"          node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle "$ENVELOPE"
run_refusal_gate "G26 attestation refuses --key" node tools/simurgh-attestation/verify-stage5s-attestation.mjs --bundle "$ENVELOPE" --key /dev/null

# Determinism: two builds, byte-identical. The diff is the gate.
rm -rf /tmp/vwq-f1 /tmp/vwq-f2
run_gate "G27 fixture build (1 of 2)"        node tools/simurgh-attestation/stage5s/node/buildFixtures.mjs --out /tmp/vwq-f1
run_gate "G28 fixture build (2 of 2)"        node tools/simurgh-attestation/stage5s/node/buildFixtures.mjs --out /tmp/vwq-f2
run_gate "G29 fixture determinism"           diff -r /tmp/vwq-f1 /tmp/vwq-f2

printf '\n=== verdict ===\n'
printf 'gates passed: %s\n' "$PASSED"
printf 'gates failed: %s\n' "$FAILED"

# Anti-vacuity. A run that executed no gate has not passed; it has not run.
if [ "$PASSED" -eq 0 ]; then
  printf 'REFUSED — no gate executed\n'
  exit 2
fi
if [ "$FAILED" -ne 0 ]; then
  printf 'REFUSED — %s gate(s) failed\n' "$FAILED"
  exit 1
fi
printf 'OK — every declared gate reproduced\n'
exit 0
