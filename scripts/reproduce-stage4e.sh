#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EV="docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run"
BENIGN_FIXTURE="$ROOT/tools/agentdojo-simurgh-adapter/stage4e/fixtures/browser_inject_01_benign.json"
ATTACK_FIXTURE="$ROOT/tools/agentdojo-simurgh-adapter/stage4e/fixtures/browser_inject_01_attack.json"
PRIVATE_KEY="$ROOT/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
TMP_DIR="${SIMURGH_STAGE4E_TMPDIR:-$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage4e.XXXXXX")}"
BENIGN_RUN="$TMP_DIR/benign-run-record.json"
ATTACK_RUN="$TMP_DIR/attack-run-record.json"
OUT_DIR="$TMP_DIR/evidence"

cleanup() {
  if [[ "${SIMURGH_STAGE4E_KEEP_TMP:-0}" != "1" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

env_fail() {
  echo "Stage 4E environment/setup error: $*" >&2
  exit 2
}

golden_cmp() {
  local expected="$1"
  local actual="$2"
  if ! cmp "$expected" "$actual"; then
    echo "Stage 4E golden mismatch: $expected != $actual" >&2
    exit 3
  fi
}

require_file() {
  [[ -f "$1" ]] || env_fail "missing required file: $1"
}

export SIMURGH_4D_PRIVATE_KEY_PATH="$PRIVATE_KEY"
export SIMURGH_STAGE4E_OFFLINE=1
export NO_NETWORK=1

require_file "$BENIGN_FIXTURE"
require_file "$ATTACK_FIXTURE"
require_file "$PRIVATE_KEY"
[[ -d "$EV" ]] || env_fail "missing committed Stage 4E evidence directory: $EV"

echo "Stage 4E Browser-Agent Containment Run: start"
echo "Stage 4E offline mode: network/model/provider/live API access disabled"

mkdir -p "$TMP_DIR"
(
  cd tools/agentdojo-simurgh-adapter
  python -m stage4d.run_fixture --fixture "$BENIGN_FIXTURE" --out "$BENIGN_RUN"
  python -m stage4d.run_fixture --fixture "$ATTACK_FIXTURE" --out "$ATTACK_RUN"
)

node tools/simurgh-attestation/stage4e/build-stage4e-demo.mjs \
  --benign-run "$BENIGN_RUN" \
  --attack-run "$ATTACK_RUN" \
  --out-dir "$OUT_DIR"

node --test tests/unit/llmShield/stage4e/demo.test.js

node -e "const fs=require('node:fs'); const closeout=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (closeout.ok !== true) process.exit(1);" "$OUT_DIR/stage4e-closeout.json"

while IFS= read -r -d '' generated; do
  rel="${generated#"$OUT_DIR/"}"
  golden_cmp "$EV/$rel" "$generated"
done < <(find "$OUT_DIR" -type f -print0 | sort -z)

echo "Stage 4E arm A honest attack verify: GREEN"
echo "Stage 4E arm B1 lying decision record: RED"
echo "Stage 4E arm C observed-but-unreceipted: RED"
echo "Stage 4E arm D byte tamper: RED"
echo "Stage 4E committed golden byte stability: PASS"
echo "Stage 4E Browser-Agent Containment Run: PASS"
