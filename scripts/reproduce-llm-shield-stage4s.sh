#!/usr/bin/env bash
# Stage 4S / VDCC one-command reproduce (4S spec §14). Verify-only for Lane B:
# the committed ceremony capture is re-verified, never regenerated (Lane B uses
# ephemeral keys, so it is not byte-stable). Lane A corpus + attestation are
# deterministic pure functions of the committed fixture keys, rebuilt and
# byte-compared. No network, no wall clock. Motto: AnthropicSafe First, then
# ReviewerSafe.
set -euo pipefail
export TZ=UTC LC_ALL=C LANG=C SOURCE_DATE_EPOCH=0 PYTHONHASHSEED=0
export PATH="/opt/homebrew/opt/node@26/bin:$PATH"

RAW=0
EVID="docs/research/llm-shield/evidence/stage-4s"
S4S="tools/simurgh-attestation/stage4s"
EXIT_WRAPPER='import("./tools/simurgh-attestation/stage4h/exitCodes.mjs").then(m => process.exit(m.stage4CodeForRawCode(Number(process.argv[1]))))'
exit_via_wrapper() { node -e "$EXIT_WRAPPER" "$1"; }
run_step() {
  local raw="$1"
  shift
  if ! "$@"; then
    RAW="$raw"
    echo "[stage4s] step failed -> raw $RAW" >&2
    exit_via_wrapper "$RAW"
  fi
}

echo "[stage4s] [1/9] env + node major >= 26"
run_step 100 node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 26 ? 0 : 1)'

echo "[stage4s] [2/9] unit suites (explicit globs)"
run_step 100 node --test \
  tests/unit/llmShield/stage4s/exitCodes.test.js \
  tests/unit/llmShield/stage4s/constants.test.js \
  tests/unit/llmShield/stage4s/scopeLattice.test.js \
  tests/unit/llmShield/stage4s/treeCore.test.js \
  tests/unit/llmShield/stage4s/fanoutCore.test.js \
  tests/unit/llmShield/stage4s/fluxCore.test.js \
  tests/unit/llmShield/stage4s/receiptBuilder.test.js \
  tests/unit/llmShield/stage4s/chainCore.test.js \
  tests/unit/llmShield/stage4s/fixturesCorpus.test.js \
  tests/unit/llmShield/stage4s/parity.test.js \
  tests/unit/llmShield/stage4s/attestation.test.js

echo "[stage4s] [3/9] rebuild Lane A corpus -> byte-stable"
run_step 100 node "$S4S/node/build-stage4s-fixtures.mjs"
run_step 100 git diff --exit-code -- "$EVID/fixtures"

echo "[stage4s] [4/9] rebuild attestation -> byte-stable"
run_step 101 node "$S4S/node/build-stage4s-attestation.mjs"
run_step 101 git diff --exit-code -- "$EVID/attestation/stage4s-attestation.json"

echo "[stage4s] [5/9] offline verify -- public tier (structural + signature)"
run_step 101 node "$S4S/node/verify-stage4s-attestation.mjs" --tier public

echo "[stage4s] [6/9] offline verify -- audit tier (engine re-run per fixture)"
run_step 118 node "$S4S/node/verify-stage4s-attestation.mjs" --tier audit

echo "[stage4s] [7/9] VERIFY committed Lane B capture (never regenerate) + run 2-process hop"
run_step 111 node -e '
import("./tools/simurgh-attestation/stage4s/core/chainCore.mjs").then(({ evaluateChainSafe }) => {
  const fs = require("node:fs");
  const c = JSON.parse(fs.readFileSync("docs/research/llm-shield/evidence/stage-4s/laneb/laneb-capture.json", "utf8"));
  const clean = evaluateChainSafe(c.bundle).raw;
  const tampered = evaluateChainSafe({ ...c.bundle, epoch: "win-1999-01-01" }).raw;
  process.exit(clean === 0 && tampered === 114 ? 0 : 1);
});'
run_step 111 node --test tests/e2e/llmShield/stage4s/laneb.test.js

echo "[stage4s] [8/9] JS<->Python parity + kernel differential-equivalence + Lean 6"
run_step 100 node --test tests/unit/llmShield/stage4s/parity.test.js
run_step 100 bash -c 'cd tools/agentdojo-simurgh-adapter && python3 -m pytest tests/test_vdcc_surface.py -q'
# Lean is verified by the dedicated stage-4-lean-proofs CI job (which installs the
# toolchain). Only build it here if `lean` is on PATH, so the offline quality gate
# — which has no Lean toolchain — does not fail on a missing binary.
if command -v lean >/dev/null 2>&1; then
  run_step 100 bash -c 'cd proofs/stage4s && lean NoGhostHop.lean'
else
  echo "[stage4s] lean not on PATH — skipping proof build (covered by the lean-check CI job)"
fi

echo "[stage4s] [9/9] scans: key audits + prettier"
run_step 101 bash scripts/security-audit-llm-shield-stage3m.sh
run_step 101 bash scripts/security-audit-llm-shield-stage3o.sh
run_step 100 npx prettier --check \
  "$S4S/**/*.mjs" \
  "tests/unit/llmShield/stage4s/*.test.js" \
  "tests/e2e/llmShield/stage4s/*.test.js"

echo "[stage4s] reproduce OK (raw $RAW)"
exit_via_wrapper "$RAW"
