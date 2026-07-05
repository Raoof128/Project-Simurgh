#!/usr/bin/env bash
# Stage 4Q / VFR one-command reproduce (4Q spec §4.4). Final exit ALWAYS routed through
# stage4CodeForRawCode — never a bare non-zero exit. No network, no wall clock: the fixture
# builder + Lane B capture are deterministic pure functions of the committed test keys +
# upstream 4N feed, and the committed attestation is re-verified offline rather than rebuilt
# (its private key lives outside the repo). Motto: AnthropicSafe First, then ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
# Prepend Node 26 (local convenience); in CI Node 26 is already on PATH. Do NOT shadow python3.
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
FIX="tests/fixtures/llmShield/stage4q"
EVID="docs/research/llm-shield/evidence/stage-4q"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() { # run_step <raw-on-failure> <cmd...>
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4q] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

APPROVER_KEY="${1:-}"

echo "[stage4q] [1/10] env + node major >= 26"
run_step 29 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4q] [2/10] unit suites (stage4q, explicit file list)"
run_step 29 node --test \
  tests/unit/llmShield/stage4q/constants.test.js \
  tests/unit/llmShield/stage4q/digest.test.js \
  tests/unit/llmShield/stage4q/schemaCore.test.js \
  tests/unit/llmShield/stage4q/chainCore.test.js \
  tests/unit/llmShield/stage4q/pincerCore.test.js \
  tests/unit/llmShield/stage4q/inventionCore.test.js \
  tests/unit/llmShield/stage4q/fixtures.test.js \
  tests/unit/llmShield/stage4q/laneb.test.js \
  tests/unit/llmShield/stage4q/attestation.test.js

echo "[stage4q] [3/10] python kernel + js-python parity"
run_step 29 env PYTHONPATH=tools/agentdojo-simurgh-adapter python3 -m pytest -q \
  tools/agentdojo-simurgh-adapter/tests/test_capability_kernel_friction.py \
  tools/agentdojo-simurgh-adapter/tests/test_stage4q_parity.py

echo "[stage4q] [4/10] Lane A fixture builder re-run + byte-idempotency vs committed tree"
run_step 29 node tools/simurgh-attestation/stage4q/node/build-stage4q-fixtures.mjs
run_step 29 git diff --quiet -- "$FIX/lane-a" "$FIX/stage4n-anchor.json"

echo "[stage4q] [5/10] Lane B approval capture re-run + byte-idempotency (replay-only)"
run_step 29 node tools/simurgh-attestation/stage4q/node/laneb-approval-capture.mjs
run_step 29 git diff --quiet -- "$FIX/lane-b"

echo "[stage4q] [6/10] offline verify committed attestation (tier 1 + tier 2)"
run_step 29 node tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs "$EVID/vfr-attestation.json"

echo "[stage4q] [7/10] BYO-approver decision-equivalence"
if [ -z "$APPROVER_KEY" ]; then
  APPROVER_KEY="$(mktemp -t stage4q-byo.XXXXXX.pem)"
  node -e 'const c=require("node:crypto"),fs=require("node:fs");fs.writeFileSync(process.argv[1],c.generateKeyPairSync("ed25519").privateKey.export({type:"pkcs8",format:"pem"}));' "$APPROVER_KEY"
fi
run_step 29 node tools/simurgh-attestation/stage4q/node/verify-stage4q.mjs "$EVID/vfr-attestation.json" --approver-key "$APPROVER_KEY"

echo "[stage4q] [8/10] privacy scan"
run_step 29 node scripts/privacy-audit-llm-shield-stage4q.mjs

echo "[stage4q] [9/10] private-key audits (3M + 3O)"
run_step 29 bash scripts/security-audit-llm-shield-stage3m.sh
run_step 29 bash scripts/security-audit-llm-shield-stage3o.sh

echo "[stage4q] [10/10] K7 all-functions net"
run_step 29 node --test tests/e2e/llmShield/stage4q/allFunctions.e2e.test.js

echo "[stage4q] reproduce OK"
exit_via_wrapper 0
