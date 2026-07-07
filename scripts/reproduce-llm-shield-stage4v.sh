#!/usr/bin/env bash
# Stage 4V / VDP one-command reproduce (4V spec §10). Verify-only for Lane B:
# the committed 2-process contest capture is re-verified, never regenerated.
# Lane A corpus + attestation are deterministic pure functions of the committed
# fixture keys, rebuilt and byte-compared. No network, no wall clock.
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
EVID="docs/research/llm-shield/evidence/stage-4v"
FIX="tests/fixtures/llmShield/stage4v/expected-results"
S4V="tools/simurgh-attestation/stage4v"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4v] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4v] [1/9] env + node major >= 26"
run_step 151 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4v] [2/9] unit suites (explicit globs)"
run_step 151 node --test \
  tests/unit/llmShield/stage4v/exitCodes.test.js \
  tests/unit/llmShield/stage4v/constants.test.js \
  tests/unit/llmShield/stage4v/bindingCore.test.js \
  tests/unit/llmShield/stage4v/contestCensus.test.js \
  tests/unit/llmShield/stage4v/conflictMap.test.js \
  tests/unit/llmShield/stage4v/counterCapsuleCore.test.js \
  tests/unit/llmShield/stage4v/greenContest.test.js \
  tests/unit/llmShield/stage4v/fixtures.test.js \
  tests/unit/llmShield/stage4v/attestation.test.js \
  tests/unit/llmShield/stage4v/parity.test.js

echo "[stage4v] [3/9] rebuild Lane A corpus -> byte-stable"
run_step 151 node "$S4V/node/build-stage4v-fixtures.mjs"
run_step 151 git diff --exit-code -- "$FIX/laneA"

echo "[stage4v] [4/9] rebuild attestation -> byte-stable"
run_step 152 node "$S4V/node/build-stage4v-attestation.mjs"
run_step 152 git diff --exit-code -- "$EVID/attestation/vdp-attestation.json"

echo "[stage4v] [5/9] offline verify -- public tier (structural)"
run_step 152 node "$S4V/node/verify-stage4v-attestation.mjs" --tier public "$EVID/attestation/vdp-attestation.json"

echo "[stage4v] [6/9] offline verify -- audit tier (contest re-run per Lane A fixture + Lane B)"
run_step 155 node "$S4V/node/verify-stage4v-attestation.mjs" --tier audit "$EVID/attestation/vdp-attestation.json"

echo "[stage4v] [7/9] python public-tier parity over the corpus"
run_step 155 node --test tests/unit/llmShield/stage4v/parity.test.js

echo "[stage4v] [8/9] e2e nets (K7 all-functions + Lane B + browser parity) + VERIFY capture"
run_step 161 node --test \
  tests/e2e/llmShield/stage4v/k7AllFunctions.test.js \
  tests/e2e/llmShield/stage4v/laneb.test.js \
  tests/e2e/llmShield/stage4v/browserParity.test.js
run_step 158 node "$S4V/laneb/run-laneb-contest-ceremony.mjs" --verify

echo "[stage4v] [9/9] guarded Lean build (Due Process) if lean on PATH"
if command -v lean >/dev/null 2>&1; then
  run_step 151 lean proofs/stage4v/DueProcess.lean
  run_step 151 bash -c '! grep -Rn "\bsorry\b" proofs/stage4v'
else
  echo "[stage4v] lean not on PATH -> skipped (dedicated lean-check CI job covers it)"
fi

echo "[stage4v] reproduce OK (raw $RAW)"
