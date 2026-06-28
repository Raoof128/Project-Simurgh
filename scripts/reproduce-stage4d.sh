#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EV="docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack"
FIXTURE="tools/agentdojo-simurgh-adapter/stage4d/fixtures/browser_inject_01.json"
PRIVATE_KEY="$ROOT/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
TMP_DIR="${SIMURGH_STAGE4D_TMPDIR:-$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage4d.XXXXXX")}"
RUN_RECORD="$TMP_DIR/run-record.json"
PACK="$TMP_DIR/evidence-pack.json"
SIG="$TMP_DIR/evidence-pack.sig"
VERIFY_RESULTS="$TMP_DIR/verify-results.json"

cleanup() {
  if [[ "${SIMURGH_STAGE4D_KEEP_TMP:-0}" != "1" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

golden_cmp() {
  local expected="$1"
  local actual="$2"
  if ! cmp "$expected" "$actual"; then
    echo "Stage 4D golden mismatch: $expected != $actual" >&2
    exit 3
  fi
}

export SIMURGH_4D_PRIVATE_KEY_PATH="$PRIVATE_KEY"
export SIMURGH_STAGE4D_OFFLINE=1
export NO_NETWORK=1

echo "Stage 4D Decision-Replay Evidence Pack: start"
echo "Stage 4D offline mode: network/model/provider/live API access disabled"

(
  cd tools/agentdojo-simurgh-adapter
  python -m pytest \
    tests/test_stage4d_policy.py \
    tests/test_stage4d_mediator.py \
    tests/test_stage4d_dispatch_controller.py \
    -q
)

node --test \
  tests/unit/llmShield/stage4d/cli.test.js \
  tests/unit/llmShield/stage4d/crypto.test.js \
  tests/unit/llmShield/stage4d/receipt.test.js \
  tests/unit/llmShield/stage4d/pack.test.js \
  tests/unit/llmShield/stage4d/privacy.test.js \
  tests/unit/llmShield/stage4d/verify.test.js \
  tests/unit/llmShield/stage4d/python-node-parity.test.js

mkdir -p "$TMP_DIR"
(
  cd tools/agentdojo-simurgh-adapter
  python -m stage4d.run_fixture \
    --fixture "$ROOT/$FIXTURE" \
    --out "$RUN_RECORD"
)

node tools/simurgh-attestation/stage4d/build-stage4d-pack.mjs \
  --run-record "$RUN_RECORD" \
  --out "$PACK" \
  --sig "$SIG"

node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  "$PACK" \
  --sig "$SIG" \
  --pubkey "$TMP_DIR/signer.pub" \
  --results "$VERIFY_RESULTS"

golden_cmp "$EV/evidence-pack.json" "$PACK"
golden_cmp "$EV/evidence-pack.sig" "$SIG"
golden_cmp "$EV/signer.pub" "$TMP_DIR/signer.pub"
golden_cmp "$EV/run-manifest.json" "$TMP_DIR/run-manifest.json"
golden_cmp "$EV/completeness-manifest.json" "$TMP_DIR/completeness-manifest.json"
golden_cmp "$EV/non-claims.json" "$TMP_DIR/non-claims.json"

node -e "const fs=require('node:fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (r.ok !== true || r.exit_code !== 0) process.exit(1);" "$VERIFY_RESULTS"

echo "Stage 4D fixture run: PASS"
echo "Stage 4D offline verification: PASS"
echo "Stage 4D committed golden byte stability: PASS"
echo "Stage 4D Decision-Replay Evidence Pack: PASS"
