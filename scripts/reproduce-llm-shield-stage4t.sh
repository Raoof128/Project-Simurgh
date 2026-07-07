#!/usr/bin/env bash
# Stage 4T / VIC one-command reproduce (4T spec §10). Verify-only for Lane B:
# the committed live MCP capture is re-verified, never regenerated (ephemeral keys).
# Lane A corpus + attestation are deterministic pure functions of the committed
# fixture keys, rebuilt and byte-compared. No network, no wall clock.
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
EVID="docs/research/llm-shield/evidence/stage-4t"
FIX="tests/fixtures/llmShield/stage4t/expected-results"
S4T="tools/simurgh-attestation/stage4t"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4t] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4t] [1/8] env + node major >= 26"
run_step 133 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4t] [2/8] unit suites (explicit globs)"
run_step 133 node --test \
  tests/unit/llmShield/stage4t/exitCodes.test.js \
  tests/unit/llmShield/stage4t/constants.test.js \
  tests/unit/llmShield/stage4t/templateMap.test.js \
  tests/unit/llmShield/stage4t/censusCore.test.js \
  tests/unit/llmShield/stage4t/projectionCore.test.js \
  tests/unit/llmShield/stage4t/viewCore.test.js \
  tests/unit/llmShield/stage4t/capsuleCore.test.js \
  tests/unit/llmShield/stage4t/fixtures.test.js \
  tests/unit/llmShield/stage4t/attestation.test.js \
  tests/unit/llmShield/stage4t/parity.test.js

echo "[stage4t] [3/8] rebuild Lane A corpus -> byte-stable"
run_step 133 node "$S4T/node/build-stage4t-fixtures.mjs"
run_step 133 git diff --exit-code -- "$FIX/laneA"

echo "[stage4t] [4/8] rebuild attestation -> byte-stable"
run_step 134 node "$S4T/node/build-stage4t-attestation.mjs"
run_step 134 git diff --exit-code -- "$EVID/attestation/vic-attestation.json"

echo "[stage4t] [5/8] offline verify -- public tier (structural)"
run_step 134 node "$S4T/node/verify-stage4t-attestation.mjs" --tier public "$EVID/attestation/vic-attestation.json"

echo "[stage4t] [6/8] offline verify -- audit tier (engine re-run per Lane A fixture)"
run_step 142 node "$S4T/node/verify-stage4t-attestation.mjs" --tier audit "$EVID/attestation/vic-attestation.json"

echo "[stage4t] [7/8] VERIFY committed Lane B capture (never regenerate) + tamper-negatives"
run_step 148 node "$S4T/laneb/run-laneb-incident-ceremony.mjs" --verify
run_step 140 node -e '
import("./tools/simurgh-attestation/stage4t/node/build-stage4t-fixtures.mjs").then(async ({ buildLaneAFixtures }) => {
  const { evaluateCapsuleSafe } = await import("./tools/simurgh-attestation/stage4t/core/capsuleCore.mjs");
  const { buildGreenBundle, STAGE_VERIFIERS } = await import("./tools/simurgh-attestation/stage4t/node/greenCapsule.mjs");
  const { pubKeyPem } = buildGreenBundle();
  const fx = buildLaneAFixtures();
  // tamper a census item -> expect a census-law failure (140); tamper a view -> 148.
  const census = fx.find((f) => f.expected_raw === 140);
  const view = fx.find((f) => f.expected_raw === 148);
  const a = evaluateCapsuleSafe(census.bundle, { capsulePubKeyPem: pubKeyPem, stageVerifiers: STAGE_VERIFIERS, ...census.evalOpts }).raw;
  const b = evaluateCapsuleSafe(view.bundle, { capsulePubKeyPem: pubKeyPem, stageVerifiers: STAGE_VERIFIERS, ...view.evalOpts }).raw;
  process.exit(a === 140 && b === 148 ? 0 : 1);
});'

echo "[stage4t] [8/8] guarded Lean build (No Hearsay) if lean on PATH"
if command -v lean >/dev/null 2>&1; then
  run_step 133 lean proofs/stage4t/NoHearsay.lean
  run_step 133 bash -c '! grep -Rn "\bsorry\b" proofs/stage4t'
else
  echo "[stage4t] lean not on PATH -> skipped (dedicated lean-check CI job covers it)"
fi

echo "[stage4t] reproduce OK (raw 0)"
