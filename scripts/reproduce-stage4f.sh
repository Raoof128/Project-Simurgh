#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export SIMURGH_STAGE4F_OFFLINE=1
export NO_NETWORK=1
export PYTHONHASHSEED=0

EV="docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto"
PRIVATE_KEY="$ROOT/tools/simurgh-attestation/stage4d/fixtures/keys/stage4d-test-private.pem"
FIXTURE_ROOT="$ROOT/docs/research/llm-shield/evidence/stage-3f/fixtures"
TMP_DIR="${SIMURGH_STAGE4F_TMPDIR:-$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage4f.XXXXXX")}"

cleanup() {
  if [[ "${SIMURGH_STAGE4F_KEEP_TMP:-0}" != "1" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

env_fail() {
  echo "Stage 4F environment/setup error: $*" >&2
  exit 2
}

golden_fail() {
  echo "Stage 4F golden mismatch: $*" >&2
  exit 3
}

require_file() {
  [[ -f "$1" ]] || env_fail "missing required file: $1"
}

compare_trees() {
  local a="$1"
  local b="$2"
  if ! diff -u <(cd "$a" && find . -type f | sort) <(cd "$b" && find . -type f | sort); then
    golden_fail "generated file sets differ: $a != $b"
  fi
  while IFS= read -r -d '' file; do
    rel="${file#"$a/"}"
    cmp "$file" "$b/$rel" || golden_fail "$rel differs"
  done < <(find "$a" -type f -print0 | sort -z)
}

run_lane() {
  local suite_id="$1"
  local out="$2"
  node tools/simurgh-attestation/stage4f/build-stage4f-demo.mjs \
    --suite-id "$suite_id" \
    --fixture-root "$FIXTURE_ROOT" \
    --private-key "$PRIVATE_KEY" \
    --out-dir "$out"
}

require_file "$PRIVATE_KEY"
[[ -d "$FIXTURE_ROOT" ]] || env_fail "missing fixture root: $FIXTURE_ROOT"
[[ -d "$EV/canary" ]] || env_fail "missing committed Stage 4F canary evidence: $EV/canary"

echo "Stage 4F Containment-Utility Pareto: start"
echo "Stage 4F offline mode: network/model/provider/live API access disabled"

run_lane suite_canary_v1 "$TMP_DIR/canary-a"
run_lane suite_canary_v1 "$TMP_DIR/canary-b"
compare_trees "$TMP_DIR/canary-a" "$TMP_DIR/canary-b"
compare_trees "$TMP_DIR/canary-a" "$EV/canary"

if [[ "${SIMURGH_RUN_STAGE4F_FULL:-0}" == "1" ]]; then
  [[ -d "$EV/full-suite/clean" ]] || env_fail "full-suite committed artifacts are missing; run Task 8b before release gating"
  run_lane suite_full_v1 "$TMP_DIR/full-a"
  run_lane suite_full_v1 "$TMP_DIR/full-b"
  compare_trees "$TMP_DIR/full-a" "$TMP_DIR/full-b"
  compare_trees "$TMP_DIR/full-a" "$EV/full-suite"
fi

node --test tests/unit/llmShield/stage4f/*.test.js
echo "Stage 4F arm A honest sweep verify: GREEN"
echo "Stage 4F arm B signed lying-decision cell: RED"
echo "Stage 4F arm C dropped scenario: RED"
echo "Stage 4F arm D aggregate byte tamper: RED"
echo "Stage 4F repeated recorded-fixture byte stability: PASS"
echo "Stage 4F committed golden byte stability: PASS"
echo "Stage 4F Containment-Utility Pareto: PASS"
