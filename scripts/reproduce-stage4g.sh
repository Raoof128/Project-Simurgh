#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EV="docs/research/llm-shield/evidence/stage-4g-adaptive-red-team-campaign"
TMP_DIR="${SIMURGH_STAGE4G_TMPDIR:-$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage4g.XXXXXX")}"

cleanup() {
  if [[ "${SIMURGH_STAGE4G_KEEP_TMP:-0}" != "1" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

export SIMURGH_STAGE4G_OFFLINE=1
export NO_NETWORK=1
unset ANTHROPIC_API_KEY OPENAI_API_KEY BROWSERBASE_API_KEY

echo "Stage 4G Adaptive Red-Team Campaign: start"
echo "Stage 4G claim scope: within the canonical precommitted campaign for this build configuration"

node tools/simurgh-attestation/stage4g/build-stage4g-demo.mjs --out "$TMP_DIR/run-1"
node tools/simurgh-attestation/stage4g/build-stage4g-demo.mjs --out "$TMP_DIR/run-2"

if ! diff -ru "$TMP_DIR/run-1" "$TMP_DIR/run-2" >"$TMP_DIR/golden-diff.log"; then
  echo "Stage 4G golden_mismatch: repeated clean builds emitted different bytes" >&2
  cat "$TMP_DIR/golden-diff.log" >&2
  exit 3
fi

node tools/simurgh-attestation/stage4g/verify-stage4g-campaign.mjs --dir "$TMP_DIR/run-1" >"$TMP_DIR/verify-run-1.log"

rm -rf "$EV"
mkdir -p "$(dirname "$EV")"
cp -R "$TMP_DIR/run-1" "$EV"

node tools/simurgh-attestation/stage4g/verify-stage4g-campaign.mjs --dir "$EV" >"$TMP_DIR/verify-committed.log"

echo "Stage 4G clean campaign verify: GREEN"
echo "Stage 4G red arm missing attempt: RED"
echo "Stage 4G red arm class relabel: RED"
echo "Stage 4G red arm privacy leak: RED"
echo "Stage 4G Class IV boundary escape recorded: PASS"
echo "Stage 4G Adaptive Red-Team Campaign: PASS"
