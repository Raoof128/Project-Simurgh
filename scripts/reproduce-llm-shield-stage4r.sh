#!/usr/bin/env bash
# Stage 4R / PCCC one-command reproduce (4R spec §15). Verify-only for Lane B:
# the committed ceremony capture is re-verified, never regenerated (refresh needs
# SIMURGH_REFRESH_STAGE4R_LANEB). Lane A corpus + attestation are deterministic
# pure functions of the committed fixture keys/scalars, rebuilt and byte-compared.
# No network, no wall clock. Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
KEYDIR="tests/fixtures/llmShield/stage4r/test-keys"
EVID="docs/research/llm-shield/evidence/stage-4r"
S4R="tools/simurgh-attestation/stage4r"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4r] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4r] [1/10] env + node major >= 26"
run_step 90 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4r] [2/10] unit suites (explicit globs)"
run_step 90 node --test \
  tests/unit/llmShield/stage4r/exitCodes.test.js \
  tests/unit/llmShield/stage4r/constants.test.js \
  tests/unit/llmShield/stage4r/edwards25519.test.js \
  tests/unit/llmShield/stage4r/maskCore.test.js \
  tests/unit/llmShield/stage4r/dleq.test.js \
  tests/unit/llmShield/stage4r/schemaCore.test.js \
  tests/unit/llmShield/stage4r/pcccCore.test.js \
  tests/unit/llmShield/stage4r/censusCore.test.js \
  tests/unit/llmShield/stage4r/fixtures.test.js \
  tests/unit/llmShield/stage4r/parity.test.js \
  tests/unit/llmShield/stage4r/fixturesCorpus.test.js \
  tests/unit/llmShield/stage4r/attestation.test.js

echo "[stage4r] [3/10] RFC 8032 vector gate (edwards25519 vs Node Ed25519)"
run_step 94 node --test tests/unit/llmShield/stage4r/edwards25519.test.js

echo "[stage4r] [4/10] rebuild Lane A corpus -> byte-stable"
run_step 90 node "$S4R/node/build-stage4r-fixtures.mjs"
run_step 90 git diff --exit-code -- "$EVID/lane-a/corpus.json"

echo "[stage4r] [5/10] rebuild attestation -> byte-stable"
run_step 90 node "$S4R/node/build-stage4r-attestation.mjs"
run_step 91 git diff --exit-code -- "$EVID/pccc-attestation.json"

echo "[stage4r] [6/10] offline verify -- public tier (digest-level)"
run_step 99 node "$S4R/node/verify-stage4r-attestation.mjs" --offline "$EVID" --tier public

echo "[stage4r] [7/10] offline verify -- audit tier (DLEQ, unilateral)"
run_step 93 node "$S4R/node/verify-stage4r-attestation.mjs" --offline "$EVID" --tier both

echo "[stage4r] [8/10] VERIFY committed Lane B capture (never regenerate)"
if [[ -n "${SIMURGH_REFRESH_STAGE4R_LANEB:-}" ]]; then
  echo "[stage4r] refusing to refresh Lane B inside reproduce" >&2
  exit_via_wrapper 98
fi
run_step 98 node --test tests/e2e/llmShield/stage4r/laneb.test.js

echo "[stage4r] [9/10] JS<->Python parity + Lean 6 theorems"
run_step 93 node --test tests/unit/llmShield/stage4r/parity.test.js
run_step 90 bash -c 'cd proofs/stage4r && lean NoPublicHerdToken.lean'

echo "[stage4r] [10/10] scans: forbidden live scalar, herd token, key audits, prettier"
SA="$(cat "$KEYDIR/INSECURE_FIXTURE_ONLY_operator-alpha-scalar.hex")"
SB="$(cat "$KEYDIR/INSECURE_FIXTURE_ONLY_operator-beta-scalar.hex")"
if grep -REq "$SA|$SB" "$EVID/lane-b" "$EVID/pccc-attestation.json"; then
  echo "[stage4r] forbidden live scalar found in lane-b/public evidence" >&2
  exit_via_wrapper 99
fi
run_step 91 bash scripts/security-audit-llm-shield-stage3m.sh
run_step 91 bash scripts/security-audit-llm-shield-stage3o.sh
run_step 90 npx prettier --check \
  "$S4R/**/*.mjs" \
  "tests/unit/llmShield/stage4r/*.test.js" \
  "tests/e2e/llmShield/stage4r/*.test.js"

echo "[stage4r] reproduce OK (raw $RAW)"
exit_via_wrapper "$RAW"
