#!/usr/bin/env bash
# Stage 4W / VSN one-command reproduce (4W spec §3). Verify-only for Lane B/C:
# the committed captures are re-verified, never regenerated with a live model.
# Lane A corpus + attestation are deterministic pure functions of the committed
# fixture keys, rebuilt and byte-compared. No network, no wall clock.
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
EVID="docs/research/llm-shield/evidence/stage-4w"
S4W="tools/simurgh-attestation/stage4w"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4w] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4w] [1/9] env + node major >= 26"
run_step 162 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4w] [2/9] unit suites (explicit globs)"
run_step 162 node --test \
  tests/unit/llmShield/stage4w/exitCodes.test.js \
  tests/unit/llmShield/stage4w/constants.test.js \
  tests/unit/llmShield/stage4w/textCore.test.js \
  tests/unit/llmShield/stage4w/leakageGate.test.js \
  tests/unit/llmShield/stage4w/narrativeBinding.test.js \
  tests/unit/llmShield/stage4w/narrativeCore.test.js \
  tests/unit/llmShield/stage4w/narrativeContest.test.js \
  tests/unit/llmShield/stage4w/narrativeViews.test.js \
  tests/unit/llmShield/stage4w/fixtures.test.js \
  tests/unit/llmShield/stage4w/attestation.test.js \
  tests/unit/llmShield/stage4w/lanec.test.js \
  tests/unit/llmShield/stage4w/parity.test.js

echo "[stage4w] [3/9] rebuild Lane A corpus -> byte-stable"
run_step 162 node "$S4W/node/build-stage4w-fixtures.mjs"
run_step 162 git diff --exit-code -- "$EVID/lane-a/corpus.json"

echo "[stage4w] [4/9] rebuild attestation -> byte-stable"
run_step 163 node "$S4W/node/build-stage4w-attestation.mjs"
run_step 163 git diff --exit-code -- "$EVID/attestation/vsn-attestation.json" "$EVID/attestation/bridge.json"

echo "[stage4w] [5/9] offline verify -- public tier (structural)"
run_step 163 node "$S4W/node/verify-stage4w-attestation.mjs" "$EVID/attestation/vsn-attestation.json"

echo "[stage4w] [6/9] offline verify -- audit tier (rerun every Lane A fixture + Lane B)"
run_step 169 node "$S4W/node/verify-stage4w-attestation.mjs" --audit "$EVID/attestation/vsn-attestation.json"

echo "[stage4w] [7/9] python public-tier parity over the corpus"
run_step 169 node --test tests/unit/llmShield/stage4w/parity.test.js

echo "[stage4w] [8/9] e2e nets (K7 all-functions + Lane B + browser parity)"
run_step 172 node --test \
  tests/e2e/llmShield/stage4w/k7AllFunctions.test.js \
  tests/e2e/llmShield/stage4w/laneb.test.js \
  tests/e2e/llmShield/stage4w/browserParity.test.js

echo "[stage4w] [9/9] guarded Lean build (Slot-Bound Narrative) if lean on PATH"
if command -v lean >/dev/null 2>&1; then
  run_step 162 lean proofs/stage4w/SlotBoundNarrative.lean
  run_step 162 bash -c '! grep -Rn "\bsorry\b" proofs/stage4w'
else
  echo "[stage4w] lean not on PATH -> skipped (dedicated lean-check CI job covers it)"
fi

echo "[stage4w] reproduce OK (raw $RAW)"
