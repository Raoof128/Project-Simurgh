#!/usr/bin/env bash
# Stage 4P / VOCA one-command reproduce (4P spec §13, task-13 brief). Final exit ALWAYS
# routed through stage4CodeForRawCode — never a bare non-zero exit. No network, no wall
# clock: the fixture builder + Lane B capture are deterministic pure functions of the
# committed test keys + upstream (4N/4O) fixtures, and the committed attestation is
# re-verified offline rather than rebuilt (its private key lives outside the repo).
# Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
# Prepend Node 26 only (local convenience); do NOT shadow the system python3, which is the
# interpreter that carries the other stages' pytest mirrors. In CI, Node 26 is on PATH.
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4p"
EVID="docs/research/llm-shield/evidence/stage-4p"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4p] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4p] [1/9] env + node major >= 26"
run_step 29 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4p] [2/9] unit suites (stage4p, explicit file list)"
run_step 29 node --test \
  tests/unit/llmShield/stage4p/attestation.test.js \
  tests/unit/llmShield/stage4p/chainCore.test.js \
  tests/unit/llmShield/stage4p/constants.test.js \
  tests/unit/llmShield/stage4p/cpcCore.test.js \
  tests/unit/llmShield/stage4p/custodyCore.test.js \
  tests/unit/llmShield/stage4p/digest.test.js \
  tests/unit/llmShield/stage4p/fixtures.test.js \
  tests/unit/llmShield/stage4p/inventionCore.test.js \
  tests/unit/llmShield/stage4p/laneb.test.js \
  tests/unit/llmShield/stage4p/schemaCore.test.js

echo "[stage4p] [3/9] fixture builder re-run + byte-idempotency vs committed tree"
run_step 29 node tools/simurgh-attestation/stage4p/node/build-stage4p-fixtures.mjs
run_step 29 git diff --quiet -- "$FIX"

echo "[stage4p] [4/9] Lane B relay capture re-run + byte-idempotency vs committed tree"
run_step 29 node tools/simurgh-attestation/stage4p/node/laneb-relay-capture.mjs
run_step 29 git diff --quiet -- "$FIX"

echo "[stage4p] [5/9] offline verifier on the committed attestation bundle"
run_step 29 node tools/simurgh-attestation/stage4p/node/verify-stage4p.mjs \
  --offline "$EVID/voca-attestation.json"

echo "[stage4p] [6/9] all-functions e2e net (export inventory + tamper matrix + cross-stage invariants + privacy scan)"
run_step 29 node --test tests/e2e/llmShield/stage4p/*.test.js

echo "[stage4p] [7/9] private-key audits (stage3m + stage3o) keep the 4P test keys allowlisted"
run_step 29 bash scripts/security-audit-llm-shield-stage3m.sh
run_step 29 bash scripts/security-audit-llm-shield-stage3o.sh

echo "[stage4p] [8/9] egress gate: evidence carries digests + enums only, no raw tool text"
run_step 29 bash -c '! grep -rEn "\"(description|inputSchema|hostname|url)\"" docs/research/llm-shield/evidence/stage-4p/'

echo "[stage4p] [9/9] byte idempotency: fixtures + evidence are read-only under reproduce"
run_step 29 git diff --quiet -- "$FIX" "$EVID"

echo "[stage4p] ALL GREEN"
exit_via_wrapper 0
