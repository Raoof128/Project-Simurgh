#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAGE_DIRS=(
  "docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack"
  "docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run"
  "docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto"
)

TMP_DIR="${SIMURGH_STAGE4D_TO_4F_TMPDIR:-$(mktemp -d "${TMPDIR:-/tmp}/simurgh-stage4d-to-4f.XXXXXX")}"
BEFORE="$TMP_DIR/stage-artifacts-before.sha256"
AFTER="$TMP_DIR/stage-artifacts-after.sha256"
LOG_DIR="$TMP_DIR/logs"
INTEGRATION_DIR="docs/research/llm-shield/evidence/stage-4d-to-4f-integration"

cleanup() {
  if [[ "${SIMURGH_STAGE4D_TO_4F_KEEP_TMP:-0}" != "1" ]]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

snapshot_stage_artifacts() {
  find "${STAGE_DIRS[@]}" -type f -print0 | sort -z | xargs -0 shasum -a 256
}

run_offline() {
  env -u OPENAI_API_KEY \
    -u ANTHROPIC_API_KEY \
    -u AZURE_OPENAI_API_KEY \
    -u GOOGLE_API_KEY \
    -u PLAYWRIGHT_BROWSERS_PATH \
    -u PUPPETEER_EXECUTABLE_PATH \
    NO_NETWORK=1 \
    PYTHONHASHSEED=0 \
    TZ=UTC \
    LC_ALL=C \
    LANG=C \
    SOURCE_DATE_EPOCH=0 \
    SIMURGH_STAGE4D_TO_4F_OFFLINE=1 \
    "$@"
}

record_command() {
  local label="$1"
  shift
  local log="$LOG_DIR/${label}.log"
  mkdir -p "$LOG_DIR"
  set +e
  run_offline "$@" > "$log" 2>&1
  local code=$?
  set -e
  local hash
  hash="$(shasum -a 256 "$log" | awk '{print $1}')"
  printf '{"label":"%s","command":"%s","exit_code":%s,"expected_green":true,"log_hash":"sha256:%s","log_name":"%s.log"}\n' \
    "$label" "$*" "$code" "$hash" "$label" >> "$TMP_DIR/stage-command-results.jsonl"
  return "$code"
}

echo "Stage 4D-4F Integrated Verification Gate: start"
echo "Stage 4D-4F offline mode: network/model/provider/browser/live API access disabled"

snapshot_stage_artifacts > "$BEFORE"

record_command stage4d_reproduce scripts/reproduce-stage4d.sh
record_command stage4e_reproduce scripts/reproduce-stage4e.sh
record_command stage4f_canary_reproduce scripts/reproduce-stage4f.sh

if [[ "${SIMURGH_RUN_STAGE4F_FULL:-0}" == "1" ]]; then
  record_command stage4f_full_suite_reproduce scripts/reproduce-stage4f.sh
  FULL_ARG="--full-suite-ran"
else
  FULL_ARG=""
fi

mkdir -p "$INTEGRATION_DIR/wrong-key"
node -e "const fs=require('node:fs'); const rows=fs.readFileSync(process.argv[1],'utf8').trim().split(/\n+/).filter(Boolean).map(JSON.parse); fs.writeFileSync(process.argv[2], JSON.stringify(rows,null,2)+'\n');" \
  "$TMP_DIR/stage-command-results.jsonl" "$INTEGRATION_DIR/stage-command-results.input.json"
node -e "const {generateKeyPairSync}=require('node:crypto'); const fs=require('node:fs'); const {publicKey}=generateKeyPairSync('ed25519'); fs.writeFileSync(process.argv[1], publicKey.export({type:'spki',format:'pem'}));" \
  "$TMP_DIR/wrong-signer.pub"

node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.json \
  --sig docs/research/llm-shield/evidence/stage-4d-decision-replay-evidence-pack/evidence-pack.sig \
  --pubkey "$TMP_DIR/wrong-signer.pub" \
  --results "$INTEGRATION_DIR/wrong-key/stage4d-pack-verify-results.json" || true

node tools/simurgh-attestation/stage4d/verify-stage4d-pack.mjs \
  docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/evidence-pack.json \
  --sig docs/research/llm-shield/evidence/stage-4e-browser-agent-containment-run/evidence-pack.sig \
  --pubkey "$TMP_DIR/wrong-signer.pub" \
  --results "$INTEGRATION_DIR/wrong-key/stage4e-pack-verify-results.json" || true

node tools/simurgh-attestation/stage4f/verify-stage4f-frontier.mjs \
  --evidence-dir docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/clean \
  --suite docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/clean/suite-manifest.json \
  --grid docs/research/llm-shield/evidence/stage-4f-containment-utility-pareto/canary/clean/grid.json \
  --pubkey "$TMP_DIR/wrong-signer.pub" \
  --out "$INTEGRATION_DIR/wrong-key/stage4f-frontier-verify-results.json" || true

node tools/simurgh-attestation/stage4d-to-4f/build-integration-report.mjs ${FULL_ARG}

snapshot_stage_artifacts > "$AFTER"
if ! cmp "$BEFORE" "$AFTER"; then
  echo "stage_artifact_mutation_attempted" >&2
  exit 1
fi

node -e "const fs=require('node:fs'); const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (r.ok !== true) process.exit(1);" \
  docs/research/llm-shield/evidence/stage-4d-to-4f-integration/release-readiness-report.json

echo "Stage 4D-4F integration oracle: PASS"
echo "Stage 4D-4F stable artifact audit: PASS"
echo "Stage 4D-4F Integrated Verification Gate: PASS"
